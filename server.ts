import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import https from "https";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Supported domains for the UI (Curated list of link shorteners)
  const supportedDomains = Array.from(new Set([
    "Linkvertise", "LootLabs", "Work.ink", "Cuty.io", "Boost.ink", "Adfoc.us", 
    "Mboost.me", "Bst.gg", "Booo.st", "Paster.so", "Rekonise.com", "Social-Unlock",
    "Sub2Unlock", "Sub4Unlock", "UnlockNow.net", "V.gd", "Bitly", "TinyURL", "Adf.ly", 
    "Shorte.st", "Cutt.ly", "Rebrandly", "Ouo.io", "Shrinkme.io", "Gplinks.com", 
    "Adbull.me", "Clicksfly.com", "Linkshub.io", "Short.io", "Sniply.io", "T.co",
    "Goo.gl", "Is.gd", "Buff.ly", "Bit.do", "Mcaf.ee", "Su.pr"
  ])).sort();

  app.get("/api/supported", (req, res) => {
    res.json(supportedDomains);
  });

  // Universal Bypass Engine - Built from scratch
  const customBypass = async (targetUrl: string) => {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
      'Mozilla/5.0 (Apple) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Edge/122.0.2365.92',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OPR/108.0.0.0'
    ];
    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
    let currentUrl = targetUrl;
    let visitedUrls = new Set([targetUrl]);
    let depth = 0;
    const maxDepth = 10;

    const decodeBase64 = (str: string) => {
      try {
        // Handle URL-safe base64
        const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = Buffer.from(normalized, 'base64').toString('utf-8');
        if (decoded.startsWith('http')) return decoded;
        // Check if it's a partial URL
        if (decoded.includes('.') && decoded.includes('/') && !decoded.includes(' ')) {
          if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/.*$/.test(decoded)) return `https://${decoded}`;
        }
      } catch (e) {}
      return null;
    };

    const extractUrlFromText = (text: string) => {
      // 1. Look for standard URLs
      const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
      const matches = text.match(urlRegex);
      if (matches) {
        // Filter out common ad-network domains, tracking, error pages, and static asset CDNs
        const filtered = matches.filter(u => {
          const lowerU = u.toLowerCase();
          const isAd = (/linkvertise|loot-link|lootdest|doubleclick|google-analytics|adsystem|cloudflare|captcha|challenge|pixel|analytics|googletagmanager|facebook\.net|amazon-adsystem|disqus|hotjar|intercom|mixpanel|antiblock|goo\.gl|bit\.ly|tinyurl|t\.co|ouo\.io|shrinkme|adf\.ly|shorte\.st|cutt\.ly|rebrandly/.test(lowerU)) && !lowerU.includes('linkvertise.com/go/');
          const isError = /error|404|5xx|landing/.test(lowerU);
          const isAsset = /fonts\.gstatic\.com|fonts\.googleapis\.com|ajax\.googleapis\.com|cdnjs\.cloudflare\.com|unpkg\.com|wp\.com|gravatar\.com|jquery\.com|bootstrap|fontawesome/.test(lowerU);
          // If it's a direct link to a file or a known storage site, prioritize it
          const isPriority = /\.(zip|rar|exe|pdf|mp4|txt|png|jpg|7z|iso|tar|gz)$|mega\.nz|mediafire|drive\.google|dropbox|workupload|gofile|pixeldrain|1fichier/.test(lowerU);
          
          return (isPriority || (!isAd && !isError && !isAsset));
        });
        if (filtered.length > 0) {
          // Sort by priority (files first, then specific redirects)
          filtered.sort((a, b) => {
            const aLow = a.toLowerCase();
            const bLow = b.toLowerCase();
            
            const aPri = (/\.(zip|rar|exe|7z|iso|tar|gz)$|mega\.nz|mediafire|drive\.google/.test(aLow) ? 0 : 
                          (aLow.includes('linkvertise.com/go/') ? 1 : 2));
            const bPri = (/\.(zip|rar|exe|7z|iso|tar|gz)$|mega\.nz|mediafire|drive\.google/.test(bLow) ? 0 : 
                          (bLow.includes('linkvertise.com/go/') ? 1 : 2));
            return aPri - bPri;
          });
          return filtered[0];
        }
      }

      // 2. Look for base64 encoded URLs or partial paths
      const b64Regex = /[a-zA-Z0-9+/]{20,}=*/g;
      const b64Matches = text.match(b64Regex);
      if (b64Matches) {
        for (const b64 of b64Matches) {
          const decoded = decodeBase64(b64);
          if (decoded && decoded.startsWith('http') && !/linkvertise|loot-link|lootdest|cloudflare|google-analytics/.test(decoded)) {
            return decoded;
          }
        }
      }

      // 3. Look for "target" or "destination" keys in JSON-like strings
      const targetRegex = /["'](?:target|destination|url|link|href|redirect|target_url|redirect_url|dest|destination_url)["']\s*[:=]\s*["'](https?:\/\/.*?)["']/gi;
      const targetMatch = targetRegex.exec(text);
      if (targetMatch && targetMatch[1]) return targetMatch[1];

      // 4. Look for location.replace/href
      const locRegex = /location\.(?:replace|href)\s*\(\s*["'](https?:\/\/.*?)["']\s*\)/gi;
      const locMatch = locRegex.exec(text);
      if (locMatch && locMatch[1]) return locMatch[1];

      return null;
    };

    while (depth < maxDepth) {
      depth++;
      console.log(`[Engine] Step ${depth}: Processing ${currentUrl}`);

      // Special handling for Linkvertise/LootLabs internal API (highly effective)
      const isLinkvertise = currentUrl.includes("linkvertise.com");
      const isLootLabs = /loot-link\.com|lootdest\.com|loot-links\.com|lootlinks\.co|lootlink\.org/.test(currentUrl);

      if ((isLinkvertise || isLootLabs) && !currentUrl.includes("/api/v1/")) {
        try {
          const urlObj = new URL(currentUrl);
          
          // Check for 'o' or 'r' parameters which sometimes contain the destination
          const oParam = urlObj.searchParams.get('o') || urlObj.searchParams.get('r');
          if (oParam && oParam.startsWith('http') && !/linkvertise|loot-link|lootdest/.test(oParam)) return oParam;
          const decodedO = decodeBase64(oParam || '');
          if (decodedO && decodedO.startsWith('http') && !/linkvertise|loot-link|lootdest/.test(decodedO)) return decodedO;

          const pathParts = urlObj.pathname.split('/').filter(p => p && !['download', 'go'].includes(p));
          
          if (pathParts.length >= 2) {
            const userId = pathParts[0];
            const linkTarget = pathParts[1];
            
            // Try multiple API endpoints with retry logic
            const apiEndpoints = isLinkvertise ? [
              `https://publisher.linkvertise.com/api/v1/redirect/link/static/${userId}/${linkTarget}`,
              `https://publisher.linkvertise.com/api/v1/redirect/link/${userId}/${linkTarget}`,
              `https://linkvertise.com/api/v1/redirect/link/static/${userId}/${linkTarget}`
            ] : [
              `https://api.lootlabs.gg/v1/redirect/link/static/${userId}/${linkTarget}`,
              `https://api.lootlabs.gg/v1/redirect/link/${userId}/${linkTarget}`
            ];

            for (const apiUrl of apiEndpoints) {
              console.log(`[Engine] Attempting ${isLinkvertise ? 'Linkvertise' : 'LootLabs'} API bypass: ${apiUrl}`);
              
              // Try up to 2 times with different User-Agents
              for (let attempt = 0; attempt < 2; attempt++) {
                const currentUA = userAgents[Math.floor(Math.random() * userAgents.length)];
                try {
                  const apiRes = await axios.get(apiUrl, {
                    headers: { 
                      'User-Agent': currentUA,
                      'Referer': currentUrl,
                      'Accept': 'application/json, text/plain, */*',
                      'Accept-Language': 'en-US,en;q=0.9',
                      'Origin': isLinkvertise ? (apiUrl.includes('publisher') ? 'https://publisher.linkvertise.com' : 'https://linkvertise.com') : 'https://loot-link.com',
                      'DNT': '1',
                      'Connection': 'keep-alive',
                      'Sec-Fetch-Dest': 'empty',
                      'Sec-Fetch-Mode': 'cors',
                      'Sec-Fetch-Site': 'same-site',
                      'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                      'Sec-Ch-Ua-Mobile': '?0',
                      'Sec-Ch-Ua-Platform': '"Windows"',
                      'Cookie': 'linkvertise_user_id=; cf_clearance=; _ga=GA1.1.' + Math.floor(Math.random() * 1000000000) + '.' + Math.floor(Math.random() * 1000000000),
                      'X-Requested-With': 'XMLHttpRequest',
                      'X-Linkvertise-UT': '1',
                      'X-Linkvertise-V': '1',
                      'X-Linkvertise-T': Date.now().toString(),
                      'X-Linkvertise-S': Math.random().toString(36).substring(7)
                    },
                    timeout: 10000,
                    validateStatus: (status) => status === 200
                  });

                  if (apiRes.data?.data?.link?.url) {
                    console.log(`[Engine] ${isLinkvertise ? 'Linkvertise' : 'LootLabs'} API Success!`);
                    return apiRes.data.data.link.url;
                  }
                } catch (innerError: any) {
                  const status = innerError.response?.status;
                  if (status === 403) {
                    console.log(`[Engine] ${isLinkvertise ? 'Linkvertise' : 'LootLabs'} API protected (403). Falling back to deep extraction...`);
                  } else {
                    console.log(`[Engine] ${isLinkvertise ? 'Linkvertise' : 'LootLabs'} API attempt ${attempt + 1} failed: ${innerError.message}`);
                  }
                  if (attempt === 0) await new Promise(r => setTimeout(r, 1500));
                }
              }
            }
          }
        } catch (e: any) {
          console.log(`[Engine] API bypass failed: ${e.message}`);
        }
      }

      // Detect Cloudflare error pages specifically
      if (/cloudflare\.com\/5xx-error-landing/.test(currentUrl)) {
        throw new Error("The target site is experiencing a Cloudflare 5xx error.");
      }

      // Handle /go/ links specifically as they are often direct redirects
      if (currentUrl.includes("linkvertise.com/go/")) {
        try {
          const goRes = await axios.get(currentUrl, {
            maxRedirects: 0, // We want the Location header
            timeout: 5000,
            headers: { 'User-Agent': randomUA, 'Referer': 'https://linkvertise.com/' },
            validateStatus: (status) => status >= 300 && status < 400
          });
          if (goRes.headers.location) {
            const foundUrl = goRes.headers.location;
            if (!visitedUrls.has(foundUrl) && !/linkvertise|loot-link|lootdest/.test(foundUrl)) return foundUrl;
            currentUrl = foundUrl;
            visitedUrls.add(currentUrl);
            continue;
          }
        } catch (e) {}
      }

      try {
        // Check if the URL itself contains the destination
        const urlObj = new URL(currentUrl);
        const params = new URLSearchParams(urlObj.search);
        for (const [key, value] of params) {
          if (value.startsWith('http') && !/linkvertise|loot-link|lootdest/.test(value)) return value;
          const decoded = decodeBase64(value);
          if (decoded && decoded.startsWith('http') && !/linkvertise|loot-link|lootdest/.test(decoded)) return decoded;
        }

        let response;
        try {
          response = await axios.get(currentUrl, {
            maxRedirects: 5,
            timeout: 10000,
            headers: {
              'User-Agent': randomUA,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Referer': 'https://www.google.com/',
              'DNT': '1',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'none',
              'Sec-Fetch-User': '?1',
              'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
              'Sec-Ch-Ua-Mobile': '?0',
              'Sec-Ch-Ua-Platform': '"Windows"'
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            validateStatus: (status) => status >= 200 && status < 600 // Allow 403/500 to try extraction
          });
        } catch (e: any) {
          console.log(`[Engine] Request failed for ${currentUrl}: ${e.message}. Retrying with different UA...`);
          await new Promise(r => setTimeout(r, 1000));
          const retryUA = userAgents[Math.floor(Math.random() * userAgents.length)];
          response = await axios.get(currentUrl, {
            maxRedirects: 5,
            timeout: 10000,
            headers: { 'User-Agent': retryUA, 'Referer': 'https://www.google.com/' },
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            validateStatus: (status) => status >= 200 && status < 600
          });
        }

        const nextUrl = response.request.res.responseUrl || currentUrl;
        
        // If we were redirected to a new URL, update and continue
        if (nextUrl !== currentUrl && !visitedUrls.has(nextUrl)) {
          currentUrl = nextUrl;
          visitedUrls.add(currentUrl);
          continue;
        }

        // If no redirect, analyze the HTML content
        const html = response.data;
        if (typeof html !== 'string') break;

        // ONLY throw if it's a CLEAR challenge that blocks the page content
        if (html.includes('cf-challenge-running') || html.includes('cf-browser-verification')) {
          if (!html.includes('Redirecting...') && !html.includes('window.location')) {
             throw new Error("A mandatory Cloudflare challenge was detected. Our engine cannot solve CAPTCHAs yet.");
          }
        }

        // 1. Meta Refresh
        const metaMatch = html.match(/<meta http-equiv="refresh" content=".*;url=(.*?)">/i);
        if (metaMatch && metaMatch[1]) {
          let foundUrl = metaMatch[1].replace(/&amp;/g, '&').replace(/['"]/g, '').trim();
          if (!foundUrl.startsWith('http')) {
            foundUrl = new URL(foundUrl, currentUrl).href;
          }
          if (!visitedUrls.has(foundUrl) && !/linkvertise|loot-link|lootdest/.test(foundUrl)) {
            currentUrl = foundUrl;
            visitedUrls.add(currentUrl);
            continue;
          }
        }

        // 2. JavaScript Redirects (more robust matching)
        const jsRedirectPatterns = [
          /location\.(?:href|replace|assign)\s*=\s*["'](.*?)["']/i,
          /window\.location\s*=\s*["'](.*?)["']/i,
          /top\.location\s*=\s*["'](.*?)["']/i,
          /setTimeout\(.*location\.(?:href|replace|assign)\s*=\s*["'](.*?)["'].*\)/i
        ];

        for (const pattern of jsRedirectPatterns) {
          const match = html.match(pattern);
          if (match && match[1]) {
            let foundUrl = match[1];
            if (!foundUrl.startsWith('http')) {
              try { foundUrl = new URL(foundUrl, currentUrl).href; } catch(e) {}
            }
            if (foundUrl.startsWith('http') && !visitedUrls.has(foundUrl) && !/linkvertise|loot-link|lootdest/.test(foundUrl)) {
              currentUrl = foundUrl;
              visitedUrls.add(currentUrl);
              continue;
            }
          }
        }

        // 3. Hidden Form Inputs (Common in multi-step bypasses)
        const inputMatch = html.match(/<input[^>]*type=["']hidden["'][^>]*value=["'](https?:\/\/.*?)["']/i);
        if (inputMatch && inputMatch[1]) {
          const foundUrl = inputMatch[1];
          if (!visitedUrls.has(foundUrl) && !/linkvertise|loot-link|lootdest/.test(foundUrl)) {
            currentUrl = foundUrl;
            visitedUrls.add(currentUrl);
            continue;
          }
        }

        // 4. Nuxt/Vue/React State Extraction
        const stateRegex = /window\.(?:__NUXT__|__DATA__|__STATE__|__NEXT_DATA__)\s*=\s*({.*?});/s;
        const stateMatch = html.match(stateRegex);
        if (stateMatch && stateMatch[1]) {
          const extracted = extractUrlFromText(stateMatch[1]);
          if (extracted) return extracted;
        }

        // 5. Linkvertise specific data extraction
        const lvDataMatch = html.match(/window\.linkvertise_data\s*=\s*({.*?});/s);
        if (lvDataMatch && lvDataMatch[1]) {
          try {
            const lvData = JSON.parse(lvDataMatch[1]);
            if (lvData?.link?.url) return lvData.link.url;
            // Sometimes it's nested deeper
            if (lvData?.data?.link?.url) return lvData.data.link.url;
          } catch (e) {}
        }

        // 6. Linkvertise/LootLabs specific JSON extraction
        const jsonMatch = html.match(/JSON\.parse\(["'](.*?)["']\)/i);
        if (jsonMatch && jsonMatch[1]) {
          try {
            const decodedJson = JSON.parse(jsonMatch[1].replace(/\\"/g, '"'));
            const extracted = extractUrlFromText(JSON.stringify(decodedJson));
            if (extracted) return extracted;
          } catch (e) {}
        }

        // 7. Check for /go/ redirects in HTML
        const goMatch = html.match(/linkvertise\.com\/go\/([a-zA-Z0-9]+)/i);
        if (goMatch && goMatch[1]) {
          const foundUrl = `https://linkvertise.com/go/${goMatch[1]}`;
          if (!visitedUrls.has(foundUrl)) {
            currentUrl = foundUrl;
            visitedUrls.add(currentUrl);
            continue;
          }
        }

        // 6. Linkvertise specific base64 extraction from script tags
        if (currentUrl.includes("linkvertise.com")) {
          const b64Matches = html.match(/["']([a-zA-Z0-9+/]{30,}=*)["']/g);
          if (b64Matches) {
            for (const match of b64Matches) {
              const b64 = match.replace(/['"]/g, '');
              const decoded = decodeBase64(b64);
              if (decoded && decoded.startsWith('http') && !/linkvertise|loot-link|lootdest/.test(decoded)) {
                console.log(`[Engine] Linkvertise Deep Scan Success!`);
                return decoded;
              }
            }
          }
        }

        // 8. Work.ink / Boost.ink specific extraction
        if (currentUrl.includes("work.ink") || currentUrl.includes("boost.ink")) {
          const workMatch = html.match(/["'](https?:\/\/work\.ink\/api\/v1\/render\/[a-zA-Z0-9]+)["']/i);
          if (workMatch && workMatch[1]) {
            try {
              const workRes = await axios.get(workMatch[1], { headers: { 'User-Agent': randomUA } });
              if (workRes.data?.destination) return workRes.data.destination;
            } catch (e) {}
          }
        }

        // 9. Final attempt: Extract any URL from the page
        const extracted = extractUrlFromText(html);
        if (extracted && !visitedUrls.has(extracted)) {
          const lowerExtracted = extracted.toLowerCase();
          const isAsset = /fonts\.gstatic\.com|fonts\.googleapis\.com|ajax\.googleapis\.com|cdnjs\.cloudflare\.com|unpkg\.com|wp\.com|gravatar\.com|jquery\.com|googletagmanager|facebook\.net/.test(lowerExtracted);
          
          if (!isAsset) {
            const isShortener = /goo\.gl|bit\.ly|tinyurl|t\.co|ouo\.io|shrinkme|adf\.ly|shorte\.st|cutt\.ly|rebrandly|linkvertise|loot-link|lootdest|antiblock|work\.ink|boost\.ink/.test(lowerExtracted);
            if (isShortener) {
              console.log(`[Engine] Found intermediate shortener/ad link: ${extracted}. Continuing...`);
              currentUrl = extracted;
              visitedUrls.add(currentUrl);
              continue;
            }
            return extracted;
          }
        }

        // 10. Fallback to public bypass API if internal engine fails
        if (depth === maxDepth || !currentUrl) {
          console.log(`[Engine] Internal engine reached limit. Attempting public fallback...`);
          try {
            // Using a public bypass API as a last resort
            const fallbackRes = await axios.get(`https://api.bypass.vip/bypass?url=${encodeURIComponent(targetUrl)}`, { timeout: 10000 });
            if (fallbackRes.data?.destination) {
              console.log(`[Engine] Fallback Success!`);
              return fallbackRes.data.destination;
            }
          } catch (e) {}
        }

        // If we reached here and the URL is not an ad-domain, it might be the destination
        const isAdDomain = /linkvertise|loot-link|lootdest|direct-link|file-link|up-to-down|cloudflare|ad-center|ad-maven|shorte\.st|adf\.ly|antiblock|goo\.gl|bit\.ly|tinyurl|t\.co|ouo\.io|shrinkme|cutt\.ly|rebrandly|work\.ink|boost\.ink/.test(currentUrl.toLowerCase());
        if (!isAdDomain) {
          return currentUrl;
        }

        break; // No more progress possible
      } catch (error: any) {
        console.error(`[Engine] Error at step ${depth}:`, error.message);
        if (error.message.includes("Cloudflare") || (error.response && error.response.status === 403)) {
          throw new Error("Access denied. The target site is protected by Cloudflare or an anti-bot system.");
        }
        break;
      }
    }

    throw new Error("Bypass failed. The engine could not find a valid destination link in the redirect chain.");
  };

  app.post("/api/bypass", async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const destination = await customBypass(url);
      
      if (destination === url) {
        return res.status(500).json({ error: "Could not extract a direct link. The service might be highly protected." });
      }

      res.json({ destination });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Bypass failed. The link might be invalid or the service is blocking our request." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
