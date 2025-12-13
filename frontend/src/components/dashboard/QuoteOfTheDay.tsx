import { useEffect, useState } from 'react';
import { Sparkles, Quote } from 'lucide-react';
import api from '../../lib/api';

interface QuoteData {
  quote: string;
  author: string;
  authorTitle: string;
}

export default function QuoteOfTheDay() {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await api.get('/quote-of-the-day');
        if (response.data.success) {
          setQuote(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch quote:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-indigo-900 rounded-xl p-4 sm:p-5 shadow-lg animate-pulse">
        <div className="h-3 bg-slate-600/50 rounded w-28 mb-3"></div>
        <div className="h-5 bg-slate-600/50 rounded w-full mb-2"></div>
        <div className="h-5 bg-slate-600/50 rounded w-3/4 mb-3"></div>
        <div className="h-3 bg-slate-600/50 rounded w-40"></div>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-slate-700 via-slate-800 to-indigo-900 rounded-xl p-4 sm:p-5 text-white shadow-lg">
      {/* Subtle decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
      
      <div className="relative">
        {/* Label */}
        <div className="flex items-center gap-1.5 text-indigo-300 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-xs font-medium uppercase tracking-wider">Today's Growth Quote</span>
        </div>
        
        {/* Quote */}
        <div className="flex gap-2 mb-3">
          <Quote className="w-5 h-5 text-indigo-400/40 flex-shrink-0 mt-0.5" />
          <blockquote className="text-base sm:text-lg font-light leading-relaxed text-white/90 italic">
            {quote.quote}
          </blockquote>
        </div>
        
        {/* Author & Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 
                          flex items-center justify-center text-sm font-bold ring-1 ring-white/20">
              {quote.author.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-white text-sm">{quote.author}</p>
              <p className="text-xs text-slate-400">{quote.authorTitle}</p>
            </div>
          </div>
          
          {/* Subtle tag */}
          <span className="text-[10px] text-slate-500 uppercase tracking-wider hidden sm:block">
            Powered by AI • New quote tomorrow
          </span>
        </div>
      </div>
    </div>
  );
}
