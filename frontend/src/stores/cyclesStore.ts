// frontend/src/stores/cyclesStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cyclesService } from '../services/cycles.service';
import {
  Cycle,
  CreateCycleRequest,
  UpdateCycleRequest,
  CycleFilters,
  CycleSummary,
  CycleParticipant,
  CreateParticipantRequest
} from '../types/cycles.types';

interface CyclesState {
  // State
  cycles: Cycle[];
  currentCycle: Cycle | null;
  cycleParticipants: CycleParticipant[];
  cycleSummary: CycleSummary | null;
  filters: CycleFilters;
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isLoadingParticipants: boolean;
  isLoadingSummary: boolean;
  
  // Error states
  error: string | null;
  createError: string | null;
  updateError: string | null;
  deleteError: string | null;
  participantsError: string | null;
  summaryError: string | null;

  // Actions
  fetchCycles: (filters?: CycleFilters, page?: number, limit?: number) => Promise<void>;
  fetchCycle: (id: string) => Promise<void>;
  createCycle: (data: CreateCycleRequest) => Promise<Cycle | null>;
  updateCycle: (id: string, data: UpdateCycleRequest) => Promise<Cycle | null>;
  deleteCycle: (id: string) => Promise<boolean>;
  canDeleteCycle: (id: string) => Promise<{ canDelete: boolean; feedbackCount: number; requestCount: number; reason: string }>;
  activateCycle: (id: string) => Promise<Cycle | null>;
  closeCycle: (id: string) => Promise<Cycle | null>;
  archiveCycle: (id: string) => Promise<Cycle | null>;
  fetchCycleSummary: () => Promise<void>;
  fetchCycleParticipants: (cycleId: string) => Promise<void>;
  addCycleParticipants: (cycleId: string, participants: CreateParticipantRequest[]) => Promise<CycleParticipant[] | null>;
  removeCycleParticipant: (cycleId: string, participantId: string) => Promise<boolean>;
  
  // Filter and pagination actions
  setFilters: (filters: CycleFilters) => void;
  clearFilters: () => void;
  setPagination: (pagination: Partial<CyclesState['pagination']>) => void;
  
  // Error handling
  clearErrors: () => void;
  clearCreateError: () => void;
  clearUpdateError: () => void;
  clearDeleteError: () => void;
}

