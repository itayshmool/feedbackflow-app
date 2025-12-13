import { useState } from 'react';
import { Sparkles, Quote, RefreshCw, Clock, Cpu } from 'lucide-react';

interface QuoteData {
  quote: string;
  author: string;
  authorTitle: string;
  _debug?: {
    aiResponseTime: string;
    aiProvider: string;
    category: string;
  };
}

export default function QuoteTest() {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<QuoteData[]>([]);

  const fetchQuote = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/test/quote-of-the-day');
      const data = await response.json();
      
      if (data.success) {
        setQuote(data.data);
        // Add to history (keep last 5)
        setHistory(prev => [data.data, ...prev].slice(0, 5));
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">🧪 Quote of the Day - Test Page</h1>
        <p className="text-gray-400 mb-8">Test the Gemini AI integration for growth-focused quotes</p>
        
        {/* Generate Button */}
        <button
          onClick={fetchQuote}
          disabled={loading}
          className="mb-8 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 
                     text-white font-semibold rounded-lg flex items-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Quote
            </>
          )}
        </button>
        
        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {/* Quote Display */}
        {quote && (
          <>
            {/* Main Quote Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-900 rounded-xl p-5 sm:p-6 text-white shadow-xl mb-6">
              {/* Decorative background */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
              
              <div className="relative">
                {/* Header */}
                <div className="flex items-center gap-2 text-emerald-400 mb-4">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Growth Wisdom</span>
                </div>
                
                {/* Quote */}
                <div className="flex gap-3">
                  <Quote className="w-7 h-7 text-indigo-400/40 flex-shrink-0 mt-0.5" />
                  <blockquote className="text-lg sm:text-xl font-light leading-relaxed text-white/95 italic">
                    {quote.quote}
                  </blockquote>
                </div>
                
                {/* Author */}
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/10">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 
                                flex items-center justify-center ring-2 ring-white/20 text-xl font-bold">
                    {quote.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-lg">{quote.author}</p>
                    <p className="text-sm text-slate-400">{quote.authorTitle}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Debug Info */}
            {quote._debug && (
              <div className="bg-slate-800 rounded-lg p-4 text-sm font-mono mb-6">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Debug Info
                </h3>
                <div className="grid grid-cols-2 gap-2 text-gray-300">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>Response Time:</span>
                  </div>
                  <span className="text-emerald-400">{quote._debug.aiResponseTime}</span>
                  
                  <div>Provider:</div>
                  <span className="text-purple-400">{quote._debug.aiProvider}</span>
                  
                  <div>Category:</div>
                  <span className="text-yellow-400">{quote._debug.category}</span>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* History */}
        {history.length > 1 && (
          <div className="mt-8">
            <h3 className="text-white font-semibold mb-4">Previous Quotes (this session)</h3>
            <div className="space-y-3">
              {history.slice(1).map((h, idx) => (
                <div key={idx} className="bg-slate-800/50 rounded-lg p-3 text-sm">
                  <p className="text-gray-300 italic mb-2">"{h.quote}"</p>
                  <p className="text-gray-500">— {h.author}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Instructions */}
        <div className="mt-8 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
          <h3 className="text-white font-semibold mb-2">📋 What this tests:</h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Gemini AI generates a random famous person + their real quote about growth</li>
            <li>• Each click generates a fresh quote (no caching for testing)</li>
            <li>• Debug info shows response time for performance analysis</li>
            <li>• Production endpoint caches one quote per day in the database</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
