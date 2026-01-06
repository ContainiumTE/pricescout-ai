import os
import asyncio
import logging
from typing import List
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from google import genai
from google.genai import types
from bs4 import BeautifulSoup
import json
import nest_asyncio
from supabase import create_client, Client

# Required for environments where an event loop is already running
nest_asyncio.apply()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PriceScout AI Backend")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase Client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = None

if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        logger.info("✅ Supabase client initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Supabase: {str(e)}")

# --- MEMORY OPTIMIZATION: Global Semaphore ---
# Limits concurrent browser instances to 1.
# This queues users if they hit the app simultaneously, preventing 502 crashes on Render.
scraping_semaphore = asyncio.Semaphore(1)

import httpx

class SearchParams(BaseModel):
    productName: str
    brands: List[str]
    websites: List[str]

class ComparisonItem(BaseModel):
    website: str
    brand: str
    product: str
    original_price: str
    sale_price: str
    extra_discounts: str
    product_url: str
    comment: str

class AnalysisResult(BaseModel):
    comparison_table: List[ComparisonItem]
    top_recommendation: str

SYSTEM_PROMPT = """
You are a "Global E-Commerce Price Architect." Your goal is to take raw Markdown data from multiple websites and transform it into a high-converting, accurate price comparison table.

## Operational Logic
1.  **Extraction:** Identify the exact Product Name, Brand, and Model. Ignore "sponsored" items that don't match the user's brand list.
2.  **Price Analysis:**
    * **Initial Price:** The standard retail price (SRP) or the "crossed-out" price.
    * **Marked Down Price:** The current actual selling price.
    * **Hidden Value:** Identify coupons, "Subscribe & Save," or bundle discounts mentioned in the text.
3.  **Verification:** You must extract the EXACT product detail page URL found in the text. DO NOT truncate or guess the URL.
4.  **Recommendation:** Based on the 'Effective Price' (Price - Discounts), identify the single best value option.
5.  **Fallback (Crucial):** If the RAW DATA indicates a site is blocked (e.g. "Amazon 503"), **YOU MUST** use your Google Search tool to find the current price and status for that product on that specific website. Do not return "N/A" if you can find it via search.

## Search Constraints
- Brands to look for: {brands}
- Product: {product_name}

## Output Format
You must respond ONLY with a valid JSON object matching this schema:
{{
  "comparison_table": [
    {{
      "website": "string (e.g., 'Amazon')",
      "brand": "string",
      "product": "string (Product Name)",
      "original_price": "string (e.g., 'R 250.00')",
      "sale_price": "string (e.g., 'R 199.00')",
      "extra_discounts": "string (e.g., 'Buy 2 for R300' or 'None')",
      "product_url": "string (The extracted URL)",
      "comment": "string (Brief validation note)"
    }}
  ],
  "top_recommendation": "string (Reasoning for the best choice)"
}}
"""

# Common search URL patterns for target websites
SEARCH_MAP = {
    "amazon.co.za": "https://www.amazon.co.za/s?k={query}",
    "amazon.com": "https://www.amazon.com/s?k={query}",
    "takealot.com": "https://www.takealot.com/all?q={query}",
    "makro.co.za": "https://www.makro.co.za/search/?text={query}",
    "clicks.co.za": "https://www.clicks.co.za/search?text={query}",
    "dischem.co.za": "https://www.dischem.co.za/catalogsearch/result/?q={query}",
    "pnp.co.za": "https://www.pnp.co.za/pnpstorefront/pnp/en/search/?text={query}",
    "game.co.za": "https://www.game.co.za/search/?text={query}",
    "checkers.co.za": "https://www.checkers.co.za/search?q={query}",
}

def get_search_url(domain: str, product_name: str) -> str:
    """Constructs a search URL for a given domain and product."""
    from urllib.parse import quote
    query = quote(product_name)
    clean_domain = domain.lower().replace("https://", "").replace("http://", "").split('/')[0].strip()
    
    base_url = SEARCH_MAP.get(clean_domain)
    if base_url:
        return base_url.format(query=query)
    
    # Generic fallback
    if "http" in domain:
        return f"{domain}/search?q={query}"
    return f"https://{clean_domain}/search?q={query}"

