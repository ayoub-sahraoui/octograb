
import React, { useState } from 'react';
import { Bot, FileSpreadsheet, Upload, Loader2, Sparkles } from 'lucide-react';
import { Plan } from '../../core/types';

interface AiWizardProps {
  onCreatePlan: (plan: Plan) => void;
}

export const AiWizard: React.FC<AiWizardProps> = ({ onCreatePlan }) => {
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [schema, setSchema] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    
    // Client-side header extraction logic
    if (uploadedFile.name.endsWith('.csv') || uploadedFile.type === 'text/csv') {
       const reader = new FileReader();
       reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text) {
            const headers = text.split('\n')[0].split(',').map(h => h.trim());
            setSchema(headers);
          }
       };
       reader.readAsText(uploadedFile);
    } else {
       // Mock for Excel since we can't parse binary in this environment easily without libs
       setSchema(['Product Name', 'Price', 'Stock Status', 'SKU', 'Image URL']); 
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 2000)); // Mock AI Delay
    
    // Determine template based on prompt or file
    const isEcommerce = prompt.toLowerCase().includes('product') || prompt.toLowerCase().includes('amazon') || schema.includes('Price');
    
    const newPlan: Plan = {
       meta: { name: prompt.split(' ').slice(0, 4).join(' ') || "AI Generated Plan", version: "1.0", userAgent: "Desktop" },
       variables: { baseUrl: "https://target-site.com" },
       pipeline: [
         { id: 'nav_ai', type: 'navigate', url: 'https://target-site.com/search' },
         { 
           id: 'loop_ai', type: 'loop_elements', selector: isEcommerce ? '.product-card' : '.list-item', 
           children: [
             {
               id: 'extract_ai', type: 'extract_scope',
               // Map schema to fields, or default fields
               fields: schema.length > 0 
                 ? schema.map(h => ({ key: h.toLowerCase().replace(/ /g, '_'), selector: `.css-${h.substring(0,3)}`, attribute: 'text' }))
                 : [ { key: 'title', selector: 'h2', attribute: 'text' }, { key: 'price', selector: '.price', attribute: 'text' }, { key: 'link', selector: 'a', attribute: 'href' } ]
             }
           ]
         },
         {
            id: 'pagination_ai', type: 'loop_pagination', config: { nextButtonSelector: '.next-page', maxPages: 5 }, children: []
         }
       ]
    };
    
    onCreatePlan(newPlan);
  };

  return (
    <div className="flex-1 bg-slate-50 p-4 md:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 md:p-8 text-white text-center">
            <Bot className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 opacity-90" />
            <h2 className="text-xl md:text-2xl font-bold mb-2">AI Plan Generator</h2>
            <p className="text-xs md:text-sm text-indigo-100">Describe what you want to scrape, or upload a file to match a specific format.</p>
         </div>
         
         <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
            <div>
               <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-2">What are we scraping?</label>
               <textarea 
                  className="w-full p-2.5 md:p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none h-20 md:h-24 resize-none text-sm md:text-base"
                  placeholder="e.g. Scrape product titles and prices from Amazon search results for 'gaming laptop'..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
               />
            </div>

            <div className="border-t border-slate-100 pt-4 md:pt-6">
               <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-2">Output Schema (Optional)</label>
               <p className="text-[10px] md:text-xs text-slate-500 mb-3">Upload a CSV or Excel file to automatically configure extraction fields.</p>
               
               <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 md:p-6 text-center hover:bg-slate-50 transition-colors relative">
                  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} accept=".csv, .xlsx, .xls" />
                  {file ? (
                     <div className="flex flex-col items-center text-violet-600">
                        <FileSpreadsheet className="w-7 h-7 md:w-8 md:h-8 mb-2" />
                        <span className="font-medium text-xs md:text-sm">{file.name}</span>
                        <span className="text-[10px] md:text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</span>
                     </div>
                  ) : (
                     <div className="flex flex-col items-center text-slate-400">
                        <Upload className="w-7 h-7 md:w-8 md:h-8 mb-2" />
                        <span className="text-xs md:text-sm">Drop CSV/Excel here or click to upload</span>
                     </div>
                  )}
               </div>

               {schema.length > 0 && (
                  <div className="mt-3 md:mt-4 bg-slate-50 p-2.5 md:p-3 rounded-md border border-slate-200">
                     <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-2">Detected Fields</div>
                     <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {schema.map((field, i) => (
                           <span key={i} className="px-2 py-0.5 md:py-1 bg-white border border-slate-200 rounded text-[10px] md:text-xs text-slate-700 font-medium shadow-sm">
                              {field}
                           </span>
                        ))}
                     </div>
                  </div>
               )}
            </div>

            <button 
               onClick={handleGenerate}
               disabled={!prompt && !file || isGenerating}
               className="w-full py-2.5 md:py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg shadow-lg shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer text-sm md:text-base"
            >
               {isGenerating ? (
                  <>
                     <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" /> Generating Plan...
                  </>
               ) : (
                  <>
                     <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Generate Magic Plan
                  </>
               )}
            </button>
         </div>
      </div>
    </div>
  );
};
