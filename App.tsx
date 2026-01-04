import React, { useState, useEffect } from 'react';
import { TagsInput } from './components/TagsInput';
import { ResultsView } from './components/ResultsView';
import { fetchProductAnalysis } from './services/geminiService';
import { AppStatus, AnalysisResult } from './types';

const DEFAULT_WEBSITES = [
  "amazon.co.za",
  "takealot.com",
  "checkers.co.za",
  "dischem.co.za",
  "clicks.co.za",
  "game.co.za",
  "makro.co.za",
  "pnp.co.za"
];

const App: React.FC = () => {
  const [productName, setProductName] = useState('');
  const [brands, setBrands] = useState<string[]>([]);
  const [websites, setWebsites] = useState<string[]>(DEFAULT_WEBSITES);
  // Theme color for internal usage if needed (though we use tailwind classes)
  // const THEME_COLOR = "#00EAFF"; 

  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // State for the "Scanning..." animation
  const [currentScanningSite, setCurrentScanningSite] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (status === AppStatus.SEARCHING && websites.length > 0) {
      interval = setInterval(() => {
        setCurrentScanningSite((prev) => (prev + 1) % websites.length);
      }, 800);
    }
    return () => clearInterval(interval);
  }, [status, websites]);

  const handleSearch = async () => {
    if (!productName || brands.length === 0 || websites.length === 0) {
      alert("Please fill in all fields (Product Name, at least one Brand, and one Website).");
      return;
    }

    setStatus(AppStatus.SEARCHING);
    setError(null);

    try {
      const data = await fetchProductAnalysis({
        productName,
        brands,
        websites
      });
      setResult(data);
      setStatus(AppStatus.COMPLETE);
    } catch (err: any) {
      setError(err.message || "Failed to analyze products. Please verify your API Key and try again.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleReset = () => {
    setStatus(AppStatus.IDLE);
    setResult(null);
    setProductName('');
    setBrands([]);
    setWebsites(DEFAULT_WEBSITES);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hexagon Search Icon (Logo) - Using Image */}
            <div className="relative w-10 h-10 flex items-center justify-center">
              <img src="/hexagon.png" alt="Containium Hexagon" className="w-full h-full object-contain drop-shadow-md" />
              <svg className="w-5 h-5 text-white absolute" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">PriceScout AI</h1>
          </div>
          {/* Footer moved out of header */}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {status === AppStatus.IDLE && (
          <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
            <div className="text-center space-y-3 sm:space-y-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                Find the Best Deal. <span className="text-containium-cyan">Instantly.</span>
              </h2>
              <p className="text-base sm:text-lg text-slate-600 px-2">
                Enter a product, your preferred brands, and the stores you trust.
                Our AI Agent scans them in real-time to build your comparison matrix.
              </p>
            </div>

            <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-xl border border-slate-100 space-y-5 sm:space-y-6">

              {/* Product Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-containium-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Product Name
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Wireless Noise Cancelling Headphones"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-containium-cyan focus:border-transparent transition-all outline-none"
                />
              </div>

              {/* Brands Input */}
              <TagsInput
                label="Preferred Brands"
                placeholder="Add brand (e.g. Sony, Bose)"
                tags={brands}
                onChange={setBrands}
                icon={
                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                }
              />

              {/* Websites Input */}
              <TagsInput
                label="Target Websites"
                placeholder="Add exact domain (e.g. amazon.com)"
                tags={websites}
                onChange={setWebsites}
                icon={
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                }
              />

              <button
                onClick={handleSearch}
                className="w-full py-4 bg-containium-cyan hover:bg-cyan-400 text-slate-900 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 border border-cyan-400/20"
              >
                Scan Prices & Build Matrix
              </button>
            </div>

            <div className="text-center text-sm text-slate-400">
              Note: The tool searches strict domains (e.g., 'amazon.com') to ensure link accuracy.
            </div>
          </div>
        )}

        {status === AppStatus.SEARCHING && (
          <div className="max-w-2xl mx-auto pt-20 text-center">
            {/* Rotating Hexagon Loader - Using Image */}
            <div className="inline-block relative w-24 h-24 mb-8">
              <img src="/hexagon.png" alt="Scanning..." className="w-full h-full object-contain animate-spin-slow" />
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2 animate-pulse">Architecting Your Deals...</h2>

            {/* Dynamic Scanning Text */}
            <p className="text-slate-500 text-lg transition-all duration-300 min-h-[1.75rem]">
              Scanning <span className="font-semibold text-containium-cyan">{websites[currentScanningSite] || 'web'}</span> for availability...
            </p>

            <div className="mt-8 space-y-2 max-w-sm mx-auto">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-containium-cyan animate-progressBar w-full origin-left"></div>
              </div>
            </div>
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="max-w-md mx-auto pt-20 text-center">
            <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100">
              <svg className="w-12 h-12 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-bold mb-2">Analysis Failed</h3>
              <p className="mb-6">{error || "An unknown error occurred."}</p>
              <button
                onClick={() => setStatus(AppStatus.IDLE)}
                className="px-6 py-2 bg-white border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {status === AppStatus.COMPLETE && result && (
          <ResultsView data={result} onReset={handleReset} />
        )}

      </main>

      <style>{`
        @keyframes progressBar {
          0% { transform: scaleX(0); }
          50% { transform: scaleX(0.7); }
          100% { transform: scaleX(1); }
        }
        .animate-progressBar {
          animation: progressBar 3s ease-in-out infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>

      {/* Mobile-Adjusted Footer */}
      <footer className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-sm border-t border-slate-200 py-3 z-40">
        <div className="flex items-center justify-center gap-2 text-[10px] md:text-xs font-medium text-slate-400 opacity-90 scale-95 origin-center">
          <span>Powered by</span>
          <img src="/containium-logo.png" alt="Containium" className="h-5 md:h-6" />
        </div>
      </footer>
    </div>
  );
};

export default App;