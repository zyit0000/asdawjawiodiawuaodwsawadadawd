import requests
import re
import time
import random
import json
from urllib.parse import urlparse, unquote

# Educational Tool: URL Redirect & Metadata Analyzer
# This script demonstrates how to follow HTTP redirect chains and extract 
# destination URLs from HTML metadata, common in link shortening services.

class LinkBypasser:
    def __init__(self, proxy=None):
        self.session = requests.Session()
        if proxy:
            self.session.proxies = {'http': proxy, 'https': proxy}
        
        # Common User-Agents for rotation to avoid basic bot detection
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
        ]

    def get_headers(self, referer=None):
        headers = {
            'User-Agent': random.choice(self.user_agents),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
        }
        if referer:
            headers['Referer'] = referer
        return headers

    def extract_url_from_html(self, html):
        """
        Scans HTML for common patterns used to hide destination URLs.
        """
        # 1. Look for standard meta refreshes
        meta_match = re.search(r'content=["\']\d+;\s*url=(https?://.*?)["\']', html, re.I)
        if meta_match: return meta_match.group(1)

        # 2. Look for window.location or location.replace
        loc_match = re.search(r'location\.(?:replace|href)\s*\(\s*["\'](https?://.*?)["\']\s*\)', html, re.I)
        if loc_match: return loc_match.group(1)

        # 3. Look for base64 encoded URLs (Common in Linkvertise-like scripts)
        # This matches strings that look like base64 and start with 'aHR0cD' (http)
        b64_matches = re.findall(r'["\'](aHR0c[a-zA-Z0-9+/]+={0,2})["\']', html)
        for b64 in b64_matches:
            try:
                import base64
                decoded = base64.b64decode(b64).decode('utf-8')
                if decoded.startswith('http'): return decoded
            except: continue

        return None

    def bypass(self, url):
        print(f"[*] Starting bypass for: {url}")
        current_url = url
        visited = {url}
        
        try:
            for i in range(10): # Max 10 hops
                print(f"[Step {i+1}] Requesting: {current_url}")
                
                # We use stream=True to handle large pages and check headers first
                response = self.session.get(
                    current_url, 
                    headers=self.get_headers(referer=url),
                    timeout=15,
                    allow_redirects=True
                )
                
                # Check if we landed on a non-ad domain
                final_url = response.url
                if not any(x in final_url.lower() for x in ['linkvertise', 'loot-link', 'lootdest', 'work.ink', 'boost.ink']):
                    return final_url

                # If still on an ad domain, scan the HTML
                extracted = self.extract_url_from_html(response.text)
                if extracted and extracted not in visited:
                    current_url = extracted
                    visited.add(extracted)
                    continue
                
                # Special handling for Linkvertise /go/ paths
                if "/go/" in final_url:
                    # These often redirect via headers
                    pass 

                # If no progress, wait a bit (simulates human delay) and retry
                time.sleep(1)
                
            return "Bypass failed: Max depth reached or link highly protected."

        except Exception as e:
            return f"Error during bypass: {str(e)}"

# --- Example Usage ---
if __name__ == "__main__":
    # Example Linkvertise URL (Replace with your link)
    test_url = "https://linkvertise.com/376871/example-link"
    
    # Initialize with optional proxy support
    # bypasser = LinkBypasser(proxy="http://user:pass@host:port")
    bypasser = LinkBypasser()
    
    result = bypasser.bypass(test_url)
    print("\n" + "="*50)
    print(f"FINAL DESTINATION: {result}")
    print("="*50)