def extract_content_from_html(html_content: str, url: str) -> str:
    """Extracts relevant content from HTML, using specialized strategies."""
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Strategy 1: Look for Next.js hydration data (Takealot uses this)
        next_data = soup.find('script', id='__NEXT_DATA__')
        if next_data:
            logger.info("🎉 Found Next.js hydration data! Extracting JSON...")
            return f"--- SOURCE (Next.js Data): {url} ---\n{next_data.string}\n"
        
        # Strategy 1.5: Regex fallback for Next.js data (in case BS4 fails)
        import re
        next_data_regex = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.+?)</script>', html_content)
        if next_data_regex:
                logger.info("🎉 Found Next.js hydration data (via Regex)! Extracting JSON...")
                return f"--- SOURCE (Next.js Data): {url} ---\n{next_data_regex.group(1)}\n"
        
        # Strategy 2: Check for Service Unavailable (Amazon)
        title = soup.title.string if soup.title else ""
        if "503" in title or "Service Unavailable" in title:
                logger.warning("⚠️ Amazon 503 Block detected")
                return f"--- SOURCE (BLOCKED): {url} ---\nERROR: Amazon blocked the request (503 Service Unavailable).\n"

        # Strategy 3: Standard Text Extraction
        body_content = soup.body.get_text(separator=' ', strip=True) if soup.body else ""
        
        # Truncate content if too massive to prevent token overflow, but kept generous
        if len(body_content) > 50000:
            body_content = body_content[:50000] + "... (truncated)"
        
        logger.info(f"📄 Extracted content length via HTML parsing: {len(body_content)}")
        return f"--- SOURCE: {url} ---\n{body_content}\n"

    except Exception as parse_error:
        logger.error(f"⚠️ Parsing error: {parse_error}")
        return f"--- SOURCE: {url} ---\n{html_content[:50000]}\n"

