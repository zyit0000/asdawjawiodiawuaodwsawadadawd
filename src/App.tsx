import React, { useState, useEffect } from "react";
import { 
  Search, 
  Zap, 
  ArrowRight, 
  Copy, 
  ExternalLink, 
  Loader2, 
  X,
  Code,
  Terminal,
  Github,
  Link2,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { Toaster, toast } from "sonner";

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [supportedServices, setSupportedServices] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState(
    localStorage.getItem("API_BASE_URL") || 
    (window.location.hostname === "localhost" ? "http://localhost:3000" : "")
  );

  const isGitHubPages = window.location.hostname.endsWith("github.io");
  const needsApiConfig = isGitHubPages && !apiBaseUrl;

  const fetchSupported = async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}/api/supported`);
      // Ensure uniqueness in frontend as well
      const uniqueServices = Array.from(new Set(response.data as string[]));
      setSupportedServices(uniqueServices);
    } catch (err) {
      setSupportedServices(["Linkvertise", "Bitly", "TinyURL", "Adf.ly"]);
    }
  };

  useEffect(() => {
    fetchSupported();
  }, [apiBaseUrl]);

  useEffect(() => {
    // Suppress benign Vite WebSocket errors that appear in some environments
    const handleRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || "";
      if (msg.includes("WebSocket closed without opened") || msg.includes("failed to connect to websocket")) {
        event.preventDefault();
      }
    };
    const handleError = (event: ErrorEvent) => {
      const msg = event.message || "";
      if (msg.includes("WebSocket closed without opened") || msg.includes("failed to connect to websocket")) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  const filteredServices = supportedServices.filter(s => 
    s.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const handleBypass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setStatus("Initializing engine...");

    const statusSteps = [
      "Analyzing redirect chain...",
      "Spoofing browser headers...",
      "Extracting metadata...",
      "Decrypting destination...",
      "Finalizing bypass..."
    ];

    let step = 0;
    const interval = setInterval(() => {
      if (step < statusSteps.length) {
        setStatus(statusSteps[step]);
        step++;
      }
    }, 1500);

    try {
      const response = await axios.post(`${apiBaseUrl}/api/bypass`, { url });
      clearInterval(interval);
      setStatus("Success!");
      setResult(response.data.destination);
      toast.success("Link bypassed successfully!");
    } catch (err: any) {
      clearInterval(interval);
      setStatus(null);
      let msg = err.response?.data?.error || "Bypass failed. The link might be highly protected.";
      
      if (url.includes("linkvertise.com")) {
        msg = "Linkvertise bypass failed. This link might require manual solving or is using advanced anti-bot protection.";
      }
      
      setError(msg);
      toast.error("Bypass failed");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const clearInput = () => {
    setUrl("");
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#f5f5f5] font-sans selection:bg-[#F27D26]/30 selection:text-[#F27D26]">
      <Toaster position="top-center" theme="dark" richColors />
      
      {/* Basic Header */}
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#F27D26] fill-current" />
            <span className="text-lg font-bold tracking-tight uppercase italic">LINKDIRECT</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-white/40">
            <button 
              onClick={() => setShowApiConfig(!showApiConfig)}
              className={`hover:text-[#F27D26] transition-colors flex items-center gap-1 ${showApiConfig ? 'text-[#F27D26]' : ''}`}
            >
              <Terminal className="w-3 h-3" />
              API Config
            </button>
            <a href="#docs" className="hover:text-[#F27D26] transition-colors">Docs</a>
            <a href="https://github.com" target="_blank" className="hover:text-[#F27D26] transition-colors">Github</a>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {needsApiConfig && !showApiConfig && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-rose-500/10 border-b border-rose-500/20 py-2 px-6 text-center"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 flex items-center justify-center gap-2">
              <Lock className="w-3 h-3" />
              API Configuration Required for GitHub Pages
              <button 
                onClick={() => setShowApiConfig(true)}
                className="underline hover:text-white transition-colors ml-2"
              >
                Configure Now
              </button>
            </p>
          </motion.div>
        )}
        {showApiConfig && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#111] border-b border-white/5 overflow-hidden"
          >
            <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Backend API URL</span>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={apiBaseUrl}
                    onChange={(e) => {
                      setApiBaseUrl(e.target.value);
                      localStorage.setItem("API_BASE_URL", e.target.value);
                    }}
                    placeholder="https://your-app.run.app"
                    className="bg-black border border-white/10 rounded px-3 py-1 text-xs w-64 focus:border-[#F27D26] outline-none transition-colors"
                  />
                  <button 
                    onClick={() => copyToClipboard(apiBaseUrl)}
                    className="p-1 hover:text-[#F27D26] transition-colors"
                    title="Copy API URL"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-white/20 max-w-xs leading-relaxed">
                If deploying to GitHub Pages, set this to your Cloud Run URL. 
                Leave empty if the frontend and backend are on the same domain.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-3xl mx-auto px-6 py-20">
        {/* Simple Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight uppercase italic">
            Direct Link <span className="text-[#F27D26]">Bypasser</span>
          </h1>
          <p className="text-white/40 text-sm font-medium">
            Paste your encrypted link below to get the direct destination instantly.
          </p>
        </div>

        {/* Basic Input Card */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl mb-12">
          <form onSubmit={handleBypass} className="space-y-4">
            <div className="relative">
              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/10" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://linkvertise.com/..."
                className="w-full bg-black border border-white/10 rounded-xl py-4 pl-12 pr-12 outline-none focus:border-[#F27D26]/50 transition-colors font-mono text-sm"
              />
              {url && (
                <button 
                  type="button"
                  onClick={clearInput}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
              <button
                type="submit"
                disabled={loading || !url}
                className="w-full py-4 bg-[#F27D26] hover:bg-[#ff8c3a] disabled:bg-white/5 disabled:text-white/10 text-black font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-[10px] tracking-widest">{status}</span>
                  </div>
                ) : (
                  <>
                    Bypass Link
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
          </form>

          {/* Result Section */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-8 pt-8 border-t border-white/5"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#F27D26]">Result Found</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => copyToClipboard(result)}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                      title="Copy"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a 
                      href={result} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-[#F27D26] text-black rounded-lg transition-colors"
                      title="Open"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                <div className="bg-black p-4 rounded-xl border border-white/5 font-mono text-xs break-all text-white/60">
                  {result}
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-8 pt-8 border-t border-white/5"
              >
                <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-xl text-xs text-rose-500 font-medium">
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Basic Info Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-20">
          <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#F27D26]">Supported Services</h3>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
                <input 
                  type="text"
                  placeholder="Search..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="bg-black border border-white/5 rounded-md py-1 pl-7 pr-2 text-[10px] outline-none focus:border-[#F27D26]/30 transition-colors w-32"
                />
              </div>
            </div>
            <div className="flex-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              <div className="flex flex-wrap gap-2">
                {filteredServices.length > 0 ? (
                  filteredServices.map((s, index) => (
                    <span key={`${s}-${index}`} className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-medium text-white/40 border border-white/5">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-white/20 italic">No services found...</span>
                )}
              </div>
            </div>
          </div>
          <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#F27D26] mb-4">Privacy Policy</h3>
            <p className="text-[10px] text-white/30 leading-relaxed">
              We do not log your bypasses. All requests are processed in real-time and tracking parameters are stripped to protect your anonymity. Our engine follows redirects server-side to ensure your IP is never exposed to the ad-networks.
            </p>
          </div>
        </div>

        {/* Documentation Section (New) */}
        <section id="docs" className="pt-20 border-t border-white/5 mb-20">
          <h2 className="text-2xl font-bold mb-6 italic uppercase tracking-tight">System <span className="text-[#F27D26]">Documentation</span></h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">How it works</h3>
              <p className="text-xs text-white/30 leading-relaxed">
                LinkDirect uses a sophisticated internal engine to analyze redirect chains. Unlike other services that rely on fragile third-party APIs, our system attempts to decrypt the destination URL directly by simulating browser behavior and extracting metadata from the source.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Limitations</h3>
              <p className="text-xs text-white/30 leading-relaxed">
                Some links use advanced protection layers (like Cloudflare Turnstile or custom captchas). While our engine is constantly updated, highly protected links may occasionally fail if they require manual human interaction.
              </p>
            </div>
          </div>
        </section>

        {/* Public API Docs (Moved) */}
        <section id="api" className="pt-20 border-t border-white/5">
          <h2 className="text-2xl font-bold mb-6 italic uppercase tracking-tight">Developer <span className="text-[#F27D26]">API</span></h2>
          <p className="text-white/40 text-sm mb-8">
            Integrate our bypass engine into your own applications. No authentication required.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">HTTP POST /api/bypass</span>
                <Terminal className="w-3 h-3 text-white/20" />
              </div>
              <div className="p-6 font-mono text-xs space-y-6">
                <div>
                  <div className="text-[#F27D26] mb-2">// Request</div>
                  <div className="bg-black p-4 rounded-xl border border-white/5 text-white/40">
                    curl -X POST {apiBaseUrl || window.location.origin}/api/bypass \<br />
                    &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                    &nbsp;&nbsp;-d '{"{"}"url": "https://linkvertise.com/..."{"}"}'
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Python Integration</span>
                <Code className="w-3 h-3 text-white/20" />
              </div>
              <div className="p-6 font-mono text-xs space-y-6">
                <div className="relative group">
                  <pre className="bg-black p-4 rounded-xl border border-white/5 text-white/40 overflow-x-auto custom-scrollbar">
{`import requests

def bypass(url):
    api = "${apiBaseUrl || window.location.origin}/api/bypass"
    res = requests.post(api, json={"url": url})
    return res.json().get("destination")`}
                  </pre>
                  <button 
                    onClick={() => copyToClipboard(`import requests\n\ndef bypass(url):\n    api = "${apiBaseUrl || window.location.origin}/api/bypass"\n    res = requests.post(api, json={"url": url})\n    return res.json().get("destination")`)}
                    className="absolute top-2 right-2 p-1 bg-white/5 hover:bg-white/10 rounded transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Basic Footer */}
      <footer className="border-t border-white/5 py-12 bg-[#030303]">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#F27D26] fill-current" />
            <span className="text-sm font-bold tracking-tight uppercase italic">LINKDIRECT</span>
          </div>
          <div className="text-[10px] font-medium text-white/10 uppercase tracking-[0.3em]">
            &copy; 2026 LinkDirect Engine
          </div>
          <div className="flex gap-4">
            <a href="https://github.com" target="_blank" className="text-white/20 hover:text-white transition-colors">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
