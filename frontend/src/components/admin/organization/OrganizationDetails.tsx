import React, { useState, useEffect } from 'react';
import { useOrganizationStore } from '../../../stores/organizationStore';
import { Organization, SubscriptionPlan, OrganizationStatus } from '../../../types/organization.types';
import Button from '../../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import Badge from '../../ui/Badge';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { X, Edit, Trash2, Users, Building, Calendar, Globe, Mail, Phone, MapPin, BarChart3, Network } from 'lucide-react';
import TeamForm from './TeamForm';
import DepartmentForm from './DepartmentForm';
import OrganizationAnalytics from './OrganizationAnalytics';
import OrganizationChartComponent from './OrganizationChart';

interface OrganizationDetailsProps {
  organization: Organization;
  onClose: () => void;
  onEdit?: (organization: Organization) => void;
  onDelete?: (id: string) => void;
}

const OrganizationDetails: React.FC<OrganizationDetailsProps> = ({
  organization,
  onClose,
  onEdit,
  onDelete,
}) => {
  const {
    departments,
    teams,
    departmentsLoading,
    teamsLoading,
    fetchDepartments,
    fetchTeams,
  } = useOrganizationStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'teams' | 'analytics' | 'chart' | 'settings'>('overview');
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any>(null);
  const [editingTeam, setEditingTeam] = useState<any>(null);

  useEffect(() => {
    fetchDepartments(organization.id);
    fetchTeams(organization.id);
  }, [organization.id, fetchDepartments, fetchTeams]);

  const handleCreateDepartment = () => {
    setEditingDepartment(null);
    setShowDepartmentForm(true);
  };

  const handleEditDepartment = (department: any) => {
    setEditingDepartment(department);
    setShowDepartmentForm(true);
  };

  const handleCloseDepartmentForm = () => {
    setShowDepartmentForm(false);
    setEditingDepartment(null);
    // Note: No need to fetch - the store is already updated by createDepartment/updateDepartment
  };

  const handleCreateTeam = () => {
    setEditingTeam(null);
    setShowTeamForm(true);
  };

  const handleEditTeam = (team: any) => {
    setEditingTeam(team);
    setShowTeamForm(true);
  };

  const handleCloseTeamForm = () => {
    setShowTeamForm(false);
    setEditingTeam(null);
    // Note: No need to fetch - the store is already updated by createTeam/updateTeam
  };

  const getStatusBadgeVariant = (status: OrganizationStatus) => {
    switch (status) {
      case OrganizationStatus.ACTIVE:
        return 'success';
      case OrganizationStatus.INACTIVE:
        return 'secondary';
      case OrganizationStatus.SUSPENDED:
        return 'error';
      case OrganizationStatus.PENDING:
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getPlanBadgeVariant = (plan: SubscriptionPlan) => {
    switch (plan) {
      case SubscriptionPlan.ENTERPRISE:
        return 'primary';
      case SubscriptionPlan.PROFESSIONAL:
        return 'secondary';
      case SubscriptionPlan.BASIC:
        return 'outline';
      case SubscriptionPlan.FREE:
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building },
    { id: 'departments', label: 'Departments', icon: Users },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'chart', label: 'Org Chart', icon: Network },
    { id: 'settings', label: 'Settings', icon: Globe },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div className="flex items-start space-x-4">
                {organization.logoUrl && (
                  <img
                    className="h-16 w-16 rounded-lg object-cover"
                    src={organization.logoUrl}
                    alt={organization.name}
                  />
                )}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{organization.name}</h2>
                  <p className="text-gray-600">@{organization.slug}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant={getStatusBadgeVariant(organization.status)}>
                      {organization.status}
                    </Badge>
                    <Badge variant={getPlanBadgeVariant(organization.subscriptionPlan)}>
                      {organization.subscriptionPlan}
                    </Badge>
                    {organization.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                {onEdit && (
                  <Button onClick={() => onEdit(organization)} variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    onClick={() => onDelete(organization.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
                <Button onClick={onClose} variant="ghost" size="sm">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Description */}
                {organization.description && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-600">{organization.description}</p>
                  </div>
                )}

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email</p>
                        <p className="text-sm text-gray-600">{organization.contactEmail}</p>
                      </div>
                    </div>
                    {organization.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Phone</p>
                          <p className="text-sm text-gray-600">{organization.phone}</p>
                        </div>
                      </div>
                    )}
                    {organization.website && (
                      <div className="flex items-center space-x-3">
                        <Globe className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Website</p>
                          <a
                            href={organization.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {organization.website}
                          </a>
                        </div>
                      </div>
                    )}
                    {(organization.address || organization.city || organization.state) && (
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Address</p>
                          <p className="text-sm text-gray-600">
                            {[organization.address, organization.city, organization.state, organization.zipCode]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subscription Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-900">Plan</p>
                      <p className="text-lg font-semibold text-gray-900 capitalize">
                        {organization.subscriptionPlan}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-900">Max Users</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {organization.maxUsers.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-900">Storage Limit</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {organization.storageLimitGb} GB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Created</p>
                        <p className="text-sm text-gray-600">{formatDateTime(organization.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Last Updated</p>
                        <p className="text-sm text-gray-600">{formatDateTime(organization.updatedAt)}</p>
                      </div>
                    </div>
                    {organization.planStartDate && (
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Plan Start Date</p>
                          <p className="text-sm text-gray-600">{formatDate(organization.planStartDate)}</p>
                        </div>
                      </div>
                    )}
                    {organization.planEndDate && (
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Plan End Date</p>
                          <p className="text-sm text-gray-600">{formatDate(organization.planEndDate)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'departments' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Departments</h3>
                  <Button 
                    size="sm" 
                    onClick={handleCreateDepartment}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Building className="w-4 h-4 mr-2" />
                    Add Department
                  </Button>
                </div>

                {departmentsLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : departments && departments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {departments.map((department) => (
                      <Card key={department.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{department.name}</h4>
                          <Badge variant={department.isActive ? 'success' : 'secondary'}>
                            {department.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{department.description}</p>
                        <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                          <span className="capitalize">{department.type}</span>
                          <span>{formatDate(department.createdAt)}</span>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditDepartment(department)}>
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No departments found</p>
                    <Button 
                      className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md transition-all duration-200" 
                      size="sm"
                      onClick={handleCreateDepartment}
                    >
                      <Building className="w-4 h-4 mr-2" />
                      Create First Department
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'teams' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Teams</h3>
                      <Button 
                        size="sm" 
                        onClick={handleCreateTeam}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Add Team
                      </Button>
                </div>

                {teamsLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : teams && teams.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teams.map((team) => (
                      <Card key={team.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{team.name}</h4>
                          <Badge variant={team.isActive ? 'success' : 'secondary'}>
                            {team.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{team.description}</p>
                        <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                          <span className="capitalize">{team.type}</span>
                          <span>{formatDate(team.createdAt)}</span>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditTeam(team)}>
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No teams found</p>
                    <Button 
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200" 
                      size="sm"
                      onClick={handleCreateTeam}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Create First Team
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <OrganizationAnalytics organizationId={organization.id} />
              </div>
            )}

            {activeTab === 'chart' && (
              <div>
                <OrganizationChartComponent organizationId={organization.id} />
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Settings</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Timezone</p>
                        <p className="text-sm text-gray-600">{organization.settings.timezone}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Language</p>
                        <p className="text-sm text-gray-600">{organization.settings.language}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Date Format</p>
                        <p className="text-sm text-gray-600">{organization.settings.dateFormat}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Currency</p>
                        <p className="text-sm text-gray-600">{organization.settings.currency}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Working Hours</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Working Days</p>
                        <p className="text-sm text-gray-600">
                          {organization.settings.workingDays.map(day => {
                            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                            return days[day];
                          }).join(', ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Working Hours</p>
                        <p className="text-sm text-gray-600">
                          {organization.settings.workingHours.start} - {organization.settings.workingHours.end}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Feature Flags</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(organization.featureFlags).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-900">{key}</span>
                          <Badge variant={value ? 'success' : 'secondary'}>
                            {value ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Department Form Modal */}
      {showDepartmentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <DepartmentForm
              organizationId={organization.id}
              department={editingDepartment}
              onClose={handleCloseDepartmentForm}
            />
          </div>
        </div>
      )}

      {/* Team Form Modal */}
      {showTeamForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <TeamForm
              organizationId={organization.id}
              team={editingTeam}
              onClose={handleCloseTeamForm}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationDetails;
