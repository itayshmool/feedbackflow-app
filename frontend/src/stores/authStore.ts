// frontend/src/stores/authStore.ts

import { create } from 'zustand'
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
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password?: string) => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
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
      
      const { user } = response.data
      console.log('[AuthStore] Login successful, cookie set by backend')
      
      set({
        user,
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
      
      const { user } = response.data
      console.log('[AuthStore] Google login successful, cookie set by backend')
      
      set({
        user,
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
      console.log('[AuthStore] Logout successful, cookie cleared')
    } catch (err) {
      console.error('[AuthStore] Logout error:', err)
    }
    
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },

  checkAuth: async () => {
    console.log('[AuthStore] Checking auth status')
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
      console.log('[AuthStore] Not authenticated')
      set({
        user: null,
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
}))
