
import React, { useState, useRef } from 'react';
import { performWebSearch, generateWebPageContent } from '../../services/geminiService';
import { SearchResult } from '../../types';

interface BrowserAppProps {
  onBack: () => void;
  isOpen: boolean;
}

const BrowserApp: React.FC<BrowserAppProps> = ({ onBack, isOpen }) => {
  const [urlInput, setUrlInput] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pageContent, setPageContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'home' | 'results' | 'page'>('home');

  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!urlInput.trim()) return;

      setLoading(true);
      setResults([]);
      setPageContent(null);
      setCurrentUrl(`search://${urlInput}`); // Pseudo protocol
      
      const data = await performWebSearch(urlInput);
      setResults(data);
      setView('results');
      setLoading(false);
      
      // Add to history logic omitted for brevity
  };

  const handleLinkClick = async (result: SearchResult) => {
      setLoading(true);
      setCurrentUrl(result.url);
      const content = await generateWebPageContent(result.url, result.title, result.snippet);
      setPageContent(content);
      setView('page');
      setLoading(false);
  };

  const goHome = () => {
      setView('home');
      setUrlInput('');
      setCurrentUrl('');
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col app-transition overflow-hidden">
        {/* Status Bar Background */}
        <div className="h-12 bg-white w-full absolute top-0 z-20"></div>

        {/* Browser Header / Address Bar */}
        <div className="mt-12 px-4 pb-2 border-b border-gray-200 bg-white z-20 flex gap-2 items-center">
            {view !== 'home' && (
                <button onClick={goHome} className="w-8 h-8 flex items-center justify-center text-blue-500 text-xl">
                    🏠
                </button>
            )}
            <form onSubmit={handleSearch} className="flex-1 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {view === 'page' ? '🔒' : '🔍'}
                </div>
                <input 
                    ref={searchInputRef}
                    type="text"
                    value={view === 'page' ? currentUrl : urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onFocus={() => { if(view==='page') setUrlInput(currentUrl); }}
                    className="w-full bg-gray-100 rounded-xl py-2 pl-9 pr-4 text-sm text-black outline-none focus:bg-gray-200 focus:ring-2 focus:ring-blue-100 transition-all truncate"
                    placeholder="Search or enter website name"
                />
            </form>
            <button onClick={onBack} className="text-blue-500 font-semibold text-sm">Done</button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 relative no-scrollbar">
            
            {/* Loading Indicator */}
            {loading && (
                <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <span className="text-blue-500 font-bold text-sm animate-pulse">
                        {view === 'results' ? 'Searching NetSurf...' : 'Loading Page...'}
                    </span>
                </div>
            )}

            {/* HOME VIEW */}
            {view === 'home' && (
                <div className="p-6">
                    <div className="text-center mt-10 mb-12">
                        <h1 className="text-4xl font-bold text-blue-600 mb-2 font-serif italic">NetSurf</h1>
                        <p className="text-gray-400 text-sm">AI-Powered Simulation Browser</p>
                    </div>
                    
                    <h3 className="font-bold text-gray-800 mb-4 ml-1">Favorites</h3>
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { name: 'Wiki', icon: 'W', color: 'bg-gray-200' },
                            { name: 'Social', icon: 'S', color: 'bg-green-100' },
                            { name: 'News', icon: 'N', color: 'bg-red-100' },
                            { name: 'Tech', icon: 'T', color: 'bg-blue-100' },
                            { name: 'Shop', icon: '🛍️', color: 'bg-orange-100' },
                            { name: 'Mail', icon: '✉️', color: 'bg-purple-100' },
                            { name: 'Video', icon: '▶', color: 'bg-black text-white' },
                            { name: 'Games', icon: '🎮', color: 'bg-yellow-100' }
                        ].map((fav, i) => (
                            <div key={i} onClick={() => { setUrlInput(fav.name); handleSearch(); }} className="flex flex-col items-center gap-2 cursor-pointer active:opacity-60">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-sm ${fav.color}`}>
                                    {fav.icon}
                                </div>
                                <span className="text-xs text-gray-500">{fav.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* RESULTS VIEW */}
            {view === 'results' && (
                <div className="bg-white min-h-full">
                    {results.map(result => (
                        <div 
                            key={result.id} 
                            onClick={() => handleLinkClick(result)}
                            className="p-4 border-b border-gray-100 cursor-pointer active:bg-gray-50"
                        >
                            <div className="text-xs text-gray-500 mb-1 truncate">{result.url}</div>
                            <div className="text-blue-600 text-lg font-medium leading-tight mb-1 hover:underline">{result.title}</div>
                            <div className="text-sm text-gray-600 leading-snug line-clamp-2">{result.snippet}</div>
                        </div>
                    ))}
                    <div className="p-8 text-center text-gray-400 text-sm">
                        End of simulated results
                    </div>
                </div>
            )}

            {/* PAGE VIEW */}
            {view === 'page' && pageContent && (
                <div className="bg-white min-h-full p-6 animate-[fadeIn_0.3s]">
                    <div className="prose prose-sm max-w-none prose-blue">
                         {/* Simple markdown rendering (simulated by splitting newlines for now) */}
                         {pageContent.split('\n').map((line, i) => {
                             if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mb-4">{line.replace('# ', '')}</h1>;
                             if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-6 mb-3">{line.replace('## ', '')}</h2>;
                             if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc mb-1">{line.replace('- ', '')}</li>;
                             return <p key={i} className="mb-3 text-gray-800 leading-relaxed">{line}</p>;
                         })}
                    </div>
                </div>
            )}
        </div>

        {/* Bottom Toolbar */}
        <div className="h-12 border-t border-gray-200 bg-gray-50 flex items-center justify-around text-blue-500 z-20 pb-safe">
             <button onClick={() => view === 'page' ? setView('results') : goHome()} className="text-xl disabled:opacity-30" disabled={view === 'home'}>‹</button>
             <button className="text-xl opacity-30">›</button>
             <button className="text-xl opacity-30">📤</button>
             <button className="text-xl opacity-30">📖</button>
             <button className="text-xl opacity-30">❐</button>
        </div>
    </div>
  );
};

export default BrowserApp;
