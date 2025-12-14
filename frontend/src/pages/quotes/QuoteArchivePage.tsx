// frontend/src/pages/quotes/QuoteArchivePage.tsx

import { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { 
  Search, 
  Sparkles, 
  Quote, 
  Calendar, 
  User, 
  Filter,
  X,
  ChevronDown,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import api from '../../lib/api';
import { formatDistanceToNow, format } from 'date-fns';

interface QuoteItem {
  id: string;
  quote: string;
  author: string;
  authorTitle: string;
  category: string;
  generatedDate: string;
  createdAt: string;
}

interface QuoteStats {
  totalQuotes: number;
  uniqueAuthors: number;
  oldestQuote: string | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export default function QuoteArchivePage() {
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [authors, setAuthors] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch quotes
  const fetchQuotes = useCallback(async (page = 1, append = false) => {
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (selectedAuthor) params.append('author', selectedAuthor);
      
      const response = await api.get(`/quotes/archive?${params.toString()}`);
      
      if (response.data.success) {
        if (append) {
          setQuotes(prev => [...prev, ...response.data.data.quotes]);
        } else {
          setQuotes(response.data.data.quotes);
        }
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, selectedAuthor]);

  // Fetch stats and authors on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [statsRes, authorsRes] = await Promise.all([
          api.get('/quotes/stats'),
          api.get('/quotes/authors')
        ]);
        
        if (statsRes.data.success) {
          setStats(statsRes.data.data);
        }
        if (authorsRes.data.success) {
          setAuthors(authorsRes.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      }
    };
    
    fetchInitialData();
  }, []);

  // Fetch quotes when filters change
  useEffect(() => {
    fetchQuotes(1);
  }, [fetchQuotes]);

  const handleLoadMore = () => {
    if (pagination && pagination.hasMore) {
      fetchQuotes(pagination.page + 1, true);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedAuthor('');
  };

  const hasActiveFilters = search || selectedAuthor;

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'entrepreneur': 'bg-orange-100 text-orange-700',
      'scientist': 'bg-blue-100 text-blue-700',
      'philosopher': 'bg-purple-100 text-purple-700',
      'athlete': 'bg-green-100 text-green-700',
      'leader': 'bg-red-100 text-red-700',
      'growth': 'bg-indigo-100 text-indigo-700',
    };
    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Mobile responsive */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                Growth Quotes
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Your personal collection of daily wisdom
              </p>
            </div>
            
            {/* Stats badges - hidden on very small screens */}
            {stats && (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-indigo-50 px-3 py-1.5 rounded-full">
                  <span className="text-xs sm:text-sm font-medium text-indigo-700">
                    {stats.totalQuotes} quotes
                  </span>
                </div>
                <div className="bg-purple-50 px-3 py-1.5 rounded-full hidden sm:block">
                  <span className="text-sm font-medium text-purple-700">
                    {stats.uniqueAuthors} authors
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-4xl mx-auto">
        {/* Search & Filters - Mobile responsive */}
        <Card className="mb-4 sm:mb-6">
          <div className="p-3 sm:p-4">
            {/* Search bar */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search quotes or authors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-gray-100' : ''}
              >
                <Filter className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilters && (
                  <span className="ml-1 w-2 h-2 bg-indigo-500 rounded-full" />
                )}
              </Button>
            </div>
            
            {/* Expandable filters */}
            {showFilters && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Filter by Author
                    </label>
                    <Select
                      value={selectedAuthor}
                      onChange={(e) => setSelectedAuthor(e.target.value)}
                      className="w-full"
                    >
                      <option value="">All authors</option>
                      {authors.map(author => (
                        <option key={author} value={author}>{author}</option>
                      ))}
                    </Select>
                  </div>
                  
                  {hasActiveFilters && (
                    <div className="flex items-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="text-gray-500"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Clear filters
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Results count */}
        {pagination && !loading && (
          <p className="text-sm text-gray-500 mb-4">
            {pagination.total === 0 
              ? 'No quotes found'
              : `Showing ${quotes.length} of ${pagination.total} quotes`
            }
          </p>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-500">Loading your quotes...</p>
          </div>
        ) : quotes.length === 0 ? (
          /* Empty state */
          <Card className="p-8 sm:p-12 text-center">
            <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {hasActiveFilters ? 'No matching quotes' : 'No quotes yet'}
            </h3>
            <p className="text-gray-500 text-sm sm:text-base">
              {hasActiveFilters 
                ? 'Try adjusting your search or filters'
                : 'Check back tomorrow for your first growth quote!'
              }
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="mt-4"
              >
                Clear filters
              </Button>
            )}
          </Card>
        ) : (
          /* Quotes list */
          <div className="space-y-3 sm:space-y-4">
            {quotes.map((quote) => (
              <Card 
                key={quote.id} 
                className="p-4 sm:p-5 hover:shadow-md transition-shadow"
              >
                {/* Quote content */}
                <div className="flex gap-2 sm:gap-3 mb-3">
                  <Quote className="w-5 h-5 text-indigo-400/60 flex-shrink-0 mt-0.5" />
                  <blockquote className="text-sm sm:text-base text-gray-800 italic leading-relaxed">
                    "{quote.quote}"
                  </blockquote>
                </div>
                
                {/* Author & metadata */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {quote.author.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {quote.author}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {quote.authorTitle}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-400 ml-10 sm:ml-0">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(quote.generatedDate), 'MMM d, yyyy')}</span>
                    {quote.category && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(quote.category)}`}>
                        {quote.category}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            
            {/* Load more button */}
            {pagination && pagination.hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full sm:w-auto"
                >
                  {loadingMore ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Load more quotes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

