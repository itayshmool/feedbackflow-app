import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { UserStats as UserStatsType } from '@/types/user.types';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Mail, 
  MailCheck, 
  TrendingUp,
  Building,
  Shield
} from 'lucide-react';

interface UserStatsProps {
  stats: UserStatsType;
}

export const UserStats: React.FC<UserStatsProps> = ({ stats }) => {
  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    description?: string;
  }> = ({ title, value, icon, color, description }) => (
    <Card className="p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value.toLocaleString()}</p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
      </div>
    </Card>
  );

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users className="h-6 w-6 text-white" />}
          color="bg-blue-500"
          description="All registered users"
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          icon={<UserCheck className="h-6 w-6 text-white" />}
          color="bg-green-500"
          description={`${getPercentage(stats.activeUsers, stats.totalUsers)}% of total`}
        />
        <StatCard
          title="Inactive Users"
          value={stats.inactiveUsers}
          icon={<UserX className="h-6 w-6 text-white" />}
          color="bg-gray-500"
          description={`${getPercentage(stats.inactiveUsers, stats.totalUsers)}% of total`}
        />
        <StatCard
          title="Recent Signups"
          value={stats.recentSignups}
          icon={<TrendingUp className="h-6 w-6 text-white" />}
          color="bg-purple-500"
          description="Last 30 days"
        />
      </div>

      {/* Email Verification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Verified Users"
          value={stats.verifiedUsers}
          icon={<MailCheck className="h-6 w-6 text-white" />}
          color="bg-green-500"
          description={`${getPercentage(stats.verifiedUsers, stats.totalUsers)}% verified`}
        />
        <StatCard
          title="Unverified Users"
          value={stats.unverifiedUsers}
          icon={<Mail className="h-6 w-6 text-white" />}
          color="bg-yellow-500"
          description={`${getPercentage(stats.unverifiedUsers, stats.totalUsers)}% unverified`}
        />
      </div>

      {/* Users by Role */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Users by Role</h3>
        </div>
        <div className="space-y-3">
          {stats.usersByRole.length > 0 ? (
            stats.usersByRole.map((role) => (
              <div key={role.roleName} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">{role.roleName}</Badge>
                  <span className="text-sm text-gray-600">
                    {getPercentage(role.count, stats.totalUsers)}% of users
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {role.count.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No role data available</p>
          )}
        </div>
      </Card>

      {/* Users by Department */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Building className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Users by Department</h3>
        </div>
        <div className="space-y-3">
          {stats.usersByDepartment.length > 0 ? (
            stats.usersByDepartment.map((dept) => (
              <div key={dept.department} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-900">{dept.department}</span>
                  <span className="text-sm text-gray-600">
                    {getPercentage(dept.count, stats.totalUsers)}% of users
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {dept.count.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No department data available</p>
          )}
        </div>
      </Card>

      {/* Users by Organization */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Building className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Users by Organization</h3>
        </div>
        <div className="space-y-3">
          {stats.usersByOrganization.length > 0 ? (
            stats.usersByOrganization.map((org) => (
              <div key={org.organizationName} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-900">{org.organizationName}</span>
                  <span className="text-sm text-gray-600">
                    {getPercentage(org.count, stats.totalUsers)}% of users
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {org.count.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No organization data available</p>
          )}
        </div>
      </Card>
    </div>
  );
};

