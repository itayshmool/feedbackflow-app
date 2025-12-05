import React, { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '@/stores/userStore';
import { useOrganizationStore } from '@/stores/organizationStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Dialog } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { UserForm } from '@/components/admin/user/UserForm';
import { UserDetails } from '@/components/admin/user/UserDetails';
import { UserStats } from '@/components/admin/user/UserStats';
import UserBulkOperations from '@/components/admin/user/UserBulkOperations';
import { User } from '@/types/user.types';
import { 
  Plus, 
  Search, 
  Users,
  Eye,
  Edit,
  Trash2,
  Filter,
  X,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ScrollableTable } from '@/components/ui/ScrollableTable';

export const UserManagement: React.FC = () => {
  const {
    users,
    userStats,
    selectedUsers,
    isLoading,
    error,
    pagination,
    filters,
    fetchUsers,
    fetchUserStats,
    deleteUser,
    setSelectedUsers,
    toggleUserSelection,
    clearSelectedUsers,
    setFilters,
    clearErrors,
  } = useUserStore();

  const {
    organizations,
    fetchOrganizations,
  } = useOrganizationStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('active'); // Default to active users
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('users');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Main effect: fetch users when any filter or pagination changes
  useEffect(() => {
    const paginationOptions = { limit: pageSize, offset: (currentPage - 1) * pageSize };
    const currentFilters = {
      search: searchTerm || undefined,
      organizationId: organizationFilter || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
    };
    
    // Update store filters
    setFilters(currentFilters);
    
    // Fetch data
    fetchUsers(currentFilters, paginationOptions);
    fetchUserStats();
    fetchOrganizations({});
  }, [currentPage, pageSize, searchTerm, organizationFilter, roleFilter, statusFilter]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleUserEdit = (user: User) => {
    setEditingUser(user);
    setShowCreateModal(true);
  };

  const handleUserDelete = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
      const success = await deleteUser(user.id);
      if (success) {
        clearSelectedUsers();
        // Refresh the user list after deletion
        fetchUsers(filters, { limit: pageSize, offset: (currentPage - 1) * pageSize });
        fetchUserStats(); // Also refresh stats
      }
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleClearFilters = () => {
    setOrganizationFilter('');
    setRoleFilter('');
    setStatusFilter('active'); // Reset to default active
    setSearchTerm('');
    setCurrentPage(1);
    const clearedFilters = { 
      search: undefined,
      status: 'active',
      organizationId: undefined,
      role: undefined,
      department: undefined,
      isActive: undefined,
      emailVerified: undefined,
      lastLoginAfter: undefined,
      lastLoginBefore: undefined,
      createdAfter: undefined,
      createdBefore: undefined,
    };
    setFilters(clearedFilters);
    fetchUsers(clearedFilters, { limit: pageSize, offset: 0 });
  };

  const getStatusBadgeVariant = (isActive: boolean) => {
    return isActive ? 'success' : 'secondary';
  };

  const getVerificationBadgeVariant = (emailVerified: boolean) => {
    return emailVerified ? 'success' : 'warning';
  };

  const getOrganizationName = (organizationId: string | undefined) => {
    if (!organizationId) return 'No organization';
    const organization = organizations.find(org => org.id === organizationId);
    return organization ? organization.name : 'Unknown organization';
  };

  // Use users directly since filtering is now done server-side
  const filteredUsers = users || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage users, roles, and permissions</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={clearErrors}>
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('users')}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Users
          </button>
          <button
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('stats')}
          >
            Statistics
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search and Actions - Responsive Layout */}
            <div className="space-y-4">
              {/* Action buttons - always on top on mobile */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowBulkOperations(true)}
                    variant="outline"
                    className="flex items-center gap-2 flex-1 sm:flex-none justify-center"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Bulk Operations</span>
                    <span className="sm:hidden">Bulk</span>
                  </Button>
                  
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 flex-1 sm:flex-none justify-center"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">New User</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </div>
                
                {(organizationFilter || searchTerm || roleFilter || (statusFilter && statusFilter !== 'active')) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="flex items-center gap-2 w-full sm:w-auto justify-center"
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
              
              {/* Filters - stack on mobile, row on desktop */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                
                <div className="grid grid-cols-2 sm:flex gap-3 sm:gap-2">
                  <Select
                    value={organizationFilter}
                    onChange={(e) => setOrganizationFilter(e.target.value)}
                    className="w-full sm:w-44"
                  >
                    <option value="">All Organizations</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} (@{org.slug})
                      </option>
                    ))}
                  </Select>

                  <Select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full sm:w-36"
                  >
                    <option value="">All Roles</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                  </Select>

                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-36 col-span-2 sm:col-span-1"
                  >
                    <option value="active">Active Users</option>
                    <option value="inactive">Inactive Users</option>
                    <option value="">All Users</option>
                  </Select>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <Card>
              <ScrollableTable>
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(filteredUsers.map(user => user.id));
                            } else {
                              clearSelectedUsers();
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Roles
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <LoadingSpinner size="lg" />
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          {searchTerm || organizationFilter || roleFilter ? 'No users match the current filters' : 'No users found'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={() => toggleUserSelection(user.id)}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {user.avatarUrl ? (
                                <img
                                  className="h-10 w-10 rounded-full object-cover mr-3"
                                  src={user.avatarUrl}
                                  alt={user.name}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                  <span className="text-sm font-medium text-gray-600">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {getOrganizationName(user.organizationId)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {user.roles && user.roles.length > 0 ? (
                                user.roles.map((role) => (
                                  <Badge key={role.id} variant="outline" className="text-xs">
                                    {role.roleName}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-gray-500">No roles</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col space-y-1">
                              <Badge variant={getStatusBadgeVariant(user.isActive)}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              <Badge variant={getVerificationBadgeVariant(user.emailVerified)}>
                                {user.emailVerified ? 'Verified' : 'Unverified'}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {user.lastLoginAt 
                              ? new Date(user.lastLoginAt).toLocaleDateString()
                              : 'Never'
                            }
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUserSelect(user)}
                                className="p-1"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUserEdit(user)}
                                className="p-1"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUserDelete(user)}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </ScrollableTable>
            </Card>

            {/* Pagination Controls */}
            {pagination && pagination.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-4 py-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="hidden sm:inline">Show</span>
                  <Select
                    value={pageSize.toString()}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="w-16"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </Select>
                  <span>of {pagination.total} users</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 hidden sm:inline">
                    Page {currentPage} of {Math.ceil(pagination.total / pageSize)}
                  </span>
                    
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="p-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    {/* Page numbers - show fewer on mobile */}
                    {(() => {
                      const totalPages = Math.ceil(pagination.total / pageSize);
                      const pages = [];
                      const maxVisiblePages = window.innerWidth < 640 ? 3 : 5;
                      
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                      
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button
                            key={i}
                            variant={i === currentPage ? "primary" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(i)}
                            className="w-8 h-8 p-0 min-w-[2rem]"
                          >
                            {i}
                          </Button>
                        );
                      }
                      
                      return pages;
                    })()}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= Math.ceil(pagination.total / pageSize)}
                      className="p-2"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'stats' && userStats && <UserStats stats={userStats} />}
      </div>

      {/* Modals */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <UserForm
          user={editingUser}
          onClose={() => {
            setShowCreateModal(false);
            setEditingUser(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingUser(null);
            fetchUsers(filters, { limit: pageSize, offset: (currentPage - 1) * pageSize });
          }}
        />
      </Dialog>

      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        {selectedUser && (
          <UserDetails
            user={selectedUser}
            onClose={() => {
              setShowUserDetails(false);
              setSelectedUser(null);
            }}
            onEdit={() => {
              setShowUserDetails(false);
              setSelectedUser(null);
              setEditingUser(selectedUser);
              setShowCreateModal(true);
            }}
          />
        )}
      </Dialog>

      {showBulkOperations && (
        <UserBulkOperations
          onClose={() => {
            setShowBulkOperations(false);
            fetchUsers(filters, { limit: pageSize, offset: (currentPage - 1) * pageSize }); // Refresh users after bulk operations
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;