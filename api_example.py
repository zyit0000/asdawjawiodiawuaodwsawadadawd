import requests
import json
import sys
import argparse

# LinkDirect API Client
# This script shows how to use the LinkDirect bypass API from Python.
# You can use this in a Discord bot, CLI tool, or any other Python app.

# REPLACE THIS with your actual app URL from the AIS Build environment
# Example: https://ais-dev-5tgmxi4mlx3uiz63ywdihu-340262262011.us-west2.run.app
DEFAULT_API_URL = "https://ais-dev-5tgmxi4mlx3uiz63ywdihu-340262262011.us-west2.run.app"

def bypass_link(target_url, api_base_url):
    """
    Calls the LinkDirect API to bypass a link.
    """
    print(f"[*] Requesting bypass for: {target_url}")
    
    # Ensure the URL ends with /api/bypass
    api_url = api_base_url.rstrip('/')
    if not api_url.endswith('/api/bypass'):
        api_url += '/api/bypass'
        
    payload = {"url": target_url}
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(api_url, json=payload, headers=headers, timeout=30)
        response.raise_for_status() # Raise error for bad status codes
        
        data = response.json()
        if data.get("destination"):
            return data.get("destination")
        else:
            return f"Error: {data.get('error', 'Unknown error')}"
            
    except requests.exceptions.RequestException as e:
        return f"Network Error: {str(e)}"

def main():
    parser = argparse.ArgumentParser(description="LinkDirect API Client")
    parser.add_argument("url", help="The link to bypass (Linkvertise, LootLabs, etc.)")
    parser.add_argument("--api", default=DEFAULT_API_URL, help="The LinkDirect backend API URL")
    
    args = parser.parse_args()
    
    result = bypass_link(args.url, args.api)
    
    print("\n" + "="*50)
    print(f"BYPASSED LINK: {result}")
    print("="*50)

if __name__ == "__main__":
    main()
