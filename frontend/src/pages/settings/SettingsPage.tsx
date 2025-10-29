// frontend/src/pages/settings/SettingsPage.tsx

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Switch } from '../../components/ui/Switch';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { 
  Bell, 
  Shield, 
  Eye, 
  Palette, 
  Globe, 
  MessageSquare, 
  Lock, 
  Download, 
  Trash2, 
  Save, 
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';

export default function SettingsPage() {
  const { 
    settings, 
    isLoading, 
    isUpdating, 
    error, 
    fetchSettings, 
    updateSettings, 
    resetSettings, 
    clearError 
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState('notifications');
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    // Notification Settings
    emailNotifications: true,
    pushNotifications: true,
    feedbackNotifications: true,
    cycleNotifications: true,
    reminderNotifications: true,
    weeklyDigest: false,
    
    // Privacy Settings
    profileVisibility: 'organization' as 'public' | 'organization' | 'private',
    showEmail: false,
    showPhone: false,
    showDepartment: true,
    showPosition: true,
    
    // Application Settings
    theme: 'system' as 'light' | 'dark' | 'system',
    language: 'en',
    timezone: 'America/Los_Angeles',
    dateFormat: 'MM/DD/YYYY' as 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD',
    timeFormat: '12h' as '12h' | '24h',
    
    // Feedback Settings
    autoSaveDrafts: true,
    draftSaveInterval: 5,
    feedbackReminders: true,
    reminderFrequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    
    // Security Settings
    twoFactorEnabled: false,
    sessionTimeout: 60,
    loginNotifications: true,
    
    // Data & Privacy
    dataRetention: 24,
    analyticsOptIn: true,
    marketingEmails: false,
  });

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setFormData({
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        feedbackNotifications: settings.feedbackNotifications,
        cycleNotifications: settings.cycleNotifications,
        reminderNotifications: settings.reminderNotifications,
        weeklyDigest: settings.weeklyDigest,
        profileVisibility: settings.profileVisibility,
        showEmail: settings.showEmail,
        showPhone: settings.showPhone,
        showDepartment: settings.showDepartment,
        showPosition: settings.showPosition,
        theme: settings.theme,
        language: settings.language,
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
        timeFormat: settings.timeFormat,
        autoSaveDrafts: settings.autoSaveDrafts,
        draftSaveInterval: settings.draftSaveInterval,
        feedbackReminders: settings.feedbackReminders,
        reminderFrequency: settings.reminderFrequency,
        twoFactorEnabled: settings.twoFactorEnabled,
        sessionTimeout: settings.sessionTimeout,
        loginNotifications: settings.loginNotifications,
        dataRetention: settings.dataRetention,
        analyticsOptIn: settings.analyticsOptIn,
        marketingEmails: settings.marketingEmails,
      });
    }
  }, [settings]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const success = await updateSettings(formData);
    if (success) {
      setHasChanges(false);
    }
  };

  const handleReset = async () => {
    const success = await resetSettings();
    if (success) {
      setHasChanges(false);
    }
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Eye },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'data', label: 'Data & Privacy', icon: Shield },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account preferences and privacy settings</p>
        </div>
        <div className="flex space-x-3">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset} icon={RotateCcw}>
              Reset
            </Button>
          )}
          {hasChanges && (
            <Button onClick={handleSave} disabled={isUpdating} icon={Save}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Settings
              </h3>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Email Notifications</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Email Notifications</p>
                        <p className="text-sm text-gray-500">Receive notifications via email</p>
                      </div>
                      <Switch
                        checked={formData.emailNotifications}
                        onChange={(checked) => handleInputChange('emailNotifications', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Feedback Notifications</p>
                        <p className="text-sm text-gray-500">Get notified when you receive feedback</p>
                      </div>
                      <Switch
                        checked={formData.feedbackNotifications}
                        onChange={(checked) => handleInputChange('feedbackNotifications', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Cycle Notifications</p>
                        <p className="text-sm text-gray-500">Get notified about cycle updates</p>
                      </div>
                      <Switch
                        checked={formData.cycleNotifications}
                        onChange={(checked) => handleInputChange('cycleNotifications', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Reminder Notifications</p>
                        <p className="text-sm text-gray-500">Get reminded about pending tasks</p>
                      </div>
                      <Switch
                        checked={formData.reminderNotifications}
                        onChange={(checked) => handleInputChange('reminderNotifications', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Weekly Digest</p>
                        <p className="text-sm text-gray-500">Receive a weekly summary of activity</p>
                      </div>
                      <Switch
                        checked={formData.weeklyDigest}
                        onChange={(checked) => handleInputChange('weeklyDigest', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Privacy Settings
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Visibility
                  </label>
                  <Select
                    value={formData.profileVisibility}
                    onChange={(e) => handleInputChange('profileVisibility', e.target.value)}
                  >
                    <option value="public">Public - Visible to everyone</option>
                    <option value="organization">Organization - Visible to organization members</option>
                    <option value="private">Private - Only visible to you</option>
                  </Select>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Profile Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Show Email</p>
                        <p className="text-sm text-gray-500">Display email address on profile</p>
                      </div>
                      <Switch
                        checked={formData.showEmail}
                        onChange={(checked) => handleInputChange('showEmail', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Show Phone</p>
                        <p className="text-sm text-gray-500">Display phone number on profile</p>
                      </div>
                      <Switch
                        checked={formData.showPhone}
                        onChange={(checked) => handleInputChange('showPhone', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Show Department</p>
                        <p className="text-sm text-gray-500">Display department on profile</p>
                      </div>
                      <Switch
                        checked={formData.showDepartment}
                        onChange={(checked) => handleInputChange('showDepartment', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Show Position</p>
                        <p className="text-sm text-gray-500">Display position on profile</p>
                      </div>
                      <Switch
                        checked={formData.showPosition}
                        onChange={(checked) => handleInputChange('showPosition', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                Appearance & Language
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Theme
                    </label>
                    <Select
                      value={formData.theme}
                      onChange={(e) => handleInputChange('theme', e.target.value)}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <Select
                      value={formData.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <Select
                      value={formData.timezone}
                      onChange={(e) => handleInputChange('timezone', e.target.value)}
                    >
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Format
                    </label>
                    <Select
                      value={formData.dateFormat}
                      onChange={(e) => handleInputChange('dateFormat', e.target.value)}
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Format
                    </label>
                    <Select
                      value={formData.timeFormat}
                      onChange={(e) => handleInputChange('timeFormat', e.target.value)}
                    >
                      <option value="12h">12 Hour (AM/PM)</option>
                      <option value="24h">24 Hour</option>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Feedback Tab */}
          {activeTab === 'feedback' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Feedback Settings
              </h3>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Auto-save Drafts</p>
                      <p className="text-sm text-gray-500">Automatically save feedback drafts</p>
                    </div>
                    <Switch
                      checked={formData.autoSaveDrafts}
                      onChange={(checked) => handleInputChange('autoSaveDrafts', checked)}
                    />
                  </div>
                  
                  {formData.autoSaveDrafts && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Draft Save Interval (minutes)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        value={formData.draftSaveInterval}
                        onChange={(e) => handleInputChange('draftSaveInterval', parseInt(e.target.value))}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Feedback Reminders</p>
                      <p className="text-sm text-gray-500">Get reminded to give feedback</p>
                    </div>
                    <Switch
                      checked={formData.feedbackReminders}
                      onChange={(checked) => handleInputChange('feedbackReminders', checked)}
                    />
                  </div>
                  
                  {formData.feedbackReminders && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reminder Frequency
                      </label>
                      <Select
                        value={formData.reminderFrequency}
                        onChange={(e) => handleInputChange('reminderFrequency', e.target.value)}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Security Settings
              </h3>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500">Add an extra layer of security</p>
                    </div>
                    <Switch
                      checked={formData.twoFactorEnabled}
                      onChange={(checked) => handleInputChange('twoFactorEnabled', checked)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <Input
                      type="number"
                      min="15"
                      max="480"
                      value={formData.sessionTimeout}
                      onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Login Notifications</p>
                      <p className="text-sm text-gray-500">Get notified of new login attempts</p>
                    </div>
                    <Switch
                      checked={formData.loginNotifications}
                      onChange={(checked) => handleInputChange('loginNotifications', checked)}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Data & Privacy Tab */}
          {activeTab === 'data' && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Data & Privacy
              </h3>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Retention (months)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="120"
                      value={formData.dataRetention}
                      onChange={(e) => handleInputChange('dataRetention', parseInt(e.target.value))}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      How long to keep your data after account deletion
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Analytics Opt-in</p>
                      <p className="text-sm text-gray-500">Help improve the product with usage analytics</p>
                    </div>
                    <Switch
                      checked={formData.analyticsOptIn}
                      onChange={(checked) => handleInputChange('analyticsOptIn', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Marketing Emails</p>
                      <p className="text-sm text-gray-500">Receive product updates and marketing content</p>
                    </div>
                    <Switch
                      checked={formData.marketingEmails}
                      onChange={(checked) => handleInputChange('marketingEmails', checked)}
                    />
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Data Management</h4>
                  <div className="space-y-3">
                    <Button variant="outline" icon={Download}>
                      Export My Data
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      icon={Trash2}
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This action cannot be undone. All your data will be permanently deleted.
            </p>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Enter your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
              <Input
                type="text"
                placeholder="Reason for deletion (optional)"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
              />
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white flex-1"
                  disabled={!deletePassword}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
