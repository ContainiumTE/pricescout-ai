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

async def crawl_site(url: str, crawler: AsyncWebCrawler):
    """Crawls a site and returns the markdown content."""
    # We attempt to search for the product on the site. 
    # For simplicity in this version, we assume the user provides a direct URL or domain.
    # If it's just a domain, we'd normally need a search step. 
    # Here we'll try to visit the domain and see what we get, or assume the website list includes search URLs.
    
    config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        word_count_threshold=10,
        exclude_external_links=True,
    )
    
    # Prepend https if missing
    if not url.startswith(("http://", "https://")):
        # If it's a domain like amazon.com, we try to append a search query if we can, 
        # but for now let's just visit the domain or the search URL if provided.
        url = f"https://{url}"
    
    try:
        result = await crawler.arun(url=url, config=config)
        if result.success:
            return f"--- SOURCE: {url} ---\n{result.markdown_v2.raw_markdown}\n"
    except Exception as e:
        print(f"Error crawling {url}: {e}")
    return ""

@app.post("/analyze", response_model=AnalysisResult)
async def analyze_products(params: SearchParams, x_api_key: str = Header(None)):
    if not x_api_key:
        raise HTTPException(status_code=400, detail="X-API-KEY header is required")

    client = genai.Client(api_key=x_api_key)
    
    browser_config = BrowserConfig(headless=True)
    
    all_markdown = ""
    async with AsyncWebCrawler(config=browser_config) as crawler:
        # Crawl all websites in parallel
        tasks = [crawl_site(site, crawler) for site in params.websites]
        results = await asyncio.gather(*tasks)
        all_markdown = "\n".join(results)

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