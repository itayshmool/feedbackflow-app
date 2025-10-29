// frontend/src/types/profile.types.ts

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  department?: string;
  position?: string;
  phone?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: string;
  organizationName?: string;
  roles: UserRole[];
}

export interface UserRole {
  id: string;
  roleId: string;
  roleName: string;
  organizationId: string;
  organizationName: string;
  grantedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  department?: string;
  position?: string;
  phone?: string;
  bio?: string;
  location?: string;
  timezone?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  data: UserProfile;
}

export interface UploadAvatarRequest {
  file: File;
}

export interface UploadAvatarResponse {
  success: boolean;
  data: {
    avatarUrl: string;
  };
}

export interface ProfileStats {
  totalFeedbackGiven: number;
  totalFeedbackReceived: number;
  averageRating: number;
  totalGoals: number;
  completedGoals: number;
  activeCycles: number;
  completedCycles: number;
}
