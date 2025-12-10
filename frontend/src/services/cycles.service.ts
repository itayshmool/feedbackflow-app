// frontend/src/services/cycles.service.ts

import { api } from '../lib/api';
import {
  Cycle,
  CreateCycleRequest,
  UpdateCycleRequest,
  CycleListResponse,
  CycleFilters,
  CycleSummary,
  CycleParticipant,
  CreateParticipantRequest
} from '../types/cycles.types';

class CyclesService {
  private baseUrl = '/cycles';

  async getCycles(filters?: CycleFilters, page = 1, limit = 20): Promise<CycleListResponse> {
    const params = new URLSearchParams();
    
    if (filters?.organizationId) params.append('organizationId', filters.organizationId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.createdBy) params.append('createdBy', filters.createdBy);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.get<{ success: boolean; data: { cycles: Cycle[]; pagination: any } }>(`${this.baseUrl}?${params.toString()}`);
    
    // Transform the API response to match CycleListResponse format
    return {
      cycles: response.data.data.cycles,
      total: response.data.data.pagination.total,
      page: response.data.data.pagination.page,
      limit: response.data.data.pagination.limit,
      hasNext: response.data.data.pagination.page < response.data.data.pagination.totalPages,
      hasPrev: response.data.data.pagination.page > 1,
    };
  }

  async getCycle(id: string): Promise<Cycle> {
    const response = await api.get<{success: boolean; data: Cycle}>(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  async createCycle(data: CreateCycleRequest): Promise<Cycle> {
    const response = await api.post<Cycle>(this.baseUrl, data);
    return response.data;
  }

  async updateCycle(id: string, data: UpdateCycleRequest): Promise<Cycle> {
    const response = await api.put<Cycle>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  async deleteCycle(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  async canDeleteCycle(id: string): Promise<{ canDelete: boolean; feedbackCount: number; requestCount: number; reason: string }> {
    const response = await api.get<{ success: boolean; data: { canDelete: boolean; feedbackCount: number; requestCount: number; reason: string } }>(`${this.baseUrl}/${id}/can-delete`);
    return response.data.data;
  }

  async activateCycle(id: string): Promise<Cycle> {
    const response = await api.post<Cycle>(`${this.baseUrl}/${id}/activate`);
    return response.data;
  }

  async closeCycle(id: string): Promise<Cycle> {
    const response = await api.post<Cycle>(`${this.baseUrl}/${id}/close`);
    return response.data;
  }

  async archiveCycle(id: string): Promise<Cycle> {
    const response = await api.post<{ success: boolean; data: Cycle }>(`${this.baseUrl}/${id}/archive`);
    return response.data.data;
  }

  async restoreCycle(id: string): Promise<Cycle> {
    const response = await api.post<{ success: boolean; data: Cycle }>(`${this.baseUrl}/${id}/restore`);
    return response.data.data;
  }

  async getCycleSummary(): Promise<CycleSummary> {
    const response = await api.get<CycleSummary>(`${this.baseUrl}/summary`);
    return response.data;
  }

  async getCycleParticipants(cycleId: string): Promise<CycleParticipant[]> {
    const response = await api.get<CycleParticipant[]>(`${this.baseUrl}/${cycleId}/participants`);
    return response.data;
  }

  async addCycleParticipants(cycleId: string, participants: CreateParticipantRequest[]): Promise<CycleParticipant[]> {
    const response = await api.post<CycleParticipant[]>(`${this.baseUrl}/${cycleId}/participants`, { participants });
    return response.data;
  }

  async removeCycleParticipant(cycleId: string, participantId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${cycleId}/participants/${participantId}`);
  }

  async validateFeedbackPermission(cycleId: string, fromUserId: string, toUserId: string, reviewType: string): Promise<boolean> {
    const response = await api.post<{ valid: boolean }>(`${this.baseUrl}/validate-feedback`, {
      cycleId,
      fromUserId,
      toUserId,
      reviewType
    });
    return response.data.valid;
  }
}

export const cyclesService = new CyclesService();
