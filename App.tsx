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
    } catch (err) {
      setError("Failed to analyze products. Please verify your API Key and try again.");
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
            <div className="bg-blue-600 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">PriceScout AI</h1>
          </div>
          <div className="text-xs font-medium text-slate-400">
            Powered by Gemini Pro & Google Search
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {status === AppStatus.IDLE && (
          <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-extrabold text-slate-900">
                Find the Best Deal. <span className="text-blue-600">Instantly.</span>
              </h2>
              <p className="text-lg text-slate-600">
                Enter a product, your preferred brands, and the stores you trust. 
                Our AI Agent scans them in real-time to build your comparison matrix.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6">
              
              {/* Product Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Product Name
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Wireless Noise Cancelling Headphones"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
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
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
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
          <div className="max-w-2xl mx-auto pt-20 text-center animate-pulse">
            <div className="inline-block relative w-20 h-20 mb-8">
              <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Architecting Your Deals...</h2>
            
            {/* Dynamic Scanning Text */}
            <p className="text-slate-500 text-lg transition-all duration-300 min-h-[1.75rem]">
              Scanning <span className="font-semibold text-blue-600">{websites[currentScanningSite] || 'web'}</span> for availability...
            </p>
            
            <div className="mt-8 space-y-2 max-w-sm mx-auto">
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-progressBar w-full origin-left"></div>
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
    </div>
  );
};

export default App;