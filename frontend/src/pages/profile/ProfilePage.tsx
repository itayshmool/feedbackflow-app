// frontend/src/pages/profile/ProfilePage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { 
  User, 
  Mail, 
  Building, 
  Briefcase, 
  Phone, 
  MapPin, 
  Clock, 
  Edit3, 
  Save, 
  X, 
  Camera,
  Upload,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuthStore();
  const { 
    profile, 
    stats, 
    isLoading, 
    isUpdating, 
    error, 
    fetchProfile, 
    updateProfile, 
    uploadAvatar, 
    fetchStats, 
    clearError 
  } = useProfileStore();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    position: '',
    phone: '',
    bio: '',
    location: '',
    timezone: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && !authLoading) {
      fetchProfile();
      fetchStats();
    }
  }, [user, authLoading, fetchProfile, fetchStats]);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        department: profile.department || '',
        position: profile.position || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        location: profile.location || '',
        timezone: profile.timezone || '',
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const success = await updateProfile(formData);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        department: profile.department || '',
        position: profile.position || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        location: profile.location || '',
        timezone: profile.timezone || '',
      });
    }
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (avatarFile) {
      const success = await uploadAvatar(avatarFile);
      if (success) {
        setAvatarFile(null);
        setAvatarPreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleAvatarCancel = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No profile found</h3>
        <p className="mt-1 text-sm text-gray-500">Unable to load your profile information.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header - Mobile responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your personal information and settings</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} icon={Edit3} className="w-full sm:w-auto">
            Edit Profile
          </Button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-800">{error}</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearError}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture and Basic Info */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="text-center">
              {/* Avatar */}
              <div className="relative inline-block">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 mx-auto mb-4">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Avatar Upload Controls */}
                {isEditing && (
                  <div className="absolute bottom-0 right-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-full p-2"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Avatar Upload Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />

              {/* Avatar Upload Actions */}
              {avatarFile && (
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">New avatar selected</p>
                  <div className="flex space-x-2 justify-center">
                    <Button
                      size="sm"
                      onClick={handleAvatarUpload}
                      disabled={isUpdating}
                      icon={Upload}
                    >
                      Upload
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAvatarCancel}
                      icon={X}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {isEditing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Full name"
                    className="text-center text-xl font-semibold"
                  />
                ) : (
                  profile.name
                )}
              </h2>
              
              <p className="text-gray-600 mb-4">{profile.email}</p>
              
              {profile.organizationName && (
                <div className="flex items-center justify-center text-sm text-gray-500 mb-2">
                  <Building className="h-4 w-4 mr-1" />
                  {profile.organizationName}
                </div>
              )}

              {/* Status */}
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600">Active</span>
                </div>
                {profile.emailVerified && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-blue-600">Verified</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Stats Card */}
          {stats && (
            <Card className="p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Activity Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Feedback Given</span>
                  <span className="font-medium">{stats.totalFeedbackGiven}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Feedback Received</span>
                  <span className="font-medium">{stats.totalFeedbackReceived}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Goals</span>
                  <span className="font-medium">{stats.completedGoals}/{stats.totalGoals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Cycles</span>
                  <span className="font-medium">{stats.activeCycles}</span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Detailed Information */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building className="inline h-4 w-4 mr-1" />
                  Department
                </label>
                {isEditing ? (
                  <Input
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    placeholder="Department"
                  />
                ) : (
                  <p className="text-gray-900">{profile.department || 'Not specified'}</p>
                )}
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Briefcase className="inline h-4 w-4 mr-1" />
                  Position
                </label>
                {isEditing ? (
                  <Input
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    placeholder="Position"
                  />
                ) : (
                  <p className="text-gray-900">{profile.position || 'Not specified'}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="inline h-4 w-4 mr-1" />
                  Phone
                </label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Phone number"
                  />
                ) : (
                  <p className="text-gray-900">{profile.phone || 'Not specified'}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Location
                </label>
                {isEditing ? (
                  <Input
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Location"
                  />
                ) : (
                  <p className="text-gray-900">{profile.location || 'Not specified'}</p>
                )}
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Timezone
                </label>
                {isEditing ? (
                  <Input
                    value={formData.timezone}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                    placeholder="Timezone"
                  />
                ) : (
                  <p className="text-gray-900">{profile.timezone || 'Not specified'}</p>
                )}
              </div>
            </div>

            {/* Bio */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              {isEditing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <p className="text-gray-900">{profile.bio || 'No bio provided'}</p>
              )}
            </div>

            {/* Edit Actions */}
            {isEditing && (
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isUpdating}
                  icon={X}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isUpdating}
                  icon={Save}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </Card>

          {/* Account Information */}
          <Card className="p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Account Information</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">{profile.email}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">User ID</p>
                  <p className="text-sm text-gray-600 font-mono">{profile.id}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Member since</p>
                  <p className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              
              {profile.lastLoginAt && (
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Last login</p>
                    <p className="text-sm text-gray-600">
                      {formatDistanceToNow(new Date(profile.lastLoginAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}