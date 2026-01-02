import React, { useState, useEffect } from 'react';
import { Shield, Server, Mail, Globe, Save, AlertTriangle, Clock, User } from 'lucide-react';
import { systemAdminService, SecuritySettings } from '../../services/system-admin.service';
import toast from 'react-hot-toast';

const SecuritySettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'maintenance' | 'email' | 'ip'>('maintenance');
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changeReason, setChangeReason] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await systemAdminService.getSecuritySettings();
      setSettings(data);
    } catch (error) {
      console.error('[Security Settings] Error loading settings:', error);
      toast.error('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await systemAdminService.updateSecuritySettings(settings, changeReason || undefined);
      toast.success('Security settings saved successfully');
      setChangeReason('');
    } catch (error) {
      console.error('[Security Settings] Error saving settings:', error);
      toast.error('Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading security settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <p>Failed to load security settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <Shield className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">System Security Settings</h1>
          </div>
          <p className="text-gray-600">
            Manage system-wide security and access control settings
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'maintenance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  Maintenance Mode
                </div>
              </button>

              <button
                onClick={() => setActiveTab('email')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'email'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Email Whitelist
                </div>
              </button>

              <button
                onClick={() => setActiveTab('ip')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ip'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  IP Whitelist
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'maintenance' && (
              <MaintenanceTab settings={settings} setSettings={setSettings} />
            )}
            {activeTab === 'email' && (
              <EmailWhitelistTab settings={settings} setSettings={setSettings} />
            )}
            {activeTab === 'ip' && (
              <IPWhitelistTab settings={settings} setSettings={setSettings} />
            )}
          </div>
        </div>

        {/* Change Reason & Save */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Change Reason (Optional)
            </label>
            <input
              type="text"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="e.g., Updating for security audit"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Clock className="h-5 w-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save All Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Maintenance Tab Component
const MaintenanceTab: React.FC<{
  settings: SecuritySettings;
  setSettings: (settings: SecuritySettings) => void;
}> = ({ settings, setSettings }) => {
  const updateMaintenance = (updates: Partial<SecuritySettings['maintenance']>) => {
    setSettings({
      ...settings,
      maintenance: { ...settings.maintenance, ...updates }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance Mode</h3>
        <p className="text-sm text-gray-600 mb-6">
          Enable maintenance mode to temporarily restrict access to the application
        </p>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="maintenance-enabled"
          checked={settings.maintenance.enabled}
          onChange={(e) => updateMaintenance({ enabled: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="maintenance-enabled" className="ml-3 text-sm font-medium text-gray-700">
          Enable Maintenance Mode
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Maintenance Message
        </label>
        <textarea
          value={settings.maintenance.message}
          onChange={(e) => updateMaintenance({ message: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="We are currently performing scheduled maintenance..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Allowed Users (comma-separated emails)
        </label>
        <input
          type="text"
          value={settings.maintenance.allowedUsers.join(', ')}
          onChange={(e) =>
            updateMaintenance({
              allowedUsers: e.target.value.split(',').map((s) => s.trim()).filter((s) => s)
            })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="admin@example.com, user@example.com"
        />
        <p className="mt-1 text-sm text-gray-500">
          These users can access the system even during maintenance
        </p>
      </div>
    </div>
  );
};

// Email Whitelist Tab Component
const EmailWhitelistTab: React.FC<{
  settings: SecuritySettings;
  setSettings: (settings: SecuritySettings) => void;
}> = ({ settings, setSettings }) => {
  const updateEmailWhitelist = (updates: Partial<SecuritySettings['emailWhitelist']>) => {
    setSettings({
      ...settings,
      emailWhitelist: { ...settings.emailWhitelist, ...updates }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Email Whitelist</h3>
        <p className="text-sm text-gray-600 mb-6">
          Control which email addresses or domains can access the application
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Mode</label>
        <select
          value={settings.emailWhitelist.mode}
          onChange={(e) =>
            updateEmailWhitelist({ mode: e.target.value as 'disabled' | 'domain' | 'specific' })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="disabled">Disabled (All authenticated users allowed)</option>
          <option value="domain">Domain Whitelist (e.g., @wix.com)</option>
          <option value="specific">Specific Emails (Override domain)</option>
        </select>
      </div>

      {settings.emailWhitelist.mode === 'domain' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allowed Domains (comma-separated, with @)
          </label>
          <input
            type="text"
            value={settings.emailWhitelist.domains.join(', ')}
            onChange={(e) =>
              updateEmailWhitelist({
                domains: e.target.value.split(',').map((s) => s.trim()).filter((s) => s)
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="@wix.com, @example.com"
          />
          <p className="mt-1 text-sm text-gray-500">
            All users from these domains can access the system
          </p>
        </div>
      )}

      {settings.emailWhitelist.mode === 'specific' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allowed Emails (comma-separated)
          </label>
          <textarea
            value={settings.emailWhitelist.emails.join(', ')}
            onChange={(e) =>
              updateEmailWhitelist({
                emails: e.target.value.split(',').map((s) => s.trim()).filter((s) => s)
              })
            }
            rows={5}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="user1@example.com, user2@example.com, user3@example.com"
          />
          <p className="mt-1 text-sm text-gray-500">
            Only these specific email addresses can access the system (overrides domain whitelist)
          </p>
        </div>
      )}
    </div>
  );
};

// IP Whitelist Tab Component
const IPWhitelistTab: React.FC<{
  settings: SecuritySettings;
  setSettings: (settings: SecuritySettings) => void;
}> = ({ settings, setSettings }) => {
  const updateIPWhitelist = (updates: Partial<SecuritySettings['ipWhitelist']>) => {
    setSettings({
      ...settings,
      ipWhitelist: { ...settings.ipWhitelist, ...updates }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">IP Whitelist</h3>
        <p className="text-sm text-gray-600 mb-6">
          Restrict access to specific IP addresses or CIDR ranges
        </p>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="ip-enabled"
          checked={settings.ipWhitelist.enabled}
          onChange={(e) => updateIPWhitelist({ enabled: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="ip-enabled" className="ml-3 text-sm font-medium text-gray-700">
          Enable IP Whitelist
        </label>
      </div>

      {settings.ipWhitelist.enabled && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allowed IPs/CIDR Ranges (comma-separated)
          </label>
          <textarea
            value={settings.ipWhitelist.allowedIPs.join(', ')}
            onChange={(e) =>
              updateIPWhitelist({
                allowedIPs: e.target.value.split(',').map((s) => s.trim()).filter((s) => s)
              })
            }
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="185.111.189.248, 65.38.108.224/27, 91.199.119.240/28"
          />
          <p className="mt-1 text-sm text-gray-500">
            Supports individual IPs (192.168.1.1) and CIDR ranges (192.168.1.0/24)
          </p>
        </div>
      )}
    </div>
  );
};

export default SecuritySettingsPage;

