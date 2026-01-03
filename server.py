import os
import asyncio
from typing import List
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from google import genai
from google.genai import types
import nest_asyncio

# Required for environments where an event loop is already running
nest_asyncio.apply()

app = FastAPI(title="PriceScout AI Backend")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

## Search Constraints
- Brands to look for: {brands}
- Product: {product_name}

## Output Format
You must respond ONLY with a JSON object containing two keys: `comparison_table` (an array of product objects) and `top_recommendation` (a string explaining why the winner was chosen).
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

async def crawl_site(site: str, product_name: str, crawler: AsyncWebCrawler):
    """Crawls a site and returns the markdown content."""
    url = get_search_url(site, product_name)
    print(f"Searching: {url}")
    
    config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        word_count_threshold=10,
        exclude_external_links=True,
        # Wait for content to load (some sites are SPA)
        wait_for="body",
        page_timeout=30000,
    )
    
    try:
        result = await crawler.arun(url=url, config=config)
        if result.success:
            # Basic cleaning: remove long navigation blocks or scripts if they survived to markdown
            content = result.markdown_v2.raw_markdown
            return f"--- SOURCE: {url} ---\n{content}\n"
        else:
            print(f"Crawl failed for {url}: {result.error_message}")
    except Exception as e:
        print(f"Error crawling {url}: {e}")
    return ""

@app.post("/analyze", response_model=AnalysisResult)
async def analyze_products(params: SearchParams, x_api_key: str = Header(None)):
    if not x_api_key:
        raise HTTPException(status_code=400, detail="X-API-KEY header is required")

    client = genai.Client(api_key=x_api_key)
    
    # More "human-like" browser config
    browser_config = BrowserConfig(
        headless=True,
        extra_args=["--disable-blink-features=AutomationControlled"],
    )
    
    all_markdown = ""
    async with AsyncWebCrawler(config=browser_config) as crawler:
        # Crawl all websites in parallel
        tasks = [crawl_site(site, params.productName, crawler) for site in params.websites]
        results = await asyncio.gather(*tasks)
        all_markdown = "\n".join([r for r in results if r])

    if not all_markdown.strip():
        raise HTTPException(status_code=500, detail="Failed to extract content from any target websites.")

    prompt = f"{SYSTEM_PROMPT.format(brands=', '.join(params.brands), product_name=params.productName)}\n\nRAW DATA:\n{all_markdown}"

    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        
        # Parse the response
        import json
        analysis = json.loads(response.text)
        return analysis
    except Exception as e:
        print(f"Gemini Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)