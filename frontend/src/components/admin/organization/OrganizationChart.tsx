import React, { useState, useEffect } from 'react';
import { useOrganizationStore } from '../../../stores/organizationStore';
import { OrganizationChart, OrganizationChartNode } from '../../../types/organization.types';
import Button from '../../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { RefreshCw, ZoomIn, ZoomOut, RotateCcw, Users, Building, User } from 'lucide-react';

interface OrganizationChartProps {
  organizationId: string;
}

interface ChartNodeProps {
  node: OrganizationChartNode;
  level: number;
  isExpanded: boolean;
  onToggle: (nodeId: string) => void;
}

const ChartNode: React.FC<ChartNodeProps> = ({ node, level, isExpanded, onToggle }) => {
  const hasChildren = node.children && node.children.length > 0;
  const indent = level * 40;

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'organization':
        return <Building className="w-4 h-4" />;
      case 'department':
        return <Users className="w-4 h-4" />;
      case 'team':
        return <User className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'organization':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'department':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'team':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div className="relative">
      {/* Connection Line */}
      {level > 0 && (
        <div
          className="absolute left-0 top-0 w-px bg-gray-300"
          style={{ height: '20px', left: `${indent - 20}px` }}
        />
      )}

      <div
        className="flex items-center py-2"
        style={{ paddingLeft: `${indent}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren && (
          <button
            onClick={() => onToggle(node.id)}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 mr-2"
          >
            <div className={`w-0 h-0 border-l-2 border-t-2 border-b-2 border-transparent border-l-gray-600 transform transition-transform ${
              isExpanded ? 'rotate-90' : 'rotate-0'
            }`} />
          </button>
        )}

        {/* Node Content */}
        <div className={`flex items-center px-3 py-2 rounded-lg border ${getNodeColor(node.type)}`}>
          <div className="mr-2">
            {getNodeIcon(node.type)}
          </div>
          <div>
            <div className="font-medium text-sm">{node.name}</div>
            {node.metadata?.memberCount && (
              <div className="text-xs opacity-75">
                {node.metadata.memberCount} members
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <ChartNode
              key={child.id}
              node={child}
              level={level + 1}
              isExpanded={isExpanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const OrganizationChartComponent: React.FC<OrganizationChartProps> = ({ organizationId }) => {
  const {
    organizationChart,
    chartLoading,
    chartError,
    generateOrganizationChart,
  } = useOrganizationStore();

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    generateOrganizationChart(organizationId);
  }, [organizationId, generateOrganizationChart]);

  const handleToggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleRefresh = () => {
    generateOrganizationChart(organizationId);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const expandAll = () => {
    if (organizationChart?.structure) {
      const allNodeIds = new Set<string>();
      const collectNodeIds = (node: OrganizationChartNode) => {
        allNodeIds.add(node.id);
        if (node.children) {
          node.children.forEach(collectNodeIds);
        }
      };
      collectNodeIds(organizationChart.structure);
      setExpandedNodes(allNodeIds);
    }
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  if (chartLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </Card>
    );
  }

  if (chartError) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <Building className="w-12 h-12 mx-auto mb-2" />
            <p className="font-medium">Failed to load organization chart</p>
            <p className="text-sm text-gray-600">{chartError}</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (!organizationChart) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No organization chart available</p>
          <Button onClick={handleRefresh} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate Chart
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Organization Chart</h3>
          <p className="text-sm text-gray-600">
            Version {organizationChart.version} • Last updated {new Date(organizationChart.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={expandAll} variant="outline" size="sm">
            Expand All
          </Button>
          <Button onClick={collapseAll} variant="outline" size="sm">
            Collapse All
          </Button>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Button onClick={handleZoomOut} variant="outline" size="sm">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button onClick={handleZoomIn} variant="outline" size="sm">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button onClick={handleResetZoom} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 overflow-auto">
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          className="min-w-full"
        >
          <ChartNode
            node={organizationChart.structure}
            level={0}
            isExpanded={expandedNodes.has(organizationChart.structure.id)}
            onToggle={handleToggleNode}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Legend</h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded mr-2" />
            <span className="text-sm text-gray-600">Organization</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2" />
            <span className="text-sm text-gray-600">Department</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded mr-2" />
            <span className="text-sm text-gray-600">Team</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default OrganizationChartComponent;
