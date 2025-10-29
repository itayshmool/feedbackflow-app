import api from './api';
import axios from 'axios';

export interface Template {
  id: string;
  name: string;
  description?: string;
  template_type: 'manager' | 'peer' | 'self' | 'project' | '360';
  file_name: string;
  file_size: number;
  file_mime_type: string;
  file_format: '.docx' | '.pdf' | '.doc';
  download_count: number;
  is_active: boolean;
  is_default: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface UploadTemplateData {
  name: string;
  description?: string;
  templateType: 'manager' | 'peer' | 'self' | 'project' | '360';
  tags?: string[];
  isDefault?: boolean;
}

export const templatesService = {
  uploadTemplate: async (file: File, data: UploadTemplateData) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    });
    
    const response = await api.post('/templates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getTemplates: async (filters?: any) => {
    const response = await api.get('/templates', { params: filters });
    return response.data;
  },

  deleteTemplate: async (id: string) => {
    const response = await api.delete(`/templates/${id}`);
    return response.data;
  },

  downloadTemplate: async (id: string) => {
    const response = await api.get(`/templates/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
