// frontend/src/lib/api.ts

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import toast from 'react-hot-toast'

// Extend AxiosRequestConfig to track retry state
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
  _csrfRetry?: boolean; // Track if we've already retried after CSRF refresh
}

// Track if we're currently refreshing to prevent multiple simultaneous refresh calls
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (error?: unknown) => void
}> = []

const processQueue = (error: Error | null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

// CSRF Token Management
const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'X-CSRF-Token'

/**
 * Read CSRF token from cookie
 * The server sets this as a non-httpOnly cookie so JavaScript can read it
 */
function getCsrfTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === CSRF_COOKIE_NAME) {
      return decodeURIComponent(value)
    }
  }
  return null
}

/**
 * Fetch a fresh CSRF token from the server
 * Call this if the CSRF cookie is missing (e.g., after page reload)
 */
async function fetchCsrfToken(): Promise<string | null> {
  try {
    // Use a basic fetch to avoid interceptor loops
    const response = await fetch(
      (import.meta.env.VITE_API_URL || '/api/v1') + '/csrf-token',
      { credentials: 'include' }
    )
    if (response.ok) {
      const data = await response.json()
      console.log('[CSRF] Fetched new token from server')
      return data.csrfToken
    }
  } catch (e) {
    console.error('[CSRF] Failed to fetch token:', e)
  }
  return null
}

/**
 * Get CSRF token, fetching from server if not in cookie
 */
async function ensureCsrfToken(): Promise<string | null> {
  let token = getCsrfTokenFromCookie()
  if (!token) {
    token = await fetchCsrfToken()
  }
  return token
}

// Create axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with all requests
})

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Get token from localStorage (persisted by zustand)
    // This ensures token is included even on initial page load before store hydrates
    let token: string | null = null
    
    // First check if token is already set in defaults (from authStore.setApiToken)
    const existingAuth = api.defaults.headers.common['Authorization']
    if (existingAuth && typeof existingAuth === 'string' && existingAuth.startsWith('Bearer ')) {
      token = existingAuth.slice(7)
    }
    
    // If no token in defaults, try localStorage
    if (!token) {
      const storedAuth = localStorage.getItem('auth-storage')
      if (storedAuth) {
        try {
          const parsed = JSON.parse(storedAuth)
          // Handle both zustand persist formats: { state: { token } } or direct { token }
          token = parsed?.state?.token || parsed?.token || null
        } catch (e) {
          console.error('[API] Failed to parse auth token from storage:', e)
        }
      }
    }
    
    // Set the Authorization header if we have a token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      console.warn('[API] No auth token available for request to:', config.url)
    }
    
    // Add CSRF token for state-changing requests (POST, PUT, DELETE, PATCH)
    const method = config.method?.toUpperCase()
    if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      // Skip CSRF for login endpoints (no token exists yet)
      const isLoginEndpoint = config.url?.includes('/auth/login') || 
                              config.url?.includes('/auth/register')
      
      if (!isLoginEndpoint) {
        const csrfToken = getCsrfTokenFromCookie()
        if (csrfToken) {
          config.headers[CSRF_HEADER_NAME] = csrfToken
          console.log('[API] Added CSRF token to request')
        } else {
          console.warn('[API] No CSRF token available for state-changing request to:', config.url)
        }
      }
    }
    
    console.log('[API] Request to', config.url, '- Auth:', token ? 'present' : 'missing')
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor with automatic token refresh
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig
    const response = error.response
    
    if (response) {
      const { status, data } = response as { status: number; data: any }
      
      // Handle 401 - try to refresh token
      if (status === 401 && originalRequest && !originalRequest._retry) {
        // Don't retry refresh endpoint itself or login endpoints
        const isAuthEndpoint = originalRequest.url?.includes('/auth/refresh') || 
                               originalRequest.url?.includes('/auth/login') ||
                               originalRequest.url?.includes('/auth/logout')
        
        if (isAuthEndpoint) {
          // Auth endpoint failed - redirect to login
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login'
            toast.error('Session expired. Please login again.')
          }
          return Promise.reject(error)
        }

        // Check if we're already refreshing
        if (isRefreshing) {
          // Wait for the refresh to complete
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })
            .then(() => {
              // Retry the original request after refresh completes
              return api(originalRequest)
            })
            .catch(err => {
              return Promise.reject(err)
            })
        }

        originalRequest._retry = true
        isRefreshing = true

        console.log('[API] Access token expired, attempting refresh...')

        try {
          // Attempt to refresh the token
          await api.post('/auth/refresh')
          console.log('[API] Token refreshed successfully')
          
          // Process queued requests
          processQueue(null)
          
          // Retry the original request
          return api(originalRequest)
        } catch (refreshError) {
          console.log('[API] Token refresh failed, redirecting to login')
          processQueue(refreshError as Error)
          
          // Refresh failed - redirect to login
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login'
            toast.error('Session expired. Please login again.')
          }
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }
      
      // Helper to extract error message from various backend response formats
      // Backend can return: { error: 'string' } OR { error: { message: 'string' } } OR { message: 'string' }
      const getErrorMessage = (responseData: any, fallback: string): string => {
        if (!responseData) return fallback
        if (typeof responseData.error === 'string') return responseData.error
        if (responseData.error?.message) return responseData.error.message
        if (responseData.message) return responseData.message
        return fallback
      }

      // Handle other error codes
      switch (status) {
        case 401:
          // Already handled above, this is for cases where retry already happened
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login'
            toast.error('Session expired. Please login again.')
          }
          break
          
        case 403:
          // Check if it's a CSRF error - try to refresh token and retry
          if ((data.error === 'CSRF token missing' || data.error === 'CSRF token invalid') 
              && originalRequest && !originalRequest._csrfRetry) {
            originalRequest._csrfRetry = true
            console.log('[API] CSRF error, attempting to refresh token...')
            
            const newToken = await fetchCsrfToken()
            if (newToken) {
              // Retry the request with the new token
              originalRequest.headers[CSRF_HEADER_NAME] = newToken
              return api(originalRequest)
            }
            
            // If we couldn't get a new token, show error and suggest refresh
            toast.error('Security token expired. Please refresh the page.')
            break
          }
          
          // Extract specific permission error from backend (e.g., privilege escalation, role restrictions)
          toast.error(getErrorMessage(data, 'You do not have permission to perform this action.'))
          break
          
        case 404:
          // Extract specific not found message from backend (e.g., "User not found", "Cycle not found")
          toast.error(getErrorMessage(data, 'The requested resource was not found.'))
          break
          
        case 422:
          // Validation errors - check multiple formats
          if (data.errors) {
            Object.values(data.errors).forEach((error: any) => {
              toast.error(error[0] || 'Validation error')
            })
          } else {
            toast.error(getErrorMessage(data, 'Validation error. Please check your input.'))
          }
          break
          
        case 409:
          // Conflict (e.g., duplicate resource) - show the backend message which is usually very specific
          toast.error(getErrorMessage(data, 'A conflict occurred. The resource may already exist.'))
          break

        case 429:
          toast.error('Too many requests. Please try again later.')
          break
          
        case 500:
          toast.error('Server error. Please try again later.')
          break
          
        default:
          // Don't show toast for unhandled status codes - let the component handle it
          console.warn('Unhandled API error:', status, data)
      }
    } else if (error.request) {
      // Network error
      toast.error('Network error. Please check your connection.')
    } else {
      // Other error
      toast.error('An unexpected error occurred')
    }
    
    return Promise.reject(error)
  }
)