async def lightweight_fetch(url: str) -> str | None:
    """Attempts to fetch URL using httpx (lightweight) before trying browser."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    
    # Sites known to work well with static fetch (Takealot uses Next.js hydration)
    # Amazon often blocks simple requests, so we might want to skip it here to save time,
    # but a quick check doesn't hurt.
    
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                # Check if it looks valid
                if "takealot" in url and "__NEXT_DATA__" in response.text:
                   logger.info(f"⚡ Lightweight fetch SUCCESS for {url}")
                   return extract_content_from_html(response.text, url)
                
                # For other sites, if we get a good 200 OK with substantial content, use it.
                # However, many SPAs return empty shells.
                # Heuristic: If content length > 5KB, might be useful. 
                if len(response.text) > 5000:
                    logger.info(f"⚡ Lightweight fetch succeeded (generic) for {url}")
                    return extract_content_from_html(response.text, url)

    except Exception as e:
        logger.warning(f"⚠️ Lightweight fetch failed for {url}: {e}")
    
    return None

async def crawl_site(site: str, product_name: str, crawler: AsyncWebCrawler):
    """Crawls a site and returns the markdown content using Browser."""
    url = get_search_url(site, product_name)
    logger.info(f"🔍 Searching (Browser): {url}")

    config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        exclude_external_links=True,
        wait_for="body",
        page_timeout=60000,
        delay_before_return_html=3.0,
        simulate_user=True,
        override_navigator=True,
    )
    
    try:
        logger.info(f"⏳ Starting browser crawl for {url}...")
        result = await crawler.arun(url=url, config=config)
        if result.success:
            # Use HTML content for better extraction
            content = result.html if result.html else result.markdown.raw_markdown
            content_length = len(content)
            logger.info(f"✅ Successfully crawled {url}, got {content_length} characters")
            return extract_content_from_html(content, url)
        else:
            logger.error(f"❌ Crawl failed for {url}: {result.error_message}")
    except Exception as e:
        logger.error(f"💥 Exception while crawling {url}: {str(e)}", exc_info=True)
    return ""

def robust_json_extract(text: str):
    """Extracts valid JSON from text, handling markdown blocks and preambles."""
    import json
    import re
    
    # 1. Try finding content between ```json and ```
    json_blocks = re.findall(r"```json\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
    if json_blocks:
        for block in json_blocks:
            try:
                return json.loads(block)
            except json.JSONDecodeError:
                continue

    # 2. Try finding the first '{' and last '}'
    match = re.search(r"(\{.*\})", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # 3. Fallback: simple cleanup
    cleaned = re.sub(r"```json\s*", "", text, flags=re.IGNORECASE)
    cleaned = re.sub(r"```", "", cleaned).strip()
    return json.loads(cleaned)

async def log_search_to_supabase(params: SearchParams):
    """Logs the search request to Supabase for permanent record."""
    if not supabase:
        logger.warning("⚠️ Supabase not configured. Skipping search log.")
        return

    try:
        data = {
            "product_name": params.productName,
            "brands": params.brands,
            "websites": params.websites
        }
        # Insert into 'searches' table
        result = supabase.table("searches").insert(data).execute()
        logger.info(f"💾 Search logged to Supabase: {params.productName}")
    except Exception as e:
        logger.error(f"💥 Failed to log search to Supabase: {str(e)}")

@app.post("/analyze", response_model=AnalysisResult)
async def analyze_products(params: SearchParams, x_api_key: str = Header(None)):
    logger.info(f"📥 Received request for product: {params.productName}, brands: {params.brands}, websites: {params.websites}")
    
    # Log the search permanently to Supabase
    asyncio.create_task(log_search_to_supabase(params))
    
    if not x_api_key:
        logger.error("❌ No API key provided")
        raise HTTPException(status_code=400, detail="X-API-KEY header is required")

    client = genai.Client(api_key=x_api_key)
    
    all_markdown = ""
    sites_needing_browser = []

    # 1. Try Lightweight Fetch first (Fast, Low Memory)
    logger.info("🚀 Starting Lightweight Fetch Phase...")
    for site in params.websites:
        url = get_search_url(site, params.productName)
        fetched_content = await lightweight_fetch(url)
        if fetched_content:
            all_markdown += fetched_content + "\n"
        else:
            sites_needing_browser.append(site)

    # 2. If any sites failed lightweight fetch, use the Browser (Heavy, Semaphored)
    if sites_needing_browser:
        logger.info(f"⚠️ {len(sites_needing_browser)} sites need browser crawling. Entering queue...")
        
        # Acquire semaphore to ensure only one browser instance runs globally
        async with scraping_semaphore:
            logger.info("🔒 Semaphore acquired. Starting Browser Phase...")
            
            # Simple browser config optimized for memory
            browser_config = BrowserConfig(
                headless=True,
                extra_args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage", # Crucial for Docker/Render
                    "--single-process", # Saves memory
                ]
            )
            
            try:
                # Context manager handles browser startup/shutdown
                async with AsyncWebCrawler(config=browser_config) as crawler:
                    logger.info(f"✅ Crawler initialized successfully")
                    for i, site in enumerate(sites_needing_browser, 1):
                        logger.info(f"📍 Processing (Browser) {i}/{len(sites_needing_browser)}: {site}")
                        try:
                            # Re-use the existing logic
                            result = await crawl_site(site, params.productName, crawler)
                            if result:
                                all_markdown += result + "\n"
                        except Exception as e:
                            logger.error(f"💥 Error processing {site}: {str(e)}")
            except Exception as e:
                logger.error(f"💥 Failed to initialize crawler: {str(e)}")
                # Continue if we have at least some content from lightweight fetch
                if not all_markdown:
                     raise HTTPException(status_code=500, detail=f"Crawler initialization failed: {str(e)}")
        
        logger.info("🔓 Semaphore released.")

    if not all_markdown.strip():
        logger.error("❌ No content extracted from any source")
        raise HTTPException(status_code=500, detail="Failed to extract content from target websites.")
    
    prompt = f"{SYSTEM_PROMPT.format(brands=', '.join(params.brands), product_name=params.productName)}\n\nRAW DATA:\n{all_markdown}"

    try:
        response = client.models.generate_content(
            model="models/gemini-flash-latest",
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
            ),
        )
        
        raw_text = response.text
        if not raw_text:
             raise ValueError("AI returned empty response")

        analysis = robust_json_extract(raw_text)
        return analysis
    except Exception as e:
        logger.error(f"💥 AI Analysis failed: {str(e)}. Retrying in JSON mode...")
        try:
            response_retry = client.models.generate_content(
                model="models/gemini-flash-latest",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                ),
            )
            return robust_json_extract(response_retry.text)
        except Exception as retry_error:
             logger.error(f"💥 AI Retry failed: {str(retry_error)}")
             raise HTTPException(status_code=500, detail="AI Analysis failed after retry.")
        # Diagnostic: List available models to find the correct name
        try:
            logger.info("📋 Listing available models for debugging:")
            for m in client.models.list():
                logger.info(f" - {m.name}")
        except Exception as list_err:
            logger.error(f"Failed to list models: {list_err}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)