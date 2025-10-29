// frontend/src/stores/settingsStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as settingsService from '../services/settings.service';
import { UserSettings, UpdateSettingsRequest } from '../types/settings.types';

interface SettingsState {
  settings: UserSettings | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  
  // Actions
  fetchSettings: () => Promise<void>;
  updateSettings: (data: UpdateSettingsRequest) => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
  clearError: () => void;
  clearSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: null,
      isLoading: false,
      isUpdating: false,
      error: null,

      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const settings = await settingsService.getSettings();
          set({ settings, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to fetch settings', 
            isLoading: false 
          });
        }
      },

      updateSettings: async (data: UpdateSettingsRequest) => {
        set({ isUpdating: true, error: null });
        try {
          const response = await settingsService.updateSettings(data);
          set({ 
            settings: response.data, 
            isUpdating: false 
          });
          return true;
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to update settings', 
            isUpdating: false 
          });
          return false;
        }
      },

      resetSettings: async () => {
        set({ isUpdating: true, error: null });
        try {
          const response = await settingsService.resetSettings();
          set({ 
            settings: response.data, 
            isUpdating: false 
          });
          return true;
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to reset settings', 
            isUpdating: false 
          });
          return false;
        }
      },

      clearError: () => set({ error: null }),
      clearSettings: () => set({ settings: null }),
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({ 
        settings: state.settings
      }),
    }
  )
);
