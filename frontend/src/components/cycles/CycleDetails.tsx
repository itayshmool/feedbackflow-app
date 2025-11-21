// frontend/src/components/cycles/CycleDetails.tsx

import React, { useEffect, useState } from 'react';
import { Calendar, Users, Settings, Edit, Play, Square, Archive, Trash2, X, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { useCyclesStore } from '../../stores/cyclesStore';
import { Cycle, CycleStatus, CycleType } from '../../types/cycles.types';
import { dateUtils } from '../../lib/utils';

interface CycleDetailsProps {
  cycleId: string;
  onClose: () => void;
  onEdit?: (cycle: Cycle) => void;
}

export const CycleDetails: React.FC<CycleDetailsProps> = ({ cycleId, onClose, onEdit }) => {
  const {
    currentCycle,
    cycleParticipants,
    isLoading,
    isUpdating,
    error,
    fetchCycle,
    fetchCycleParticipants,
    activateCycle,
    closeCycle,
    deleteCycle,
    canDeleteCycle,
  } = useCyclesStore();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<{ canDelete: boolean; feedbackCount: number; requestCount: number; reason: string } | null>(null);

  useEffect(() => {
    fetchCycle(cycleId);
    fetchCycleParticipants(cycleId);
  }, [cycleId, fetchCycle, fetchCycleParticipants]);

  useEffect(() => {
    if (currentCycle && currentCycle.id) {
      canDeleteCycle(currentCycle.id).then(setDeleteStatus);
    }
  }, [currentCycle, canDeleteCycle]);

  const getStatusBadge = (status: CycleStatus) => {
    switch (status) {
      case CycleStatus.ACTIVE:
        return <Badge variant="success">Active</Badge>;
      case CycleStatus.DRAFT:
        return <Badge variant="secondary">Draft</Badge>;
      case CycleStatus.IN_PROGRESS:
        return <Badge variant="primary">In Progress</Badge>;
      case CycleStatus.CLOSED:
        return <Badge variant="outline">Closed</Badge>;
      case CycleStatus.ARCHIVED:
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: CycleType) => {
    switch (type) {
      case CycleType.ANNUAL:
        return 'Annual';
      case CycleType.QUARTERLY:
        return 'Quarterly';
      case CycleType.MONTHLY:
        return 'Monthly';
      case CycleType.PROJECT_BASED:
        return 'Project Based';
      case CycleType.CUSTOM:
        return 'Custom';
      default:
        return type;
    }
  };

  const handleActivate = async () => {
    if (currentCycle) {
      await activateCycle(currentCycle.id);
    }
  };

  const handleClose = async () => {
    if (currentCycle) {
      await closeCycle(currentCycle.id);
    }
  };

  const handleDelete = async () => {
    if (currentCycle) {
      const success = await deleteCycle(currentCycle.id);
      if (success) {
        onClose();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading cycle details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentCycle) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-8 text-center">
            <p className="text-red-600 mb-4">{error || 'Cycle not found'}</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  // Ensure settings object exists with defaults
  const defaultSettings = {
    allowSelfReview: false,
    allowPeerReview: false,
    allowManagerReview: false,
    allowUpwardReview: false,
    requireAcknowledgment: false,
    feedbackSettings: {
      allowAnonymous: false,
      requireComments: false,
      categories: []
    }
  };

  const settings = {
    ...defaultSettings,
    ...currentCycle.settings,
    feedbackSettings: {
      ...defaultSettings.feedbackSettings,
      ...(currentCycle.settings?.feedbackSettings || {})
    }
  };

  const progressPercentage = currentCycle.participants 
    ? (currentCycle.completed || 0) / currentCycle.participants * 100 
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{currentCycle.name}</h2>
            <p className="text-sm text-gray-600 mt-1">{currentCycle.description}</p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(currentCycle.status)}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Basic Information
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="text-sm text-gray-900">{getTypeLabel(currentCycle.type)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(currentCycle.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <p className="text-sm text-gray-900">
                    {currentCycle.startDate ? dateUtils.format(new Date(currentCycle.startDate), 'MMM dd, yyyy') : 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <p className="text-sm text-gray-900">
                    {currentCycle.endDate ? dateUtils.format(new Date(currentCycle.endDate), 'MMM dd, yyyy') : 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created By</label>
                  <p className="text-sm text-gray-900">{currentCycle.creatorName || currentCycle.createdBy}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created At</label>
                  <p className="text-sm text-gray-900">
                    {currentCycle.createdAt ? dateUtils.format(new Date(currentCycle.createdAt), 'MMM dd, yyyy') : 'Not set'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Participants
                </h3>
                <Button variant="outline" size="sm" leftIcon={<UserPlus className="h-4 w-4" />}>
                  Add Participants
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">
                      {currentCycle.completed || 0}/{currentCycle.participants || 0} completed
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Participants List */}
                <div className="space-y-2">
                  {cycleParticipants.length > 0 ? (
                    cycleParticipants.map((participant) => (
                      <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{participant.userId}</p>
                          <p className="text-sm text-gray-600 capitalize">{participant.role}</p>
                        </div>
                        <Badge variant={participant.status === 'completed' ? 'success' : 'secondary'}>
                          {participant.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No participants added yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Review Types</h4>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${settings.allowSelfReview ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm text-gray-700">Self Review</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${settings.allowPeerReview ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm text-gray-700">Peer Review</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${settings.allowManagerReview ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm text-gray-700">Manager Review</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${settings.allowUpwardReview ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm text-gray-700">Upward Review</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Feedback Settings</h4>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${settings.requireAcknowledgment ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm text-gray-700">Require Acknowledgment</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${settings.feedbackSettings.allowAnonymous ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm text-gray-700">Allow Anonymous</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${settings.feedbackSettings.requireComments ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm text-gray-700">Require Comments</span>
                    </div>
                  </div>
                </div>
              </div>

              {settings.feedbackSettings.categories && settings.feedbackSettings.categories.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Feedback Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {settings.feedbackSettings.categories.map((category, index) => (
                      <Badge key={index} variant="outline">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="flex space-x-2">
              {currentCycle.status === CycleStatus.DRAFT && (
                <Button
                  variant="outline"
                  leftIcon={<Edit className="h-4 w-4" />}
                  onClick={() => onEdit?.(currentCycle)}
                >
                  Edit
                </Button>
              )}
              {currentCycle.status === CycleStatus.DRAFT && (
                <Button
                  leftIcon={<Play className="h-4 w-4" />}
                  onClick={handleActivate}
                  disabled={isUpdating}
                >
                  Activate
                </Button>
              )}
              {currentCycle.status === CycleStatus.ACTIVE && (
                <Button
                  variant="outline"
                  leftIcon={<Square className="h-4 w-4" />}
                  onClick={handleClose}
                  disabled={isUpdating}
                >
                  Close
                </Button>
              )}
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                leftIcon={<Archive className="h-4 w-4" />}
                disabled={isUpdating}
              >
                Archive
              </Button>
              <Button
                variant="outline"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isUpdating || (deleteStatus && !deleteStatus.canDelete)}
                title={deleteStatus && !deleteStatus.canDelete ? deleteStatus.reason : 'Delete cycle'}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Cycle</h3>
            {deleteStatus && !deleteStatus.canDelete ? (
              <div className="mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800 font-medium mb-2">Cannot delete this cycle</p>
                  <p className="text-red-700 text-sm">{deleteStatus.reason}</p>
                </div>
                <p className="text-gray-600">
                  Please remove all feedback responses and requests before deleting this cycle.
                </p>
              </div>
            ) : (
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this cycle? This action cannot be undone.
              </p>
            )}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDelete} 
                disabled={isUpdating || (deleteStatus && !deleteStatus.canDelete)}
              >
                {isUpdating ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
