// frontend/src/stores/authStore.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

export interface User {
  id: string
  email: string
  name: string
  picture?: string
  roles: string[]
  organizationId: string
  organizationName?: string
  department?: string
  position?: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  hasHydrated: boolean
  login: (email: string, password?: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true, // Start with loading true to handle hydration
      isAuthenticated: false,
      hasHydrated: false,

      login: async (email: string, password?: string) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/login/mock', {
            email,
            password: password || 'password', // Use provided password or default
          })
          
          // Handle the nested response structure from our backend
          const { token, user } = response.data.data
          
          // Set token in API client
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        // Clear token from API client
        delete api.defaults.headers.common['Authorization']
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      checkAuth: async () => {
        const { token, user, isAuthenticated } = get()
        
        // If we already have valid auth data, don't re-verify
        if (token && user && isAuthenticated) {
          set({ isLoading: false })
          return
        }
        
        if (!token) {
          set({ isLoading: false })
          return
        }

        set({ isLoading: true })
        try {
          // Set token in API client
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          // Verify token by getting user profile
          const response = await api.get('/auth/me')
          const user = response.data.data
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          // Token is invalid, clear auth state
          delete api.defaults.headers.common['Authorization']
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      updateUser: (userData: Partial<User>) => {
        const { user } = get()
        if (user) {
          set({
            user: { ...user, ...userData },
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        hasHydrated: state.hasHydrated,
      }),
      onRehydrateStorage: () => (state) => {
        // Set loading to false after hydration and restore token
        if (state) {
          state.isLoading = false
          state.hasHydrated = true
          if (state.token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
          }
        }
      },
    }
  )
)
