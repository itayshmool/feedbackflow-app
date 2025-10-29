// frontend/src/components/ui/Autocomplete.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { userSearchService, UserSearchResult } from '../../services/userSearch.service';
import { LoadingSpinner } from './LoadingSpinner';
import { User, Mail, Building, Briefcase } from 'lucide-react';

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (user: UserSearchResult) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  organizationId?: string;
  className?: string;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = "Search users...",
  label,
  required = false,
  disabled = false,
  organizationId,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await userSearchService.searchUsers(query, organizationId);
      setSearchResults(response.data);
    } catch (err: any) {
      setError(err.message);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce search
    debounceRef.current = setTimeout(() => {
      searchUsers(newValue);
    }, 300);

    if (newValue.length >= 3) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setSearchResults([]);
    }
  };

  const handleSelect = (user: UserSearchResult) => {
    onChange(user.email);
    onSelect?.(user);
    setIsOpen(false);
    setSearchResults([]);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleSelect(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Use setTimeout to allow click events to fire first
    setTimeout(() => {
      // Don't close if clicking on dropdown
      if (dropdownRef.current?.contains(document.activeElement)) {
        return;
      }
      setIsOpen(false);
      setSelectedIndex(-1);
    }, 150);
  };

  const handleFocus = () => {
    if (value.length >= 3 && searchResults.length > 0) {
      setIsOpen(true);
    }
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const formatUserDisplay = (user: UserSearchResult) => {
    const parts = [];
    if (user.name) parts.push(user.name);
    if (user.department) parts.push(user.department);
    if (user.position) parts.push(user.position);
    
    return parts.length > 0 ? `${user.email} (${parts.join(' - ')})` : user.email;
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="email"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {searchResults.length === 0 && !isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              {value.length < 3 ? 'Type at least 3 characters to search' : 'No users found'}
            </div>
          ) : (
            searchResults.map((user, index) => (
              <div
                key={user.id}
                onClick={() => handleSelect(user)}
                className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                  index === selectedIndex ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name || user.email}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3 h-3 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.email}
                      </p>
                    </div>
                    
                    {user.name && (
                      <p className="text-sm text-gray-600 truncate">
                        {user.name}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-1">
                      {user.department && (
                        <div className="flex items-center space-x-1">
                          <Building className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{user.department}</span>
                        </div>
                      )}
                      
                      {user.position && (
                        <div className="flex items-center space-x-1">
                          <Briefcase className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{user.position}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
