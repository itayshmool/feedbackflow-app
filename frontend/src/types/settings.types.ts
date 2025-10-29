// frontend/src/types/settings.types.ts

export interface UserSettings {
  id: string;
  userId: string;
  
  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  feedbackNotifications: boolean;
  cycleNotifications: boolean;
  reminderNotifications: boolean;
  weeklyDigest: boolean;
  
  // Privacy Settings
  profileVisibility: 'public' | 'organization' | 'private';
  showEmail: boolean;
  showPhone: boolean;
  showDepartment: boolean;
  showPosition: boolean;
  
  // Application Settings
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  
  // Feedback Settings
  autoSaveDrafts: boolean;
  draftSaveInterval: number; // in minutes
  feedbackReminders: boolean;
  reminderFrequency: 'daily' | 'weekly' | 'monthly';
  
  // Security Settings
  twoFactorEnabled: boolean;
  sessionTimeout: number; // in minutes
  loginNotifications: boolean;
  
  // Data & Privacy
  dataRetention: number; // in months
  analyticsOptIn: boolean;
  marketingEmails: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingsRequest {
  // Notification Settings
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  feedbackNotifications?: boolean;
  cycleNotifications?: boolean;
  reminderNotifications?: boolean;
  weeklyDigest?: boolean;
  
  // Privacy Settings
  profileVisibility?: 'public' | 'organization' | 'private';
  showEmail?: boolean;
  showPhone?: boolean;
  showDepartment?: boolean;
  showPosition?: boolean;
  
  // Application Settings
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
  dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat?: '12h' | '24h';
  
  // Feedback Settings
  autoSaveDrafts?: boolean;
  draftSaveInterval?: number;
  feedbackReminders?: boolean;
  reminderFrequency?: 'daily' | 'weekly' | 'monthly';
  
  // Security Settings
  twoFactorEnabled?: boolean;
  sessionTimeout?: number;
  loginNotifications?: boolean;
  
  // Data & Privacy
  dataRetention?: number;
  analyticsOptIn?: boolean;
  marketingEmails?: boolean;
}

export interface UpdateSettingsResponse {
  success: boolean;
  data: UserSettings;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface ExportDataRequest {
  format: 'json' | 'csv' | 'pdf';
  includeFeedback: boolean;
  includeProfile: boolean;
  includeActivity: boolean;
}

export interface ExportDataResponse {
  success: boolean;
  downloadUrl: string;
  expiresAt: string;
}

export interface DeleteAccountRequest {
  password: string;
  reason?: string;
  confirmDeletion: boolean;
}

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
}