// API endpoints
export const endpoints = {
  // CSRF
  csrf: {
    token: '/csrf-token',
  },
  
  // Auth
  auth: {
    login: '/auth/login/mock',
    me: '/auth/me',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
  },
  
  // Cycles
  cycles: {
    list: '/cycles',
    create: '/cycles',
    get: (id: string) => `/cycles/${id}`,
    update: (id: string) => `/cycles/${id}`,
    delete: (id: string) => `/cycles/${id}`,
    activate: (id: string) => `/cycles/${id}/activate`,
    close: (id: string) => `/cycles/${id}/close`,
  },
  
  // Feedback
  feedback: {
    list: '/feedback',
    create: '/feedback',
    get: (id: string) => `/feedback/${id}`,
    update: (id: string) => `/feedback/${id}`,
    delete: (id: string) => `/feedback/${id}`,
    submit: (id: string) => `/feedback/${id}/submit`,
    acknowledge: (id: string) => `/feedback/${id}/acknowledge`,
  },
  
  // Analytics
  analytics: {
    metrics: '/analytics/metrics',
    dashboards: '/analytics/dashboards',
    reports: '/analytics/reports',
  },
  
  // Admin
  admin: {
    users: '/admin/users',
    organizations: '/admin/organizations',
    system: '/admin/system',
  },
  
  // Integrations
  integrations: {
    webhooks: '/integrations/webhooks',
    slack: '/integrations/slack',
  },
  
  // Notifications
  notifications: {
    list: '/notifications',
    markRead: (id: string) => `/notifications/${id}/read`,
    preferences: '/notifications/preferences',
  },
} as const

// Helper functions
export const apiHelpers = {
  // Generic CRUD operations
  create: <T>(endpoint: string, data: any): Promise<T> =>
    api.post(endpoint, data).then(res => res.data),
    
  read: <T>(endpoint: string): Promise<T> =>
    api.get(endpoint).then(res => res.data),
    
  update: <T>(endpoint: string, data: any): Promise<T> =>
    api.put(endpoint, data).then(res => res.data),
    
  delete: (endpoint: string): Promise<void> =>
    api.delete(endpoint).then(() => undefined),
    
  // Pagination helper
  paginated: <T>(endpoint: string, params?: any): Promise<{
    data: T[]
    total: number
    page: number
    limit: number
    hasNext: boolean
    hasPrev: boolean
  }> =>
    api.get(endpoint, { params }).then(res => res.data),
}

// Initialize token from localStorage on module load
// This ensures the token is set even before React components mount
try {
  const storedAuth = localStorage.getItem('auth-storage')
  if (storedAuth) {
    const parsed = JSON.parse(storedAuth)
    const token = parsed?.state?.token || parsed?.token
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      console.log('[API] Initialized auth token from localStorage')
    }
  }
} catch (e) {
  console.error('[API] Failed to initialize auth token:', e)
}

// CSRF Token utilities
export const csrfUtils = {
  /**
   * Get the current CSRF token from cookie
   */
  getToken: getCsrfTokenFromCookie,
  
  /**
   * Fetch a fresh CSRF token from the server
   * Useful after login or if the token is missing
   */
  fetchToken: fetchCsrfToken,
  
  /**
   * Ensure a CSRF token exists, fetching if necessary
   */
  ensureToken: ensureCsrfToken,
}

export default api
