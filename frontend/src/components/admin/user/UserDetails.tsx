import React from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { User } from '@/types/user.types';
import { useOrganizationStore } from '@/stores/organizationStore';
import { 
  X, 
  Edit, 
  Mail, 
  Shield, 
  Calendar, 
  Building, 
  MapPin,
  User as UserIcon,
  Clock,
  CheckCircle,
  XCircle,
  Key,
  Send
} from 'lucide-react';

interface UserDetailsProps {
  user: User;
  onClose: () => void;
  onEdit: () => void;
}

export const UserDetails: React.FC<UserDetailsProps> = ({ user, onClose, onEdit }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeVariant = (isActive: boolean) => {
    return isActive ? 'success' : 'secondary';
  };

  const getVerificationBadgeVariant = (emailVerified: boolean) => {
    return emailVerified ? 'success' : 'warning';
  };

  // Get organization name from store
  const { organizations } = useOrganizationStore();
  const getOrganizationDisplay = () => {
    if (!user.organizationId) return 'Not assigned';
    const org = organizations.find(o => o.id === user.organizationId);
    if (org) {
      return `${org.name} (${org.slug})`;
    }
    return user.organizationId; // Fallback to ID if not found
  };

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          {user.avatarUrl ? (
            <img
              className="h-16 w-16 rounded-full object-cover"
              src={user.avatarUrl}
              alt={user.name}
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-2xl font-medium text-gray-600">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-600">{user.email}</p>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant={getStatusBadgeVariant(user.isActive)}>
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant={getVerificationBadgeVariant(user.emailVerified)}>
                {user.emailVerified ? 'Verified' : 'Unverified'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <UserIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <p className="text-sm text-gray-900">{user.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-gray-900">{user.email}</p>
                {user.emailVerified ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-yellow-500" />
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <p className="text-sm text-gray-900">{user.department || 'Not specified'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position
              </label>
              <p className="text-sm text-gray-900">{user.position || 'Not specified'}</p>
            </div>
          </div>
        </Card>

        {/* Roles & Permissions */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Roles & Permissions</h3>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned Roles
            </label>
            {user.roles && user.roles.length > 0 ? (
              <div className="space-y-2">
                {user.roles.map((role) => (
                  <div key={role.id} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm">
                      {role.roleName}
                    </Badge>
                    {(role.organizationName || role.organizationSlug) && (
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {role.organizationName}
                        {role.organizationSlug && (
                          <span className="text-gray-400">({role.organizationSlug})</span>
                        )}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No roles assigned</p>
            )}
          </div>
        </Card>

        {/* Organization Information */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Building className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Organization</h3>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization
            </label>
            <p className="text-sm text-gray-900">{getOrganizationDisplay()}</p>
          </div>
        </Card>

        {/* Activity Information */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Activity</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Login
              </label>
              <p className="text-sm text-gray-900">
                {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never logged in'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Created
              </label>
              <p className="text-sm text-gray-900">{formatDate(user.createdAt)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Updated
              </label>
              <p className="text-sm text-gray-900">{formatDate(user.updatedAt)}</p>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Key className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm">
              <Key className="h-4 w-4 mr-2" />
              Reset Password
            </Button>
            {!user.emailVerified && (
              <Button variant="outline" size="sm">
                <Send className="h-4 w-4 mr-2" />
                Send Verification Email
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Send Welcome Email
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

