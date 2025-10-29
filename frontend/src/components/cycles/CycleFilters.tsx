// frontend/src/components/cycles/CycleFilters.tsx

import React, { useEffect } from 'react';
import { X, Filter } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CycleFilters as CycleFiltersType, CycleStatus, CycleType } from '@/types/cycles.types';
import { useOrganizationStore } from '@/stores/organizationStore';

interface CycleFiltersProps {
  filters: CycleFiltersType;
  onFiltersChange: (filters: CycleFiltersType) => void;
  onClearFilters: () => void;
}

export const CycleFilters: React.FC<CycleFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const { organizations, fetchOrganizations, organizationsLoading } = useOrganizationStore();

  useEffect(() => {
    // Fetch organizations when component mounts
    if (organizations.length === 0) {
      fetchOrganizations();
    }
  }, [organizations.length, fetchOrganizations]);

  const handleFilterChange = (key: keyof CycleFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== null && value !== ''
  );

  return (
    <Card className="p-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Organization Filter */}
          <Select
            label="Organization"
            value={filters.organizationId || ''}
            onChange={(e) => handleFilterChange('organizationId', e.target.value || undefined)}
            disabled={organizationsLoading}
          >
            <option value="">All Organizations</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} (@{org.slug})
              </option>
            ))}
          </Select>

          {/* Status Filter */}
          <Select
            label="Status"
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
          >
            <option value="">All Statuses</option>
            <option value={CycleStatus.DRAFT}>Draft</option>
            <option value={CycleStatus.ACTIVE}>Active</option>
            <option value={CycleStatus.IN_PROGRESS}>In Progress</option>
            <option value={CycleStatus.CLOSED}>Closed</option>
            <option value={CycleStatus.ARCHIVED}>Archived</option>
          </Select>

          {/* Type Filter */}
          <Select
            label="Type"
            value={filters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
          >
            <option value="">All Types</option>
            <option value={CycleType.ANNUAL}>Annual</option>
            <option value={CycleType.QUARTERLY}>Quarterly</option>
            <option value={CycleType.MONTHLY}>Monthly</option>
            <option value={CycleType.PROJECT_BASED}>Project Based</option>
            <option value={CycleType.CUSTOM}>Custom</option>
          </Select>

          {/* Date From Filter */}
          <Input
            label="Start Date From"
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
          />

          {/* Date To Filter */}
          <Input
            label="Start Date To"
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
          />
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.organizationId && (
              <div className="flex items-center space-x-1 bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm">
                <span>Organization: {organizations.find(org => org.id === filters.organizationId)?.name || 'Unknown'}</span>
                <button
                  onClick={() => handleFilterChange('organizationId', undefined)}
                  className="ml-1 hover:text-indigo-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.status && (
              <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                <span>Status: {filters.status}</span>
                <button
                  onClick={() => handleFilterChange('status', undefined)}
                  className="ml-1 hover:text-blue-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.type && (
              <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                <span>Type: {filters.type}</span>
                <button
                  onClick={() => handleFilterChange('type', undefined)}
                  className="ml-1 hover:text-green-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.dateFrom && (
              <div className="flex items-center space-x-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm">
                <span>From: {filters.dateFrom}</span>
                <button
                  onClick={() => handleFilterChange('dateFrom', undefined)}
                  className="ml-1 hover:text-purple-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.dateTo && (
              <div className="flex items-center space-x-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm">
                <span>To: {filters.dateTo}</span>
                <button
                  onClick={() => handleFilterChange('dateTo', undefined)}
                  className="ml-1 hover:text-orange-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
