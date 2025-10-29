// frontend/src/services/profile.service.ts

import api from './api';
import {
  UserProfile,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UploadAvatarRequest,
  UploadAvatarResponse,
  ProfileStats,
} from '../types/profile.types';

const BASE_URL = '/profile';

export const getProfile = async (): Promise<UserProfile> => {
  const response = await api.get<{ success: boolean; data: UserProfile }>(BASE_URL);
  return response.data.data;
};

export const updateProfile = async (data: UpdateProfileRequest): Promise<UpdateProfileResponse> => {
  const response = await api.put<UpdateProfileResponse>(BASE_URL, data);
  return response.data;
};

export const uploadAvatar = async (file: File): Promise<UploadAvatarResponse> => {
  const formData = new FormData();
  formData.append('avatar', file);
  
  const response = await api.post<UploadAvatarResponse>(`${BASE_URL}/avatar`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getProfileStats = async (): Promise<ProfileStats> => {
  const response = await api.get<{ success: boolean; data: ProfileStats }>(`${BASE_URL}/stats`);
  return response.data.data;
};
