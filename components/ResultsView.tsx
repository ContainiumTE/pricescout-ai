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
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          Architect's Top Pick
        </h2>
        <p className="text-lg md:text-xl font-light leading-relaxed">
          {data.top_recommendation}
        </p>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800">Price Matrix</h3>
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
            {data.comparison_table.length} Entries Processed
          </span>
        </div>
        
        <div className="overflow-x-auto">
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
                    <td className={`p-4 font-bold text-right font-mono ${isNotFound ? 'text-slate-400 text-sm italic' : 'text-emerald-600 text-lg'}`}>
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
                        className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          isNotFound 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
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