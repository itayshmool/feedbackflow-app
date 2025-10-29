// frontend/src/lib/api.ts

import axios from 'axios'
import toast from 'react-hot-toast'

// Create axios instance
export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    try {
      const token = localStorage.getItem('auth-storage')
      console.log('[API] localStorage auth-storage:', token ? 'exists' : 'missing')
      if (token) {
        const authData = JSON.parse(token)
        console.log('[API] authData:', authData)
        // Check both possible token locations (Zustand persist structure)
        const authToken = authData.state?.token || authData.token
        console.log('[API] authToken:', authToken ? 'exists' : 'missing')
        if (authToken) {
          config.headers.Authorization = `Bearer ${authToken}`
          console.log('[API] Set Authorization header:', config.headers.Authorization)
        }
      }
    } catch (error) {
      console.error('Error parsing auth token:', error)
      // Don't fail the request if token parsing fails
    }
    
    // Also check if token is already set in defaults (from auth store)
    if (api.defaults.headers.common['Authorization']) {
      config.headers.Authorization = api.defaults.headers.common['Authorization']
      console.log('[API] Using default Authorization header:', config.headers.Authorization)
    }
    
    console.log('[API] Final request config:', config.url, 'Headers:', config.headers.Authorization ? 'Has Auth' : 'No Auth')
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
          // Unauthorized - clear auth and redirect to login
          localStorage.removeItem('auth-storage')
          window.location.href = '/login'
          toast.error('Session expired. Please login again.')
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
