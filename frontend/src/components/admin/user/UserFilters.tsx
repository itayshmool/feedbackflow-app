import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { UserFilters } from '@/types/user.types';
import { X, Filter } from 'lucide-react';

interface UserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  onClearFilters: () => void;
}

export const UserFilters: React.FC<UserFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== null && value !== ''
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Search by name or email..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        {/* Organization */}
        <div>
          <Label htmlFor="organizationId">Organization</Label>
          <Select
            id="organizationId"
            value={filters.organizationId || ''}
            onValueChange={(value) => handleFilterChange('organizationId', value || undefined)}
          >
            <option value="">All Organizations</option>
            {/* This would be populated from organizations data */}
            <option value="org1">Organization 1</option>
            <option value="org2">Organization 2</option>
          </Select>
        </div>

        {/* Role (by name) */}
        <div>
          <Label htmlFor="roleId">Role</Label>
          <Select
            id="role"
            value={filters.role || ''}
            onValueChange={(value) => handleFilterChange('role', value || undefined)}
          >
            <option value="">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </Select>
        </div>

        {/* Department */}
        <div>
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            placeholder="Filter by department..."
            value={filters.department || ''}
            onChange={(e) => handleFilterChange('department', e.target.value)}
          />
        </div>

        {/* Status */}
        <div>
          <Label htmlFor="isActive">Status</Label>
          <Select
            id="isActive"
            value={filters.isActive === undefined ? '' : filters.isActive.toString()}
            onValueChange={(value) => {
              if (value === '') {
                handleFilterChange('isActive', undefined);
              } else {
                handleFilterChange('isActive', value === 'true');
              }
            }}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </div>

        {/* Email Verification */}
        <div>
          <Label htmlFor="emailVerified">Email Verification</Label>
          <Select
            id="emailVerified"
            value={filters.emailVerified === undefined ? '' : filters.emailVerified.toString()}
            onValueChange={(value) => {
              if (value === '') {
                handleFilterChange('emailVerified', undefined);
              } else {
                handleFilterChange('emailVerified', value === 'true');
              }
            }}
          >
            <option value="">All Users</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </Select>
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lastLoginAfter">Last Login After</Label>
          <Input
            id="lastLoginAfter"
            type="date"
            value={filters.lastLoginAfter || ''}
            onChange={(e) => handleFilterChange('lastLoginAfter', e.target.value || undefined)}
          />
        </div>
        <div>
          <Label htmlFor="lastLoginBefore">Last Login Before</Label>
          <Input
            id="lastLoginBefore"
            type="date"
            value={filters.lastLoginBefore || ''}
            onChange={(e) => handleFilterChange('lastLoginBefore', e.target.value || undefined)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="createdAfter">Created After</Label>
          <Input
            id="createdAfter"
            type="date"
            value={filters.createdAfter || ''}
            onChange={(e) => handleFilterChange('createdAfter', e.target.value || undefined)}
          />
        </div>
        <div>
          <Label htmlFor="createdBefore">Created Before</Label>
          <Input
            id="createdBefore"
            type="date"
            value={filters.createdBefore || ''}
            onChange={(e) => handleFilterChange('createdBefore', e.target.value || undefined)}
          />
        </div>
      </div>
    </div>
  );
};

