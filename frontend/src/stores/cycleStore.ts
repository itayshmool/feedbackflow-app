// frontend/src/stores/cycleStore.ts

import { create } from 'zustand';
import { api } from '../lib/api';

export interface FeedbackCycle {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
}

interface CycleState {
  cycles: FeedbackCycle[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchCycles: () => Promise<void>;
  clearError: () => void;
}

export const useCycleStore = create<CycleState>((set, get) => ({
  cycles: [],
  isLoading: false,
  error: null,
  
  fetchCycles: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/v1/cycles');
      set({ cycles: response.data.data || [], isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch cycles',
        isLoading: false 
      });
    }
  },
  
  clearError: () => {
    set({ error: null });
  }
}));




