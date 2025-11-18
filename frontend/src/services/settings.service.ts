// frontend/src/services/settings.service.ts

import { api } from '../lib/api';
import {
  UserSettings,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  ExportDataRequest,
  ExportDataResponse,
  DeleteAccountRequest,
  DeleteAccountResponse,
} from '../types/settings.types';

const BASE_URL = '/settings';

export const getSettings = async (): Promise<UserSettings> => {
  const response = await api.get<{ success: boolean; data: UserSettings }>(BASE_URL);
  return response.data.data;
};

export const updateSettings = async (data: UpdateSettingsRequest): Promise<UpdateSettingsResponse> => {
  const response = await api.put<UpdateSettingsResponse>(BASE_URL, data);
  return response.data;
};

export const changePassword = async (data: ChangePasswordRequest): Promise<ChangePasswordResponse> => {
  const response = await api.post<ChangePasswordResponse>(`${BASE_URL}/password`, data);
  return response.data;
};

export const exportData = async (data: ExportDataRequest): Promise<ExportDataResponse> => {
  const response = await api.post<ExportDataResponse>(`${BASE_URL}/export`, data);
  return response.data;
};

export const deleteAccount = async (data: DeleteAccountRequest): Promise<DeleteAccountResponse> => {
  const response = await api.post<DeleteAccountResponse>(`${BASE_URL}/delete-account`, data);
  return response.data;
};

export const resetSettings = async (): Promise<UpdateSettingsResponse> => {
  const response = await api.post<UpdateSettingsResponse>(`${BASE_URL}/reset`);
  return response.data;
};
