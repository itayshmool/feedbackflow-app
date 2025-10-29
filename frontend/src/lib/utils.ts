// frontend/src/lib/utils.ts

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistance, formatRelative, isValid, parseISO } from 'date-fns'

// Utility function to merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date formatting utilities
export const dateUtils = {
  format: (date: string | Date, formatStr: string = 'PPP') => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isValid(dateObj) ? format(dateObj, formatStr) : 'Invalid date'
  },
  
  formatRelative: (date: string | Date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isValid(dateObj) ? formatRelative(dateObj, new Date()) : 'Invalid date'
  },
  
  formatDistance: (date: string | Date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isValid(dateObj) ? formatDistance(dateObj, new Date(), { addSuffix: true }) : 'Invalid date'
  },
  
  isToday: (date: string | Date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const today = new Date()
    return isValid(dateObj) && 
           dateObj.getDate() === today.getDate() &&
           dateObj.getMonth() === today.getMonth() &&
           dateObj.getFullYear() === today.getFullYear()
  },
  
  isPast: (date: string | Date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isValid(dateObj) && dateObj < new Date()
  },
  
  isFuture: (date: string | Date) => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isValid(dateObj) && dateObj > new Date()
  },
}

// String utilities
export const stringUtils = {
  truncate: (str: string, length: number) => {
    return str.length > length ? str.substring(0, length) + '...' : str
  },
  
  capitalize: (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  },
  
  camelToTitle: (str: string) => {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  },
  
  slugify: (str: string) => {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  },
}

// Number utilities
export const numberUtils = {
  format: (num: number, decimals: number = 0) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num)
  },
  
  formatCurrency: (num: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(num)
  },
  
  formatPercent: (num: number, decimals: number = 1) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num / 100)
  },
}

// Array utilities
export const arrayUtils = {
  groupBy: <T>(array: T[], key: keyof T) => {
    return array.reduce((groups, item) => {
      const group = String(item[key])
      groups[group] = groups[group] || []
      groups[group].push(item)
      return groups
    }, {} as Record<string, T[]>)
  },
  
  sortBy: <T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc') => {
    return [...array].sort((a, b) => {
      const aVal = a[key]
      const bVal = b[key]
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1
      if (aVal > bVal) return direction === 'asc' ? 1 : -1
      return 0
    })
  },
  
  unique: <T>(array: T[]) => {
    return [...new Set(array)]
  },
  
  chunk: <T>(array: T[], size: number) => {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  },
}

// Object utilities
export const objectUtils = {
  pick: <T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Pick<T, K> => {
    const result = {} as Pick<T, K>
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key]
      }
    })
    return result
  },
  
  omit: <T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Omit<T, K> => {
    const result = { ...obj }
    keys.forEach(key => {
      delete result[key]
    })
    return result
  },
  
  isEmpty: (obj: any) => {
    if (obj == null) return true
    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0
    if (typeof obj === 'object') return Object.keys(obj).length === 0
    return false
  },
}

// Validation utilities
export const validationUtils = {
  email: (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },
  
  url: (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  },
  
  phone: (phone: string) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
  },
}

// Storage utilities
export const storageUtils = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue || null
    } catch {
      return defaultValue || null
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Error removing from localStorage:', error)
    }
  },
  
  clear: (): void => {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
  },
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Copy to clipboard utility
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

// Download utility
export function downloadFile(data: string, filename: string, type: string = 'text/plain') {
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
