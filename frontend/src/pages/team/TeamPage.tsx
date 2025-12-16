// frontend/src/pages/team/TeamPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useHierarchyStore } from '../../stores/hierarchyStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { HierarchyNode } from '../../types/hierarchy.types';
import { 
  Users, 
  ChevronRight, 
  AlertCircle,
  MessageSquare,
  UserPlus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function TeamPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    directReports,
    hierarchyTree,
    isLoading,
    error,
    fetchDirectReports,
    fetchHierarchyTree,
  } = useHierarchyStore();
  
  // State for expanded tree nodes
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (user?.id) {
      fetchDirectReports(user.id);
      if (user.organizationId) {
        fetchHierarchyTree(user.organizationId);
      }
    }
  }, [user, fetchDirectReports, fetchHierarchyTree]);
  
  // Set initial expanded state when hierarchy tree loads
  useEffect(() => {
    if (hierarchyTree && user?.id) {
      const userNode = findUserNode(hierarchyTree, user.id);
      if (userNode) {
        setExpandedNodes(new Set([userNode.id]));
      } else {
        setExpandedNodes(new Set([hierarchyTree.id]));
      }
    }
  }, [hierarchyTree, user?.id]);

  // Find the current user's node in the hierarchy tree
  const findUserNode = (tree: HierarchyNode | null, userId: string): HierarchyNode | null => {
    if (!tree) return null;
    if (tree.id === userId) return tree;
    for (const child of tree.directReports || []) {
      const found = findUserNode(child, userId);
      if (found) return found;
    }
    return null;
  };

  // Count total team members (recursive)
  const countTeamMembers = (node: HierarchyNode | null): number => {
    if (!node) return 0;
    let count = 0;
    for (const child of node.directReports || []) {
      count += 1 + countTeamMembers(child);
    }
    return count;
  };

  // Avatar color gradients by level
  const avatarGradients = [
    'from-emerald-500 to-teal-600',      // Level 0 - Current user
    'from-blue-500 to-indigo-600',        // Level 1
    'from-purple-500 to-pink-600',        // Level 2
    'from-orange-500 to-red-600',         // Level 3
    'from-cyan-500 to-blue-600',          // Level 4+
  ];
  
  const getAvatarGradient = (level: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return avatarGradients[0];
    return avatarGradients[Math.min(level, avatarGradients.length - 1)];
  };

  // Recursive function to render hierarchy tree nodes
  const renderHierarchyNode = (node: HierarchyNode, level: number = 0, isCurrentUser: boolean = false): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.directReports && node.directReports.length > 0;
    const isDirectReport = directReports.some(dr => dr.id === node.id);
    
    // Limit indentation on mobile
    const mobileIndent = Math.min(level, 4);
    const indentPx = mobileIndent * 24;
    
    // Handle click on the row - only for direct reports
    const handleRowClick = () => {
      if (isDirectReport && !isCurrentUser) {
        navigate(`/team/${node.id}`);
      }
    };

    // Handle give feedback click
    const handleGiveFeedback = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(`/feedback?action=give&recipient=${encodeURIComponent(node.email || '')}&name=${encodeURIComponent(node.name)}`);
    };
    
    return (
      <div key={node.id} className="select-none">
        {/* Node card */}
        <div 
          className={`
            relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl mb-2 
            transition-all duration-200 ease-out
            ${isCurrentUser 
              ? 'bg-white border-l-4 border-l-emerald-500 border border-emerald-200 shadow-md' 
              : isDirectReport
                ? 'bg-white border border-gray-200 hover:border-primary-400 hover:shadow-lg hover:bg-primary-50/30 hover:-translate-y-0.5 cursor-pointer group'
                : 'bg-gray-50/80 border border-gray-100'
            }
          `}
          style={{ marginLeft: `${indentPx}px` }}
          onClick={handleRowClick}
        >
          {/* Connecting line to parent */}
          {level > 0 && (
            <div 
              className="hidden sm:block absolute -left-3 top-1/2 w-3 h-px bg-gray-300"
              style={{ marginLeft: `${-indentPx + 12}px` }}
            />
          )}
          
          {/* Expand/collapse button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              hasChildren && toggleNode(node.id);
            }}
            className={`
              p-1.5 rounded-lg transition-all duration-200
              ${hasChildren 
                ? 'hover:bg-gray-100 cursor-pointer active:scale-95' 
                : 'opacity-0'
              }
            `}
            disabled={!hasChildren}
          >
            {hasChildren && (
              <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            )}
          </button>
          
          {/* Avatar */}
          <div className={`
            relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0
            bg-gradient-to-br ${getAvatarGradient(level, isCurrentUser)}
            shadow-md ring-2 ring-white
            ${isDirectReport && !isCurrentUser ? 'group-hover:ring-primary-200 group-hover:shadow-lg transition-all duration-200' : ''}
          `}>
            <span className="text-base sm:text-lg font-bold text-white drop-shadow-sm">
              {node.name.charAt(0).toUpperCase()}
            </span>
            {/* Manager badge */}
            {hasChildren && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-indigo-500 rounded-full flex items-center justify-center ring-2 ring-white shadow-sm">
                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-semibold text-sm sm:text-base ${isCurrentUser ? 'text-emerald-700' : 'text-gray-900'} ${isDirectReport && !isCurrentUser ? 'group-hover:text-primary-700 transition-colors' : ''}`}>
                {node.name}
              </h4>
              {isCurrentUser && (
                <span className="text-xs px-2.5 py-0.5 bg-emerald-500 text-white rounded-full font-medium shadow-sm">
                  You
                </span>
              )}
              {isDirectReport && !isCurrentUser && (
                <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full font-medium group-hover:bg-primary-200 transition-colors">
                  Direct
                </span>
              )}
              {hasChildren && (
                <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-medium hidden sm:inline-flex items-center gap-1.5 border border-slate-200">
                  <Users className="w-3 h-3" />
                  {node.directReports.length} {node.directReports.length === 1 ? 'report' : 'reports'}
                </span>
              )}
            </div>
            <p className={`text-xs sm:text-sm text-gray-500 truncate mt-0.5 ${isDirectReport && !isCurrentUser ? 'group-hover:text-gray-600 transition-colors' : ''}`}>
              {node.position || 'Team Member'}
              {node.department && <span className="hidden sm:inline text-gray-400"> • {node.department}</span>}
            </p>
          </div>
          
          {/* Give Feedback button - for direct reports */}
          {isDirectReport && !isCurrentUser && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGiveFeedback}
              className="hidden sm:flex items-center gap-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Feedback
            </Button>
          )}
          
          {/* Clickable indicator for direct reports */}
          {isDirectReport && !isCurrentUser && (
            <div className="flex items-center text-gray-300 group-hover:text-primary-500 transition-colors sm:hidden">
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
          
          {/* Mobile team count */}
          {hasChildren && (
            <span className="sm:hidden text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-full font-medium border border-slate-200">
              {node.directReports.length}
            </span>
          )}
        </div>
        
        {/* Children with animation */}
        {hasChildren && (
          <div 
            className={`
              relative overflow-hidden transition-all duration-300 ease-out
              ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
            `}
          >
            {/* Vertical connecting line */}
            <div 
              className="hidden sm:block absolute top-0 bottom-4 w-0.5 bg-gradient-to-b from-gray-300 to-transparent rounded-full"
              style={{ left: `${indentPx + 32}px` }}
            />
            {node.directReports.map((child) => renderHierarchyNode(child, level + 1, false))}
          </div>
        )}
      </div>
    );
  };

  const userNode = user?.id ? findUserNode(hierarchyTree, user.id) : null;
  const totalTeamSize = userNode ? countTeamMembers(userNode) : directReports.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Team</h1>
          <p className="text-base sm:text-lg text-gray-600 mt-1">
            View your team hierarchy and give feedback
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg">
            <div className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-2.5 bg-white/20 rounded-xl w-fit">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">
                    {directReports.length}
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-blue-100">Direct Reports</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-lg">
            <div className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-2.5 bg-white/20 rounded-xl w-fit">
                  <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">
                    {totalTeamSize}
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-purple-100">Total Team</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Controls */}
        {userNode && userNode.directReports?.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Click on a team member to view their feedback history
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allIds = new Set<string>();
                  const collectIds = (n: HierarchyNode) => {
                    allIds.add(n.id);
                    (n.directReports || []).forEach(collectIds);
                  };
                  collectIds(userNode);
                  setExpandedNodes(allIds);
                }}
                className="text-xs"
              >
                <ChevronDown className="w-3.5 h-3.5 mr-1" />
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedNodes(new Set([userNode.id]))}
                className="text-xs"
              >
                <ChevronUp className="w-3.5 h-3.5 mr-1" />
                Collapse
              </Button>
            </div>
          </div>
        )}

        {/* Team Hierarchy */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-500">Loading team hierarchy...</p>
          </div>
        ) : error ? (
          <Card className="p-6 border-red-200 bg-red-50">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          </Card>
        ) : userNode ? (
          <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
              <div className="space-y-2">
                {renderHierarchyNode(userNode, 0, true)}
              </div>
            </div>
          </Card>
        ) : directReports.length > 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
              <div className="space-y-2">
                {directReports.map((member) => renderHierarchyNode(member, 0, false))}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
            <div className="p-12 sm:p-16 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No Team Members</h3>
              <p className="text-gray-600 text-sm sm:text-base max-w-sm mx-auto">
                Your team hierarchy will appear here once team members are added to your organization.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

