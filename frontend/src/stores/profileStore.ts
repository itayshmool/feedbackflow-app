// frontend/src/stores/profileStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as profileService from '../services/profile.service';
import { UserProfile, UpdateProfileRequest, ProfileStats } from '../types/profile.types';
import { useAuthStore } from './authStore';

interface ProfileState {
  profile: UserProfile | null;
  stats: ProfileStats | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  
  // Actions
  fetchProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<boolean>;
  uploadAvatar: (file: File) => Promise<boolean>;
  fetchStats: () => Promise<void>;
  clearError: () => void;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      stats: null,
      isLoading: false,
      isUpdating: false,
      error: null,

      fetchProfile: async () => {
        set({ isLoading: true, error: null });
        try {
          const profile = await profileService.getProfile();
          set({ profile, isLoading: false });
        } catch (error: any) {
          // If unauthorized, clear auth state and redirect to login
          if (error.response?.status === 401) {
            const { logout } = useAuthStore.getState();
            logout();
            set({ 
              error: 'Session expired. Please log in again.', 
              isLoading: false 
            });
          } else {
            set({ 
              error: error.message || 'Failed to fetch profile', 
              isLoading: false 
            });
          }
        }
      },

      updateProfile: async (data: UpdateProfileRequest) => {
        set({ isUpdating: true, error: null });
        try {
          const response = await profileService.updateProfile(data);
          set({ 
            profile: response.data, 
            isUpdating: false 
          });
          return true;
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to update profile', 
            isUpdating: false 
          });
          return false;
        }
      },

      uploadAvatar: async (file: File) => {
        set({ isUpdating: true, error: null });
        try {
          const response = await profileService.uploadAvatar(file);
          const currentProfile = get().profile;
          if (currentProfile) {
            // Use avatarDataUrl (base64 data URL) for immediate display - no cross-origin issues
            // Fall back to avatarUrl (API endpoint) if data URL not available
            const newAvatarUrl = response.data.avatarDataUrl || response.data.avatarUrl;
            set({ 
              profile: { ...currentProfile, avatarUrl: newAvatarUrl },
              isUpdating: false 
            });
          }
          return true;
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to upload avatar', 
            isUpdating: false 
          });
          return false;
        }
      },

      fetchStats: async () => {
        set({ error: null });
        try {
          const stats = await profileService.getProfileStats();
          set({ stats });
        } catch (error: any) {
          set({ error: error.message || 'Failed to fetch profile stats' });
        }
      },

      clearError: () => set({ error: null }),
      clearProfile: () => set({ profile: null, stats: null }),
    }),
    {
      name: 'profile-storage',
      partialize: (state) => ({ 
        profile: state.profile,
        stats: state.stats 
      }),
    }
  )
);
