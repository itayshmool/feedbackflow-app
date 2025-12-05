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
    const storedAuth = localStorage.getItem('auth-storage')
    if (storedAuth) {
      try {
        const { state } = JSON.parse(storedAuth)
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`
        }
      } catch (e) {
        console.error('[API] Failed to parse auth token from storage')
      }
    }
    console.log('[API] Request to', config.url)
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
          toast.error('You do not have permission to perform this action.')
          break
          
        case 404:
          toast.error('Resource not found.')
          break
          
        case 422:
          // Validation errors
          if (data.errors) {
            Object.values(data.errors).forEach((error: any) => {
              toast.error(error[0] || 'Validation error')
            })
          } else {
            toast.error(data.message || 'Validation error')
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

export default api