export const useCyclesStore = create<CyclesState>()(
  persist(
    (set, get) => ({
      // Initial state
      cycles: [],
      currentCycle: null,
      cycleParticipants: [],
      cycleSummary: null,
      filters: {},
      pagination: {
        total: 0,
        page: 1,
        limit: 20,
        hasNext: false,
        hasPrev: false,
      },
      
      isLoading: false,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isLoadingParticipants: false,
      isLoadingSummary: false,
      
      error: null,
      createError: null,
      updateError: null,
      deleteError: null,
      participantsError: null,
      summaryError: null,

      // Actions
      fetchCycles: async (filters?: CycleFilters, page = 1, limit = 20) => {
        set({ isLoading: true, error: null });
        try {
          const response = await cyclesService.getCycles(filters, page, limit);
          set({
            cycles: response.cycles,
            pagination: {
              total: response.total,
              page: response.page,
              limit: response.limit,
              hasNext: response.hasNext,
              hasPrev: response.hasPrev,
            },
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Failed to fetch cycles',
            isLoading: false,
          });
        }
      },

      fetchCycle: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const cycle = await cyclesService.getCycle(id);
          set({
            currentCycle: cycle,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Failed to fetch cycle',
            isLoading: false,
          });
        }
      },

      createCycle: async (data: CreateCycleRequest) => {
        set({ isCreating: true, createError: null });
        try {
          const newCycle = await cyclesService.createCycle(data);
          const currentCycles = get().cycles || [];
          set({
            cycles: [newCycle, ...currentCycles],
            isCreating: false,
          });
          return newCycle;
        } catch (error: any) {
          set({
            createError: error.message || 'Failed to create cycle',
            isCreating: false,
          });
          return null;
        }
      },

      updateCycle: async (id: string, data: UpdateCycleRequest) => {
        set({ isUpdating: true, updateError: null });
        try {
          const updatedCycle = await cyclesService.updateCycle(id, data);
          const currentCycles = get().cycles || [];
          set({
            cycles: currentCycles.map(cycle => 
              cycle.id === id ? updatedCycle : cycle
            ),
            currentCycle: get().currentCycle?.id === id ? updatedCycle : get().currentCycle,
            isUpdating: false,
          });
          return updatedCycle;
        } catch (error: any) {
          set({
            updateError: error.message || 'Failed to update cycle',
            isUpdating: false,
          });
          return null;
        }
      },

      deleteCycle: async (id: string) => {
        set({ isDeleting: true, deleteError: null });
        try {
          await cyclesService.deleteCycle(id);
          const currentCycles = get().cycles || [];
          set({
            cycles: currentCycles.filter(cycle => cycle.id !== id),
            currentCycle: get().currentCycle?.id === id ? null : get().currentCycle,
            isDeleting: false,
          });
          return true;
        } catch (error: any) {
          set({
            deleteError: error.message || 'Failed to delete cycle',
            isDeleting: false,
          });
          return false;
        }
      },

      canDeleteCycle: async (id: string) => {
        try {
          return await cyclesService.canDeleteCycle(id);
        } catch (error: any) {
          console.error('Error checking if cycle can be deleted:', error);
          return {
            canDelete: false,
            feedbackCount: 0,
            requestCount: 0,
            reason: 'Error checking deletion status'
          };
        }
      },

      activateCycle: async (id: string) => {
        set({ isUpdating: true, updateError: null });
        try {
          const updatedCycle = await cyclesService.activateCycle(id);
          const currentCycles = get().cycles || [];
          set({
            cycles: currentCycles.map(cycle => 
              cycle.id === id ? updatedCycle : cycle
            ),
            currentCycle: get().currentCycle?.id === id ? updatedCycle : get().currentCycle,
            isUpdating: false,
          });
          return updatedCycle;
        } catch (error: any) {
          set({
            updateError: error.message || 'Failed to activate cycle',
            isUpdating: false,
          });
          return null;
        }
      },

      closeCycle: async (id: string) => {
        set({ isUpdating: true, updateError: null });
        try {
          const updatedCycle = await cyclesService.closeCycle(id);
          const currentCycles = get().cycles || [];
          set({
            cycles: currentCycles.map(cycle => 
              cycle.id === id ? updatedCycle : cycle
            ),
            currentCycle: get().currentCycle?.id === id ? updatedCycle : get().currentCycle,
            isUpdating: false,
          });
          return updatedCycle;
        } catch (error: any) {
          set({
            updateError: error.message || 'Failed to close cycle',
            isUpdating: false,
          });
          return null;
        }
      },

      archiveCycle: async (id: string) => {
        set({ isUpdating: true, updateError: null });
        try {
          const updatedCycle = await cyclesService.archiveCycle(id);
          const currentCycles = get().cycles || [];
          set({
            cycles: currentCycles.map(cycle => 
              cycle.id === id ? updatedCycle : cycle
            ),
            currentCycle: get().currentCycle?.id === id ? updatedCycle : get().currentCycle,
            isUpdating: false,
          });
          return updatedCycle;
        } catch (error: any) {
          set({
            updateError: error.message || 'Failed to archive cycle',
            isUpdating: false,
          });
          return null;
        }
      },

      fetchCycleSummary: async () => {
        set({ isLoadingSummary: true, summaryError: null });
        try {
          const summary = await cyclesService.getCycleSummary();
          set({
            cycleSummary: summary,
            isLoadingSummary: false,
          });
        } catch (error: any) {
          set({
            summaryError: error.message || 'Failed to fetch cycle summary',
            isLoadingSummary: false,
          });
        }
      },

      fetchCycleParticipants: async (cycleId: string) => {
        set({ isLoadingParticipants: true, participantsError: null });
        try {
          const participants = await cyclesService.getCycleParticipants(cycleId);
          set({
            cycleParticipants: participants,
            isLoadingParticipants: false,
          });
        } catch (error: any) {
          set({
            participantsError: error.message || 'Failed to fetch cycle participants',
            isLoadingParticipants: false,
          });
        }
      },

      addCycleParticipants: async (cycleId: string, participants: CreateParticipantRequest[]) => {
        set({ isLoadingParticipants: true, participantsError: null });
        try {
          const newParticipants = await cyclesService.addCycleParticipants(cycleId, participants);
          const currentParticipants = get().cycleParticipants || [];
          set({
            cycleParticipants: [...currentParticipants, ...newParticipants],
            isLoadingParticipants: false,
          });
          return newParticipants;
        } catch (error: any) {
          set({
            participantsError: error.message || 'Failed to add cycle participants',
            isLoadingParticipants: false,
          });
          return null;
        }
      },

      removeCycleParticipant: async (cycleId: string, participantId: string) => {
        set({ isLoadingParticipants: true, participantsError: null });
        try {
          await cyclesService.removeCycleParticipant(cycleId, participantId);
          const currentParticipants = get().cycleParticipants || [];
          set({
            cycleParticipants: currentParticipants.filter(p => p.id !== participantId),
            isLoadingParticipants: false,
          });
          return true;
        } catch (error: any) {
          set({
            participantsError: error.message || 'Failed to remove cycle participant',
            isLoadingParticipants: false,
          });
          return false;
        }
      },

      // Filter and pagination actions
      setFilters: (filters: CycleFilters) => {
        set({ filters });
      },

      clearFilters: () => {
        set({ filters: {} });
      },

      setPagination: (pagination: Partial<CyclesState['pagination']>) => {
        set(state => ({
          pagination: { ...state.pagination, ...pagination }
        }));
      },

      // Error handling
      clearErrors: () => {
        set({
          error: null,
          createError: null,
          updateError: null,
          deleteError: null,
          participantsError: null,
          summaryError: null,
        });
      },

      clearCreateError: () => {
        set({ createError: null });
      },

      clearUpdateError: () => {
        set({ updateError: null });
      },

      clearDeleteError: () => {
        set({ deleteError: null });
      },
    }),
    {
      name: 'cycles-store',
      partialize: (state) => ({
        cycles: state.cycles,
        filters: state.filters,
        pagination: state.pagination,
      }),
    }
  )
);
