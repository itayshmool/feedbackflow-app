// frontend/src/services/userSearch.service.ts

import api from '@/lib/api';

export interface UserSearchResult {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  department?: string;
  position?: string;
  isActive: boolean;
}

export interface UserSearchResponse {
  success: boolean;
  data: UserSearchResult[];
}

class UserSearchService {
  async searchUsers(query: string, organizationId?: string, limit: number = 10): Promise<UserSearchResponse> {
    if (!query || query.length < 3) {
      return { success: true, data: [] };
    }

    const params: any = {
      q: query,
      limit: limit.toString(),
    };
    
    if (organizationId) {
      params.organizationId = organizationId;
    }

    try {
      const response = await api.get<UserSearchResponse>('/users/search', { params });
      return response.data;
    } catch (error: any) {
      console.error('User search service error:', error);
      throw new Error(error.response?.data?.error || 'Failed to search users');
    }
  }
}

export const userSearchService = new UserSearchService();
