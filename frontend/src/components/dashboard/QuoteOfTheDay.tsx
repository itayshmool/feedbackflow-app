import { useEffect, useState } from 'react';
import { Sparkles, Quote, RefreshCw } from 'lucide-react';
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
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 rounded-2xl p-5 sm:p-6 shadow-xl">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
            <div className="h-3 bg-slate-600/50 rounded w-32"></div>
          </div>
          <div className="h-5 bg-slate-600/30 rounded w-full mb-2"></div>
          <div className="h-5 bg-slate-600/30 rounded w-4/5 mb-2"></div>
          <div className="h-5 bg-slate-600/30 rounded w-2/3 mb-4"></div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-600/50"></div>
            <div className="space-y-1">
              <div className="h-3 bg-slate-600/50 rounded w-24"></div>
              <div className="h-2 bg-slate-600/30 rounded w-20"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-xl group hover:shadow-2xl transition-all duration-300">
      {/* Decorative gradient orbs */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all duration-500" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-500/15 rounded-full blur-3xl group-hover:bg-purple-500/25 transition-all duration-500" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
      
      <div className="relative">
        {/* Label with sparkle animation */}
        <div className="flex items-center gap-2 text-indigo-300 mb-3">
          <div className="p-1.5 bg-indigo-500/20 rounded-lg">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider">Daily Growth Quote</span>
        </div>
        
        {/* Quote with better typography */}
        <div className="flex gap-3 mb-4">
          <Quote className="w-6 h-6 text-indigo-400/30 flex-shrink-0 mt-1" />
          <blockquote className="text-base sm:text-lg md:text-xl font-light leading-relaxed text-white/95">
            <span className="italic">{quote.quote}</span>
          </blockquote>
        </div>
        
        {/* Author & Footer - Enhanced */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 
                          flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-white/20">
              {quote.author.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{quote.author}</p>
              <p className="text-xs text-slate-400">{quote.authorTitle}</p>
            </div>
          </div>
          
          {/* Subtle badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-full border border-white/10">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="text-[10px] text-slate-400 font-medium">AI-Powered</span>
          </div>
        </div>
      </div>
    </div>
  );
}
