import React, { useState, useEffect } from 'react';
import { useOrganizationStore } from '../../../stores/organizationStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import LoadingSpinner from '../../ui/LoadingSpinner';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  Building2,
  UserCheck,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';

interface OrganizationAnalyticsProps {
  organizationId: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const OrganizationAnalytics: React.FC<OrganizationAnalyticsProps> = ({ organizationId }) => {
  const {
    departments,
    teams,
    departmentsLoading,
    teamsLoading,
    fetchDepartments,
    fetchTeams,
  } = useOrganizationStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'teams'>('overview');

  useEffect(() => {
    fetchDepartments(organizationId);
    fetchTeams(organizationId);
  }, [organizationId, fetchDepartments, fetchTeams]);

  const isLoading = departmentsLoading || teamsLoading;

  // Calculate statistics
  const stats = {
    totalDepartments: departments?.length || 0,
    totalTeams: teams?.length || 0,
    activeDepartments: departments?.filter(d => d.isActive).length || 0,
    activeTeams: teams?.filter(t => t.isActive).length || 0,
  };

  // Department distribution data
  const departmentData = departments?.map((dept, index) => ({
    name: dept.name,
    teams: teams?.filter(t => t.departmentId === dept.id).length || 0,
    color: COLORS[index % COLORS.length],
  })) || [];

  // Team type distribution
  const teamTypeData = [
    {
      name: 'Core',
      value: teams?.filter(t => t.type === 'core').length || 0,
    },
    {
      name: 'Cross-functional',
      value: teams?.filter(t => t.type === 'cross_functional').length || 0,
    },
    {
      name: 'Custom',
      value: teams?.filter(t => t.type === 'custom').length || 0,
    },
  ].filter(item => item.value > 0);

  // Teams per department bar chart
  const teamsPerDeptData = departments?.map(dept => ({
    name: dept.name.length > 15 ? dept.name.substring(0, 15) + '...' : dept.name,
    teams: teams?.filter(t => t.departmentId === dept.id).length || 0,
  })) || [];

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'departments', label: 'Departments', icon: Building2 },
            { id: 'teams', label: 'Teams', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Departments</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalDepartments}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Teams</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalTeams}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Departments</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stats.activeDepartments}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <UserCheck className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Teams</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stats.activeTeams}</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-full">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Teams per Department Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Teams per Department</CardTitle>
              </CardHeader>
              <CardContent>
                {teamsPerDeptData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={teamsPerDeptData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="teams" fill="#3B82F6" name="Number of Teams" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Type Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Team Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {teamTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={teamTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {teamTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    No team data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Department Status */}
          <Card>
            <CardHeader>
              <CardTitle>Department Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departments && departments.length > 0 ? (
                  departments.map((dept, index) => {
                    const teamCount = teams?.filter(t => t.departmentId === dept.id).length || 0;
                    return (
                      <div key={dept.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div>
                            <p className="font-medium text-gray-900">{dept.name}</p>
                            <p className="text-sm text-gray-500">{dept.description || 'No description'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Teams</p>
                            <p className="text-lg font-semibold text-gray-900">{teamCount}</p>
                          </div>
                          <div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                dept.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {dept.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No departments found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Department Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {departmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={departmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="teams" fill="#3B82F6" name="Number of Teams" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500">
                  No department data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Department List with Details */}
          <Card>
            <CardHeader>
              <CardTitle>Department Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departments && departments.length > 0 ? (
                  departments.map((dept, index) => {
                    const deptTeams = teams?.filter(t => t.departmentId === dept.id) || [];
                    const activeTeams = deptTeams.filter(t => t.isActive).length;
                    
                    return (
                      <div key={dept.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div
                              className="w-12 h-12 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: COLORS[index % COLORS.length] + '20' }}
                            >
                              <Building2
                                className="w-6 h-6"
                                style={{ color: COLORS[index % COLORS.length] }}
                              />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">{dept.description || 'No description'}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <div className="text-sm">
                                  <span className="text-gray-600">Total Teams:</span>
                                  <span className="font-medium text-gray-900 ml-1">{deptTeams.length}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-gray-600">Active:</span>
                                  <span className="font-medium text-green-600 ml-1">{activeTeams}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-gray-600">Inactive:</span>
                                  <span className="font-medium text-gray-600 ml-1">{deptTeams.length - activeTeams}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                dept.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {dept.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No departments found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Team Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {teamTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={teamTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {teamTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    No team data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Status */}
            <Card>
              <CardHeader>
                <CardTitle>Team Status</CardTitle>
              </CardHeader>
              <CardContent>
                {teams && teams.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Active', value: stats.activeTeams },
                          { name: 'Inactive', value: stats.totalTeams - stats.activeTeams },
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#10B981" />
                        <Cell fill="#EF4444" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    No team data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Team List */}
          <Card>
            <CardHeader>
              <CardTitle>Team Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teams && teams.length > 0 ? (
                  teams.map((team) => {
                    const department = departments?.find(d => d.id === team.departmentId);
                    
                    return (
                      <div key={team.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-purple-100 rounded">
                            <Users className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{team.name}</p>
                            <div className="flex items-center space-x-3 mt-1">
                              <p className="text-sm text-gray-500">
                                {department ? department.name : 'No department'}
                              </p>
                              <span className="text-gray-300">•</span>
                              <p className="text-sm text-gray-500 capitalize">
                                {team.type.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              team.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {team.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No teams found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OrganizationAnalytics;

