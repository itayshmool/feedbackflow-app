// frontend/src/pages/admin/HierarchyManagement.tsx

import React, { useState, useEffect } from 'react';
import { useHierarchyStore } from '../../stores/hierarchyStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/Avatar';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  AlertCircle, 
  CheckCircle,
  Building,
  UserPlus,
  UserMinus,
  TreePine,
  BarChart3,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const HierarchyManagement: React.FC = () => {
  const { organizations, fetchOrganizations } = useOrganizationStore();
  const { 
    hierarchyTree, 
    stats, 
    searchResults,
    managerSearchResults,
    employeeSearchResults,
    isLoading, 
    isUpdating,
    error, 
    fetchHierarchyTree, 
    fetchHierarchyStats,
    searchEmployees,
    searchManagers,
    createHierarchy,
    deleteHierarchy,
    clearError,
    clearSearchResults
  } = useHierarchyStore();

  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHierarchy, setNewHierarchy] = useState({
    managerId: '',
    employeeId: '',
    isDirectReport: true
  });
  const [managerSearchQuery, setManagerSearchQuery] = useState<string>('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [localManagerSearchResults, setLocalManagerSearchResults] = useState<any[]>([]);
  const [localEmployeeSearchResults, setLocalEmployeeSearchResults] = useState<any[]>([]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Load organizations on component mount
  useEffect(() => {
    fetchOrganizations({ limit: 100 }); // Fetch all organizations
  }, [fetchOrganizations]);

  useEffect(() => {
    if (organizations.length > 0 && !selectedOrganization) {
      setSelectedOrganization(organizations[0].id);
    }
  }, [organizations, selectedOrganization]);

  useEffect(() => {
    if (selectedOrganization) {
      fetchHierarchyTree(selectedOrganization);
      fetchHierarchyStats(selectedOrganization);
    }
  }, [selectedOrganization, fetchHierarchyTree, fetchHierarchyStats]);

  // Ensure root is expanded when a new tree loads
  useEffect(() => {
    if (hierarchyTree?.id) {
      setExpandedNodeIds(prev => new Set(prev).add(hierarchyTree.id));
    }
  }, [hierarchyTree?.id]);

  useEffect(() => {
    if (searchQuery.length >= 2 && selectedOrganization) {
      searchEmployees(selectedOrganization, searchQuery);
    } else {
      clearSearchResults();
    }
  }, [searchQuery, selectedOrganization, searchEmployees, clearSearchResults]);

  // Handle manager search (manager-only) with debounce
  useEffect(() => {
    if (!selectedOrganization) return;
    if (managerSearchQuery.length < 2) {
      setLocalManagerSearchResults([]);
      return;
    }
    const id = setTimeout(() => {
      searchManagers(selectedOrganization, managerSearchQuery);
    }, 250);
    return () => clearTimeout(id);
  }, [managerSearchQuery, selectedOrganization, searchManagers]);

  // Handle employee search with debounce
  useEffect(() => {
    if (!selectedOrganization) return;
    if (employeeSearchQuery.length < 2) {
      setLocalEmployeeSearchResults([]);
      return;
    }
    const id = setTimeout(() => {
      searchEmployees(selectedOrganization, employeeSearchQuery);
    }, 250);
    return () => clearTimeout(id);
  }, [employeeSearchQuery, selectedOrganization, searchEmployees]);

  // Sync store search results with local state
  useEffect(() => {
    setLocalManagerSearchResults(managerSearchResults);
  }, [managerSearchResults]);

  useEffect(() => {
    setLocalEmployeeSearchResults(employeeSearchResults);
  }, [employeeSearchResults]);

  const handleAddHierarchy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!newHierarchy.managerId || !newHierarchy.employeeId) return;
    setIsSubmitting(true);

    const success = await createHierarchy({
      organizationId: selectedOrganization,
      ...newHierarchy
    });

    if (success) {
      setShowAddForm(false);
      setNewHierarchy({ managerId: '', employeeId: '', isDirectReport: true });
      setManagerSearchQuery('');
      setEmployeeSearchQuery('');
      setLocalManagerSearchResults([]);
      setLocalEmployeeSearchResults([]);
      // Refresh data
      fetchHierarchyTree(selectedOrganization);
      fetchHierarchyStats(selectedOrganization);
    }
    setIsSubmitting(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await (await import('../../services/hierarchy.service')).downloadHierarchyTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hierarchy-template.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download template', e);
      alert('Failed to download template');
    }
  };

  const handleUploadCsv = async (file: File) => {
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const svc = await import('../../services/hierarchy.service');
      const result = await svc.importHierarchyCsv(text);
      // Refresh data after import
      if (selectedOrganization) {
        fetchHierarchyTree(selectedOrganization);
        fetchHierarchyStats(selectedOrganization);
      }
      alert(`Import complete. Created: ${result.created}, Updated: ${result.updated}, Errors: ${result.errors.length}`);
    } catch (e) {
      console.error('CSV import failed', e);
      alert('CSV import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteHierarchy = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this hierarchy relationship?')) {
      const success = await deleteHierarchy(id);
      if (success) {
        // Refresh data
        fetchHierarchyTree(selectedOrganization);
        fetchHierarchyStats(selectedOrganization);
      }
    }
  };

  const toggleNode = (id: string) => {
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    // Collect all ids with a DFS
    const allIds = new Set<string>();
    const walk = (n: any) => {
      if (!n) return;
      allIds.add(n.id);
      (n.directReports || []).forEach((c: any) => walk(c));
    };
    walk(hierarchyTree);
    setExpandedNodeIds(allIds);
  };

  const collapseAll = () => {
    setExpandedNodeIds(new Set(hierarchyTree?.id ? [hierarchyTree.id] : []));
  };

  const renderHierarchyNode = (node: any, level: number = 0) => {
    const isExpanded = expandedNodeIds.has(node.id);
    return (
      <div key={node.id} className="ml-4">
        <div className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg mb-2">
          <div className="flex items-center space-x-2">
            {Array.from({ length: level }).map((_, i) => (
              <div key={i} className="w-4 h-px bg-gray-300" />
            ))}
            <button
              type="button"
              onClick={() => toggleNode(node.id)}
              className="p-0.5 rounded hover:bg-gray-100 focus:outline-none"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )}
            </button>
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
          </div>
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={node.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${node.name}`} 
              alt={node.name} 
            />
            <AvatarFallback className="text-xs font-semibold bg-gray-200 text-gray-700">
              {node.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {node.name}
              {node.isManager && node.employeeCount !== undefined && node.employeeCount > 0 && (
                <span className="text-gray-500 ml-1">({node.employeeCount})</span>
              )}
            </p>
            <p className="text-xs text-gray-500">{node.position}</p>
          </div>
          <div className="flex items-center space-x-2">
            {node.isManager && (
              <Badge variant="success">Manager</Badge>
            )}
          </div>
        </div>
        {isExpanded && node.directReports && node.directReports.map((child: any) => 
          renderHierarchyNode(child, level + 1)
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <TreePine className="h-6 w-6 mr-2" />
          Organizational Hierarchy
        </h1>
        <p className="text-gray-600 mt-1">
          Manage the organizational structure and reporting relationships
        </p>
      </div>

      {/* Organization Selector */}
      <Card className="p-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Building className="h-5 w-5 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Organization:</label>
          </div>
          <Select
            value={selectedOrganization}
            onChange={(e) => setSelectedOrganization(e.target.value)}
            className="min-w-64"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} (@{org.slug})
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-800">{error}</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearError}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              Clear Error
            </Button>
          </div>
        </Card>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <UserPlus className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Managers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalManagers}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Avg. Span</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageSpanOfControl.toFixed(1)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <TreePine className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Max Depth</p>
                <p className="text-2xl font-bold text-gray-900">{stats.maxDepth}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <UserMinus className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Orphaned</p>
                <p className="text-2xl font-bold text-gray-900">{stats.orphanedEmployees}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hierarchy Tree */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Organizational Tree</h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={expandAll}>Expand All</Button>
                <Button size="sm" variant="outline" onClick={collapseAll}>Collapse All</Button>
                <Button
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    if (!showAddForm) {
                      // Reset form when opening
                      setNewHierarchy({ managerId: '', employeeId: '', isDirectReport: true });
                      setManagerSearchQuery('');
                      setEmployeeSearchQuery('');
                      setLocalManagerSearchResults([]);
                      setLocalEmployeeSearchResults([]);
                    }
                  }}
                  icon={Plus}
                  size="sm"
                >
                  Add Relationship
                </Button>
              </div>
            </div>
            
            {hierarchyTree ? (
              <div className="space-y-2">
                {renderHierarchyNode(hierarchyTree)}
              </div>
            ) : (
              <div className="text-center py-8">
                <TreePine className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hierarchy data available</p>
              </div>
            )}
          </Card>
        </div>

        {/* Add Relationship Form */}
        <div className="space-y-6">
          {/* Bulk Import */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Bulk Import</h3>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={handleDownloadTemplate}>
                Download CSV Template
              </Button>
              <label className="inline-flex items-center px-3 py-2 border rounded-md cursor-pointer bg-white hover:bg-gray-50 text-sm">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadCsv(f);
                    e.currentTarget.value = '';
                  }}
                />
                {isImporting ? 'Importing…' : 'Upload CSV'}
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">CSV columns: organization_name, employee_email, manager_email</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Add Relationship</h3>
            
            <form onSubmit={handleAddHierarchy} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manager
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search for manager..."
                    value={managerSearchQuery}
                    onChange={(e) => setManagerSearchQuery(e.target.value)}
                    onFocus={() => setManagerSearchQuery('')}
                  />
                  <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
                {localManagerSearchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                    {localManagerSearchResults.map((employee) => (
                      <div
                        key={employee.id}
                        className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setNewHierarchy(prev => ({ ...prev, managerId: employee.id }));
                          setManagerSearchQuery(employee.name);
                          setLocalManagerSearchResults([]);
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage 
                              src={employee.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.name}`} 
                              alt={employee.name} 
                            />
                            <AvatarFallback className="text-xs">
                              {employee.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{employee.name}</p>
                            <p className="text-xs text-gray-500">{employee.position}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search for employee..."
                    value={employeeSearchQuery}
                    onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                    onFocus={() => setEmployeeSearchQuery('')}
                  />
                  <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
                {localEmployeeSearchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                    {localEmployeeSearchResults.map((employee) => (
                      <div
                        key={employee.id}
                        className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setNewHierarchy(prev => ({ ...prev, employeeId: employee.id }));
                          setEmployeeSearchQuery(employee.name);
                          setLocalEmployeeSearchResults([]);
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage 
                              src={employee.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.name}`} 
                              alt={employee.name} 
                            />
                            <AvatarFallback className="text-xs">
                              {employee.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{employee.name}</p>
                            <p className="text-xs text-gray-500">{employee.position}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>


              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDirectReport"
                  checked={newHierarchy.isDirectReport}
                  onChange={(e) => setNewHierarchy(prev => ({ ...prev, isDirectReport: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isDirectReport" className="text-sm text-gray-700">
                  Direct Report
                </label>
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!newHierarchy.managerId || !newHierarchy.employeeId || isUpdating}
                  className="flex-1"
                >
                  {isUpdating ? 'Adding...' : 'Add Relationship'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HierarchyManagement;
