import React from 'react';
import { AnalysisResult } from '../types';

interface ResultsViewProps {
  data: AnalysisResult;
  onReset: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ data, onReset }) => {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn">

      {/* Top Recommendation Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          Architect's Top Pick
        </h2>
        <p className="text-xl md:text-2xl font-light leading-relaxed text-containium-cyan drop-shadow-sm">
          {data.top_recommendation}
        </p>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-xl font-bold text-slate-800">Price Matrix</h3>
          <span className="bg-cyan-50 text-containium-cyan text-xs font-bold px-3 py-1 rounded-full border border-cyan-100">
            {data.comparison_table.length} Entries Processed
          </span>
        </div>

        {/* Mobile: Card View */}
        <div className="block md:hidden bg-slate-50/50">
          {data.comparison_table.map((item, idx) => {
            const isNotFound = item.sale_price === "Not Found";
            return (
              <div key={idx} className="p-4 border-b border-slate-200 last:border-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.website}</span>
                    <h4 className="font-bold text-slate-800 text-lg">{item.brand}</h4>
                    <p className="text-sm text-slate-600 leading-tight">{item.product}</p>
                  </div>
                  <div className="text-right">
                    {item.original_price !== "N/A" && item.original_price !== "-" && (
                      <div className="text-xs text-slate-400 line-through">{item.original_price}</div>
                    )}
                    <div className={`font-mono font-bold text-xl ${isNotFound ? 'text-slate-400' : 'text-containium-cyan'}`}>
                      {item.sale_price}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-100 text-sm text-slate-600 mb-3">
                  {item.comment}
                  {item.extra_discounts && item.extra_discounts !== "None" && !isNotFound && (
                    <div className="text-amber-600 font-medium text-xs mt-1">Extra: {item.extra_discounts}</div>
                  )}
                </div>

                <a
                  href={item.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full text-center py-3 text-sm font-bold rounded-xl transition-colors ${isNotFound
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed hidden'
                      : 'bg-containium-cyan hover:bg-cyan-400 text-slate-900 shadow-md'
                    }`}
                  onClick={(e) => isNotFound && e.preventDefault()}
                >
                  Visit Deal
                </a>
              </div>
            );
          })}
        </div>

        {/* Desktop: Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold border-b border-slate-200">Brand & Product</th>
                <th className="p-4 font-semibold border-b border-slate-200">Website</th>
                <th className="p-4 font-semibold border-b border-slate-200 text-right">Original</th>
                <th className="p-4 font-semibold border-b border-slate-200 text-right">Price</th>
                <th className="p-4 font-semibold border-b border-slate-200">Analysis</th>
                <th className="p-4 font-semibold border-b border-slate-200 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.comparison_table.map((item, idx) => {
                const isNotFound = item.sale_price === "Not Found";

                return (
                  <tr key={idx} className={`transition-colors ${isNotFound ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
                    <td className="p-4">
                      <div className={`font-bold ${isNotFound ? 'text-slate-400' : 'text-slate-800'}`}>{item.brand}</div>
                      <div className={`text-sm ${isNotFound ? 'text-slate-400' : 'text-slate-500'}`}>{item.product}</div>
                    </td>
                    <td className="p-4 text-slate-700">{item.website}</td>
                    <td className="p-4 text-slate-400 line-through text-right font-mono text-sm">
                      {item.original_price !== "N/A" && item.original_price !== "-" ? item.original_price : ""}
                    </td>
                    <td className={`p-4 font-bold text-right font-mono ${isNotFound ? 'text-slate-400 text-sm italic' : 'text-containium-cyan text-lg'}`}>
                      {item.sale_price}
                    </td>
                    <td className="p-4 text-sm">
                      <div className="font-medium text-slate-700">{item.comment}</div>
                      {item.extra_discounts && item.extra_discounts !== "None" && !isNotFound && (
                        <div className="text-amber-600 text-xs mt-1">Extra: {item.extra_discounts}</div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <a
                        href={item.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isNotFound
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            : 'bg-containium-cyan hover:bg-cyan-400 text-slate-900 shadow-sm font-bold'
                          }`}
                        onClick={(e) => isNotFound && e.preventDefault()}
                      >
                        {isNotFound ? 'Not Found' : 'Visit Deal'}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onReset}
          className="px-8 py-3 bg-white border border-slate-300 text-slate-600 font-medium rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
        >
          Start New Search
        </button>
      </div>
    </div>
  );
};