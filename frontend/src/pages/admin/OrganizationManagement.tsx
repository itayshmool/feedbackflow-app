import React, { useState, useEffect } from 'react';
import { useOrganizationStore } from '../../stores/organizationStore';
import { Organization, OrganizationFilters, SubscriptionPlan, OrganizationStatus } from '../../types/organization.types';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import OrganizationForm from '../../components/admin/organization/OrganizationForm';
import OrganizationDetails from '../../components/admin/organization/OrganizationDetails';
import BulkOperations from '../../components/admin/organization/BulkOperations';
import { Plus, Search, Filter, Download, Upload, Eye, Edit, Trash2 } from 'lucide-react';

const OrganizationManagement: React.FC = () => {
  const {
    organizations,
    organizationsLoading,
    organizationsError,
    organizationsPagination,
    fetchOrganizations,
    deleteOrganization,
    clearError,
  } = useOrganizationStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<OrganizationFilters>({
    limit: 10,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showBulkOps, setShowBulkOps] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchOrganizations(filters);
  }, [filters]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      // Implement search functionality
      // For now, just filter locally
    } else {
      fetchOrganizations(filters);
    }
  };

  const handleFilterChange = (newFilters: Partial<OrganizationFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, offset: 0 }));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this organization?')) {
      try {
        await deleteOrganization(id);
        fetchOrganizations(filters);
      } catch (error) {
        console.error('Failed to delete organization:', error);
      }
    }
  };

  const handleViewDetails = (organization: Organization) => {
    setSelectedOrganization(organization);
    setShowDetails(true);
  };

  const handleEdit = (organization: Organization) => {
    setSelectedOrganization(organization);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedOrganization(null);
    fetchOrganizations(filters);
  };

  const handleDetailsClose = () => {
    setShowDetails(false);
    setSelectedOrganization(null);
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

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (organizationsError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {organizationsError}</p>
          <Button onClick={clearError} variant="outline" size="sm" className="mt-2">
            Dismiss
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Management</h1>
          <p className="text-gray-600">Manage organizations, departments, and teams</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowBulkOps(true)}
            variant="outline"
            size="sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button
            onClick={() => setShowBulkOps(true)}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowForm(true)} size="sm" data-testid="create-organization-button">
            <Plus className="w-4 h-4 mr-2" />
            New Organization
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange({ status: e.target.value as OrganizationStatus || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value={OrganizationStatus.ACTIVE}>Active</option>
                  <option value={OrganizationStatus.INACTIVE}>Inactive</option>
                  <option value={OrganizationStatus.SUSPENDED}>Suspended</option>
                  <option value={OrganizationStatus.PENDING}>Pending</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan
                </label>
                <select
                  value={filters.subscriptionPlan || ''}
                  onChange={(e) => handleFilterChange({ subscriptionPlan: e.target.value as SubscriptionPlan || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Plans</option>
                  <option value={SubscriptionPlan.FREE}>Free</option>
                  <option value={SubscriptionPlan.BASIC}>Basic</option>
                  <option value={SubscriptionPlan.PROFESSIONAL}>Professional</option>
                  <option value={SubscriptionPlan.ENTERPRISE}>Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Active Only
                </label>
                <select
                  value={filters.isActive?.toString() || ''}
                  onChange={(e) => handleFilterChange({ isActive: e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="true">Active Only</option>
                  <option value="false">Inactive Only</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Organizations List */}
      <Card className="p-0">
        {organizationsLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrganizations.map((organization) => (
                  <tr key={organization.id} className="hover:bg-gray-50" data-testid="organization-item">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {organization.logoUrl && (
                          <img
                            className="h-10 w-10 rounded-full object-cover mr-3"
                            src={organization.logoUrl}
                            alt={organization.name}
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {organization.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {organization.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{organization.contactEmail}</div>
                      {organization.phone && (
                        <div className="text-sm text-gray-500">{organization.phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getStatusBadgeVariant(organization.status)}>
                        {organization.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getPlanBadgeVariant(organization.subscriptionPlan)}>
                        {organization.subscriptionPlan}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {organization.maxUsers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(organization.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          onClick={() => handleViewDetails(organization)}
                          variant="ghost"
                          size="sm"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleEdit(organization)}
                          variant="ghost"
                          size="sm"
                          data-testid="edit-organization"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(organization.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          data-testid="delete-organization"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!organizationsLoading && filteredOrganizations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No organizations found</p>
            <Button onClick={() => setShowForm(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Create First Organization
            </Button>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {organizationsPagination && organizationsPagination.total > organizationsPagination.limit && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-700">
            Showing {organizationsPagination.offset + 1} to{' '}
            {Math.min(organizationsPagination.offset + organizationsPagination.limit, organizationsPagination.total)} of{' '}
            {organizationsPagination.total} organizations
          </p>
          <div className="flex space-x-2">
            <Button
              onClick={() => handleFilterChange({ offset: Math.max(0, filters.offset! - filters.limit!) })}
              disabled={filters.offset === 0}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            <Button
              onClick={() => handleFilterChange({ offset: filters.offset! + filters.limit! })}
              disabled={!organizationsPagination.hasMore}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <OrganizationForm
          organization={selectedOrganization}
          onClose={handleFormClose}
        />
      )}

      {showDetails && selectedOrganization && (
        <OrganizationDetails
          organization={selectedOrganization}
          onClose={handleDetailsClose}
        />
      )}

      {showBulkOps && (
        <BulkOperations
          onClose={() => setShowBulkOps(false)}
        />
      )}
    </div>
  );
};

export default OrganizationManagement;
