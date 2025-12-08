// frontend/src/lib/api.ts

import axios from 'axios'
import toast from 'react-hot-toast'

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
  (config) => {
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
    
    console.log('[API] Request to', config.url, '- Auth:', token ? 'present' : 'missing')
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const { response } = error
    
    if (response) {
      const { status, data } = response
      
      switch (status) {
        case 401:
          // Unauthorized - cookie expired or invalid
          // Only redirect if not already on login page to prevent loops
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login'
            toast.error('Session expired. Please login again.')
          }
          break
          
        case 403:
          // Extract specific permission error from backend (e.g., privilege escalation, role restrictions)
          toast.error(data.error || data.message || 'You do not have permission to perform this action.')
          break
          
        case 404:
          // Extract specific not found message from backend (e.g., "User not found", "Cycle not found")
          toast.error(data.error || data.message || 'Resource not found.')
          break
          
        case 422:
          // Validation errors - check multiple formats
          if (data.errors) {
            Object.values(data.errors).forEach((error: any) => {
              toast.error(error[0] || 'Validation error')
            })
          } else {
            toast.error(data.error || data.message || 'Validation error')
          }
          break
          
        case 429:
          toast.error('Too many requests. Please try again later.')
          break
          
        case 500:
          toast.error('Server error. Please try again later.')
          break
          
        default:
          toast.error(data.message || 'An error occurred')
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
  // Auth
  auth: {
    login: '/auth/login/mock',
    me: '/auth/me',
    refresh: '/auth/refresh',
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

export default api
