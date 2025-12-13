import React, { useState, useEffect } from 'react';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import OrganizationManagement from '../admin/OrganizationManagement';
import OrganizationSetupWizard from '../../components/admin/organization/OrganizationSetupWizard';
import { 
  Building, 
  Users, 
  User, 
  TrendingUp, 
  Plus, 
  Settings, 
  BarChart3,
  Activity,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import QuoteOfTheDay from '../../components/dashboard/QuoteOfTheDay';

const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const {
    organizations,
    organizationStats,
    organizationsLoading,
    organizationsError,
    fetchOrganizations,
    fetchOrganizationStats,
  } = useOrganizationStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'organizations' | 'settings'>('overview');
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Start with false to see content immediately

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          fetchOrganizations({ limit: 5 }),
          fetchOrganizationStats()
        ]);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [fetchOrganizations, fetchOrganizationStats]);

  const handleSetupComplete = async (organizationId: string) => {
    setShowSetupWizard(false);
    setActiveTab('organizations');
    // Refresh data
    try {
      await Promise.all([
        fetchOrganizations(),
        fetchOrganizationStats()
      ]);
    } catch (error) {
      console.error('Failed to refresh data after setup:', error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'organizations', label: 'Organizations', icon: Building },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Daily Growth Quote */}
      <QuoteOfTheDay />

      {/* Stats Cards */}
      {organizationStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Organizations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {organizationStats.totalOrganizations || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Organizations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {organizationStats.activeOrganizations || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {organizationStats.totalUsers || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Users/Org</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(organizationStats.averageUsersPerOrganization || 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Recent Organizations */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Organizations</h3>
          <Button
            onClick={() => setActiveTab('organizations')}
            variant="outline"
            size="sm"
          >
            View All
          </Button>
        </div>

        {organizationsLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : organizations && organizations.length > 0 ? (
          <div className="space-y-3">
            {(organizations || []).slice(0, 5).map((org) => {
              if (!org) return null;
              return (
                <div key={org.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {org.logoUrl && (
                      <img
                        className="h-10 w-10 rounded-full object-cover mr-3"
                        src={org.logoUrl}
                        alt={org.name}
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{org.name}</p>
                      <p className="text-sm text-gray-600">@{org.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={org.isActive ? 'success' : 'secondary'}>
                      {org.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">
                      {org.subscriptionPlan}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No organizations found</p>
            <Button onClick={() => setShowSetupWizard(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Organization
            </Button>
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <Card className="p-6 transform transition-all duration-200 hover:shadow-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => setShowSetupWizard(true)}
            variant="outline"
            className="h-24 flex-col space-y-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
          >
            <Plus className="w-6 h-6 text-blue-600" />
            <span className="font-medium">New Organization</span>
          </Button>
          <Button
            onClick={() => setActiveTab('organizations')}
            variant="outline"
            className="h-24 flex-col space-y-2 hover:bg-purple-50 hover:border-purple-300 transition-all duration-200"
          >
            <Building className="w-6 h-6 text-purple-600" />
            <span className="font-medium">Manage Organizations</span>
          </Button>
          <Button
            onClick={() => setActiveTab('settings')}
            variant="outline"
            className="h-24 flex-col space-y-2 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
          >
            <Settings className="w-6 h-6 text-gray-600" />
            <span className="font-medium">System Settings</span>
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">System Settings</h2>
        <p className="text-gray-600">Configure platform-wide settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Platform Name
              </label>
              <input
                type="text"
                defaultValue="GrowthPulse"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Timezone
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>
            <Button>Save Settings</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Feature Flags</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Enable Organization Setup Wizard</span>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Enable Bulk Operations</span>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Enable Organization Charts</span>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage your GrowthPulse platform</p>
            </div>
            <Badge variant="success">Admin</Badge>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">Loading dashboard...</span>
          </div>
        )}

        {!isLoading && organizationsError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{organizationsError}</p>
            </div>
          </div>
        )}

        {!isLoading && (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'organizations' && <OrganizationManagement />}
            {activeTab === 'settings' && renderSettings()}
          </>
        )}
      </div>

      {/* Setup Wizard Modal */}
      {showSetupWizard && (
        <OrganizationSetupWizard
          onComplete={handleSetupComplete}
          onCancel={() => setShowSetupWizard(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
