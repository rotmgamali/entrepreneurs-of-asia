from apify_client import ApifyClient
import os
import json
from dotenv import load_dotenv

load_dotenv()

def run_scraper(search_terms=["b2b companies in Utah"], max_items=50):
    """
    Executes the Apify Google Maps Scraper.
    """
    token = os.getenv("APIFY_API_TOKEN")
    if not token:
        raise ValueError("APIFY_API_TOKEN not found in .env")

    client = ApifyClient(token)
    
    # Pre-defined settings for Google Maps Scraper (actor: compass/crawler-google-places)
    # or drobnikj/crawler-google-places (official one usually used)
    # We'll use 'compass/crawler-google-places' or similar widely used one. 
    # Actually, 'drobnikj/crawler-google-places' is the standard one.
    
    run_input = {
        "searchStringsArray": search_terms,
        "maxCrawledPlacesPerSearch": max_items,
        "language": "en",
        "scrapeSocialMediaProfiles": False,  # DISABLED: was pulling TikTok/IG URLs as emails
        "emailAndContactScrapingMode": "emailsFromWebsite",  # Only scrape real emails from the school website
        "onlyConfirmedEmails": True,  # Confirmed format emails only
        "maxImages": 0, # Save costs
        "maxReviews": 0, # Save costs
    }

    print(f"🕵️  Scraping Google Maps for: {search_terms} using compass/crawler-google-places...")
    
    # User specified 'compass/crawler-google-places'
    run = client.actor("compass/crawler-google-places").call(run_input=run_input)
    
    dataset_items = client.dataset(run["defaultDatasetId"]).list_items().items
    
    print(f"✅ Found {len(dataset_items)} results.")
    return dataset_items

def save_leads(items, filename="leads.json"):
    path = os.path.join(os.getcwd(), 'data', 'leads', filename)
    with open(path, 'w') as f:
        json.dump(items, f, indent=2)
    print(f"💾 Saved raw leads to {path}")
