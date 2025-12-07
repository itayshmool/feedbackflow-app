import React, { useState, useEffect } from 'react';
import { Check, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { userService } from '@/services/user.service';
import { AssignableOrganization } from '@/types/user.types';

interface AdminRoleOrganizationSelectorProps {
  selectedOrgIds: string[];
  onChange: (orgIds: string[]) => void;
  disabled?: boolean;
  existingAdminOrgIds?: string[]; // Organizations user already has admin access to (for edit mode)
}

export const AdminRoleOrganizationSelector: React.FC<AdminRoleOrganizationSelectorProps> = ({
  selectedOrgIds,
  onChange,
  disabled = false,
  existingAdminOrgIds = [],
}) => {
  const [organizations, setOrganizations] = useState<AssignableOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await userService.getAssignableOrganizations();
        if (response.success) {
          setOrganizations(response.data || []);
        } else {
          setError('Failed to load organizations');
        }
      } catch (err) {
        console.error('Error fetching assignable organizations:', err);
        setError('Failed to load organizations. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const handleToggleOrg = (orgId: string) => {
    if (disabled) return;
    
    const newSelection = selectedOrgIds.includes(orgId)
      ? selectedOrgIds.filter(id => id !== orgId)
      : [...selectedOrgIds, orgId];
    
    onChange(newSelection);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onChange(filteredOrganizations.map(org => org.id));
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  // Filter organizations based on search term
  const filteredOrganizations = organizations.filter(org => {
    const searchLower = searchTerm.toLowerCase();
    return (
      org.name.toLowerCase().includes(searchLower) ||
      org.slug.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
        <span className="text-sm text-gray-600">Loading organizations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center p-4 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
        <span className="text-sm text-red-700">{error}</span>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="flex items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
        <span className="text-sm text-yellow-700">
          No organizations available for assignment. You may not have permission to assign admin roles.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with selection info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building2 className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Admin Organizations
          </span>
          <span className="text-xs text-gray-500">
            ({selectedOrgIds.length} of {organizations.length} selected)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={disabled}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={disabled}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Search input */}
      {organizations.length > 5 && (
        <input
          type="text"
          placeholder="Search organizations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={disabled}
        />
      )}

      {/* Organization list */}
      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
        {filteredOrganizations.length === 0 ? (
          <div className="p-3 text-sm text-gray-500 text-center">
            No organizations match your search
          </div>
        ) : (
          filteredOrganizations.map((org) => {
            const isSelected = selectedOrgIds.includes(org.id);
            const isExisting = existingAdminOrgIds.includes(org.id);
            
            return (
              <div
                key={org.id}
                onClick={() => handleToggleOrg(org.id)}
                className={`
                  flex items-center justify-between px-3 py-2 cursor-pointer transition-colors
                  ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  border-b border-gray-100 last:border-b-0
                `}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${isSelected 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'border-gray-300 bg-white'
                      }
                    `}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {org.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {org.slug}
                    </div>
                  </div>
                </div>
                {isExisting && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                    Current
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Validation message */}
      {selectedOrgIds.length === 0 && (
        <p className="text-xs text-amber-600 flex items-center">
          <AlertCircle className="h-3 w-3 mr-1" />
          Admin role requires at least one organization
        </p>
      )}
    </div>
  );
};

export default AdminRoleOrganizationSelector;

