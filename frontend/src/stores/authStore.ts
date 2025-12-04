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
  login: (email: string, password?: string) => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  updateUser: (user: Partial<User>) => void
}

// Helper to set token in API defaults
const setApiToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email: string, password?: string) => {
        console.log('[AuthStore] Login started for:', email)
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/login/mock', {
            email,
            password: password || 'password',
          })
          
          const { user, token } = response.data.data
          console.log('[AuthStore] Login successful for:', user.email)
          
          // Set token for future API requests
          setApiToken(token)
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          console.error('[AuthStore] Login failed:', error)
          set({ isLoading: false })
          throw error
        }
      },

      loginWithGoogle: async (idToken: string) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/login/google', {
            idToken,
          })
          
          const { user, token } = response.data.data
          console.log('[AuthStore] Google login successful for:', user.email)
          
          // Set token for future API requests
          setApiToken(token)
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          console.error('[AuthStore] Google login failed:', error)
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        console.log('[AuthStore] Logging out')
        try {
          await api.post('/auth/logout')
          console.log('[AuthStore] Logout successful')
        } catch (err) {
          console.error('[AuthStore] Logout error:', err)
        }
        
        // Clear token
        setApiToken(null)
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },

      checkAuth: async () => {
        console.log('[AuthStore] Checking auth status')
        const { token } = get()
        
        // If no token stored, not authenticated
        if (!token) {
          console.log('[AuthStore] No token found, not authenticated')
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
          return
        }
        
        // Ensure token is set in API headers
        setApiToken(token)
        
        set({ isLoading: true })
        try {
          const response = await api.get('/auth/me')
          const user = response.data.data
          console.log('[AuthStore] Auth check successful:', user.email)
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          console.log('[AuthStore] Auth check failed, clearing token')
          setApiToken(null)
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
          const updatedUser = { ...user, ...userData }
          set({ user: updatedUser })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)

// Restore token on module load (handles page refresh)
const storedState = useAuthStore.getState()
if (storedState.token) {
  setApiToken(storedState.token)
}
