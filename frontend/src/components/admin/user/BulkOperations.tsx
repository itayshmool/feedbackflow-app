import React, { useState } from 'react';
import { useUserStore } from '@/stores/userStore';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BulkUserOperation } from '@/types/user.types';
import { X, Users, AlertTriangle } from 'lucide-react';

interface BulkOperationsProps {
  selectedUserIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkOperations: React.FC<BulkOperationsProps> = ({
  selectedUserIds,
  onClose,
  onSuccess,
}) => {
  const { roles, bulkUserOperation, isLoading } = useUserStore();
  const [operation, setOperation] = useState<BulkUserOperation['operation']>('activate');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setResult(null);

    try {
      const bulkOperation: BulkUserOperation = {
        operation,
        userIds: selectedUserIds,
        ...(operation === 'assign_role' || operation === 'remove_role' 
          ? { roleId: selectedRoleId }
          : {}
        ),
      };

      const result = await bulkUserOperation(bulkOperation);
      setResult(result);
      
      if (result.errors.length === 0) {
        onSuccess();
      }
    } catch (error) {
      setResult({
        success: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOperationDescription = (op: BulkUserOperation['operation']) => {
    switch (op) {
      case 'activate':
        return 'Activate selected users (allow them to log in)';
      case 'deactivate':
        return 'Deactivate selected users (prevent them from logging in)';
      case 'delete':
        return 'Permanently delete selected users (this action cannot be undone)';
      case 'assign_role':
        return 'Assign a role to selected users';
      case 'remove_role':
        return 'Remove a role from selected users';
      default:
        return '';
    }
  };

  const isDestructiveOperation = operation === 'delete';
  const requiresRole = operation === 'assign_role' || operation === 'remove_role';

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bulk Operations</h2>
            <p className="text-sm text-gray-600">
              Perform actions on {selectedUserIds.length} selected users
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Operation Selection */}
        <div>
          <Label htmlFor="operation">Select Operation</Label>
          <Select
            id="operation"
            value={operation}
            onValueChange={(value) => setOperation(value as BulkUserOperation['operation'])}
          >
            <option value="activate">Activate Users</option>
            <option value="deactivate">Deactivate Users</option>
            <option value="assign_role">Assign Role</option>
            <option value="remove_role">Remove Role</option>
            <option value="delete">Delete Users</option>
          </Select>
          <p className="mt-2 text-sm text-gray-600">
            {getOperationDescription(operation)}
          </p>
        </div>

        {/* Role Selection (if needed) */}
        {requiresRole && (
          <div>
            <Label htmlFor="role">Select Role</Label>
            <Select
              id="role"
              value={selectedRoleId}
              onValueChange={setSelectedRoleId}
            >
              <option value="">Choose a role...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Warning for destructive operations */}
        {isDestructiveOperation && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Warning</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    This action will permanently delete {selectedUserIds.length} users and all their data. 
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className={`border rounded-md p-4 ${
            result.errors.length === 0 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex">
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${
                  result.errors.length === 0 ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  Operation Complete
                </h3>
                <div className={`mt-2 text-sm ${
                  result.errors.length === 0 ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  <p>Successfully processed {result.success} users.</p>
                  {result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Errors:</p>
                      <ul className="list-disc list-inside mt-1">
                        {result.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (requiresRole && !selectedRoleId)}
            variant={isDestructiveOperation ? 'destructive' : 'default'}
          >
            {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
            {isSubmitting ? 'Processing...' : 'Execute Operation'}
          </Button>
        </div>
      </div>
    </div>
  );
};

