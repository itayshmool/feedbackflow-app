// Theme Toggle Component - Beautiful animated dark/light mode switch

import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore, Theme } from '@/stores/themeStore';
import { useState, useRef, useEffect } from 'react';

interface ThemeToggleProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({ showLabel = false, size = 'md' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const currentIcon = resolvedTheme === 'dark' ? Moon : Sun;
  const CurrentIcon = currentIcon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${sizeClasses[size]}
          flex items-center justify-center rounded-full
          bg-gray-100 dark:bg-gray-800
          hover:bg-gray-200 dark:hover:bg-gray-700
          text-gray-700 dark:text-gray-300
          transition-all duration-200 ease-in-out
          hover:scale-105 active:scale-95
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
          dark:focus:ring-offset-gray-900
        `}
        aria-label="Toggle theme"
      >
        <CurrentIcon 
          className={`${iconSizes[size]} transition-transform duration-300 ${
            resolvedTheme === 'dark' ? 'rotate-0' : 'rotate-0'
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="
          absolute right-0 mt-2 w-36
          bg-white dark:bg-gray-800
          rounded-lg shadow-lg
          border border-gray-200 dark:border-gray-700
          py-1 z-50
          animate-fade-in-down
        ">
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => {
                setTheme(value);
                setIsOpen(false);
              }}
              className={`
                w-full px-3 py-2 text-left text-sm
                flex items-center gap-3
                transition-colors duration-150
                ${theme === value 
                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {theme === value && (
                <span className="ml-auto text-purple-600 dark:text-purple-400">✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      {showLabel && (
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          {theme === 'system' ? 'System' : resolvedTheme === 'dark' ? 'Dark' : 'Light'}
        </span>
      )}
    </div>
  );
}

// Simple toggle button (just light/dark, no system option)
export function ThemeToggleSimple({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { resolvedTheme, toggleTheme } = useThemeStore();

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center rounded-full
        bg-gray-100 dark:bg-gray-800
        hover:bg-gray-200 dark:hover:bg-gray-700
        text-gray-700 dark:text-gray-300
        transition-all duration-200 ease-in-out
        hover:scale-105 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
        dark:focus:ring-offset-gray-900
      `}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div className="relative">
        <Sun 
          className={`
            ${iconSizes[size]} 
            absolute inset-0
            transition-all duration-300
            ${resolvedTheme === 'dark' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}
          `} 
        />
        <Moon 
          className={`
            ${iconSizes[size]}
            transition-all duration-300
            ${resolvedTheme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}
          `} 
        />
      </div>
    </button>
  );
}

export default ThemeToggle;

