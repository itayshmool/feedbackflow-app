// Feedback Detail Component

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { Feedback, FeedbackStatus, GoalStatus, FeedbackColorClassification, Goal, GoalCategory, GoalPriority, UpdateGoalRequest } from '../../types/feedback.types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { FeedbackWorkflow } from './FeedbackWorkflow';
import {
  Calendar,
  User,
  Target,
  CheckCircle,
  Clock,
  Lock,
  Trash2,
  Edit,
  X,
  TrendingUp,
  Plus,
} from 'lucide-react';
import { PenOff } from '../icons';
import { createFeedbackDocxBlob } from '../../utils/generateFeedbackDocx';
import { ExportButtons } from '../ui/ExportButtons';
import { IconButton } from '../ui/IconButton';
import { useDocxExport } from '../../hooks/useDocxExport';

interface FeedbackDetailProps {
  feedbackId: string;
  onClose?: () => void;
  currentUserId?: string;
  openInEditMode?: boolean;
}

export const FeedbackDetail: React.FC<FeedbackDetailProps> = ({
  feedbackId,
  onClose,
  currentUserId,
  openInEditMode = false,
}) => {
  const {
    currentFeedback,
    isLoading,
    error,
    fetchFeedbackById,
    updateFeedback,
  } = useFeedbackStore();

  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState(currentFeedback?.content);
  const [editedColorClassification, setEditedColorClassification] = useState<FeedbackColorClassification | undefined>(
    currentFeedback?.colorClassification as FeedbackColorClassification | undefined
  );
  const [editedGoals, setEditedGoals] = useState<UpdateGoalRequest[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Export hook for download and Google Drive
  const { isDownloading, isUploadingToDrive, download, saveToDrive } = useDocxExport();

  useEffect(() => {
    fetchFeedbackById(feedbackId);
  }, [feedbackId, fetchFeedbackById]);

  useEffect(() => {
    if (currentFeedback?.content) {
      setEditedContent({
        ...currentFeedback.content,
        strengths: currentFeedback.content.strengths || [],
        areasForImprovement: currentFeedback.content.areasForImprovement || [],
        specificExamples: currentFeedback.content.specificExamples || [],
        recommendations: currentFeedback.content.recommendations || [],
        bottomLine: currentFeedback.content.bottomLine || '',
      });
    }
    if (currentFeedback?.colorClassification) {
      setEditedColorClassification(currentFeedback.colorClassification as FeedbackColorClassification);
    }
    if (currentFeedback?.goals) {
      setEditedGoals(currentFeedback.goals.map(goal => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        category: goal.category,
        priority: goal.priority,
        targetDate: goal.targetDate.split('T')[0], // Format for date input
        status: goal.status,
        progress: goal.progress,
      })));
    }
  }, [currentFeedback]);

  useEffect(() => {
    // If openInEditMode is true and feedback is a draft, enter edit mode
    if (openInEditMode && currentFeedback?.status === FeedbackStatus.DRAFT) {
      setIsEditMode(true);
    }
  }, [openInEditMode, currentFeedback?.status]);

  const handleSaveEdit = async () => {
    if (!editedContent) return;
    
    setIsSaving(true);
    try {
      await updateFeedback(feedbackId, {
        content: editedContent,
        colorClassification: editedColorClassification,
        goals: editedGoals.filter(g => g.title.trim()), // Only save goals with titles
      });
      setIsEditMode(false);
    } catch (error: any) {
      console.error('Failed to save feedback:', error);
      // Toast is shown by api.ts interceptor
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(currentFeedback?.content);
    setEditedColorClassification(currentFeedback?.colorClassification as FeedbackColorClassification | undefined);
    if (currentFeedback?.goals) {
      setEditedGoals(currentFeedback.goals.map(goal => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        category: goal.category,
        priority: goal.priority,
        targetDate: goal.targetDate.split('T')[0],
        status: goal.status,
        progress: goal.progress,
      })));
    } else {
      setEditedGoals([]);
    }
    setIsEditMode(false);
  };

  // Goal editing helpers
  const addGoal = () => {
    setEditedGoals([...editedGoals, {
      title: '',
      description: '',
      category: GoalCategory.CAREER_DEVELOPMENT,
      priority: GoalPriority.MEDIUM,
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
    }]);
  };

  const removeGoal = (index: number) => {
    setEditedGoals(editedGoals.filter((_, i) => i !== index));
  };

  const updateGoal = (index: number, field: keyof UpdateGoalRequest, value: string) => {
    const updated = [...editedGoals];
    updated[index] = { ...updated[index], [field]: value };
    setEditedGoals(updated);
  };

  const handleDownload = () => {
    if (!currentFeedback) return;
    download(() => createFeedbackDocxBlob(currentFeedback));
  };

  const handleSaveToDrive = () => {
    if (!currentFeedback) return;
    const description = `Feedback from ${currentFeedback.fromUser?.name || 'Unknown'} to ${currentFeedback.toUser?.name || 'Unknown'}`;
    saveToDrive(() => createFeedbackDocxBlob(currentFeedback), description);
  };

  const getStatusColor = (status: FeedbackStatus): 'blue' | 'yellow' | 'green' | 'gray' => {
    switch (status) {
      case FeedbackStatus.DRAFT:
        return 'gray';
      case FeedbackStatus.SUBMITTED:
      case FeedbackStatus.UNDER_REVIEW:
        return 'yellow';
      case FeedbackStatus.COMPLETED:
      case FeedbackStatus.ACKNOWLEDGED:
        return 'green';
      case FeedbackStatus.ARCHIVED:
        return 'gray';
      default:
        return 'blue';
    }
  };

  const getGoalStatusColor = (status: GoalStatus): 'blue' | 'yellow' | 'green' | 'gray' => {
    switch (status) {
      case GoalStatus.NOT_STARTED:
        return 'gray';
      case GoalStatus.IN_PROGRESS:
        return 'blue';
      case GoalStatus.ON_HOLD:
        return 'yellow';
      case GoalStatus.COMPLETED:
        return 'green';
      case GoalStatus.CANCELLED:
        return 'gray';
      default:
        return 'blue';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !currentFeedback) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p className="mb-4">Error loading feedback: {error || 'Feedback not found'}</p>
          <Button onClick={() => fetchFeedbackById(feedbackId)}>Retry</Button>
        </div>
      </Card>
    );
  }


  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Feedback Details</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge color={getStatusColor(currentFeedback.status)}>
              {currentFeedback.status?.replace('_', ' ') || 'Unknown'}
            </Badge>
            {currentFeedback.content?.confidential && (
              <Badge color="gray">
                <Lock className="w-3 h-3 mr-1" />
                Confidential
              </Badge>
            )}
            {/* Show color classification to giver and managers, NOT to receiver (internal use only) */}
            {!isEditMode && currentFeedback.colorClassification && currentUserId !== currentFeedback.toUserId && (
              <div 
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  currentFeedback.colorClassification === 'green' 
                    ? 'bg-green-100 text-green-800' 
                    : currentFeedback.colorClassification === 'yellow'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
                title="Internal classification (not visible to recipient)"
              >
                <div className={`w-2 h-2 rounded-full ${
                  currentFeedback.colorClassification === 'green' ? 'bg-green-500' :
                  currentFeedback.colorClassification === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                {currentFeedback.colorClassification === 'green' ? 'Exceeds Expectations' :
                 currentFeedback.colorClassification === 'yellow' ? 'Meets Expectations' : 'Needs Improvement'}
              </div>
            )}
          </div>
        </div>
        {onClose && (
          <div className="flex items-center gap-1 md:gap-2">
            {currentFeedback?.status === FeedbackStatus.DRAFT && !isEditMode && (
              <IconButton
                icon={<Edit className="w-full h-full" />}
                tooltip="Edit Draft"
                onClick={() => setIsEditMode(true)}
                variant="outline"
                size="sm"
              />
            )}
            {isEditMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  icon={PenOff}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  loading={isSaving}
                  icon={CheckCircle}
                >
                  Save
                </Button>
              </>
            )}
            <ExportButtons
              onDownload={handleDownload}
              onSaveToDrive={handleSaveToDrive}
              downloadLoading={isDownloading}
              driveLoading={isUploadingToDrive}
              disabled={!currentFeedback}
              downloadTooltip="Download as DOCX"
              driveTooltip="Save to Google Drive"
              size="sm"
            />
            <IconButton
              icon={<X className="w-full h-full" />}
              tooltip="Close"
              onClick={onClose}
              variant="ghost"
              size="sm"
            />
          </div>
        )}
      </div>

      {/* Feedback Workflow */}
      <FeedbackWorkflow
        feedback={currentFeedback}
        currentUserId={currentUserId || '123'}
        onStatusChange={(updatedFeedback) => {
          // Update the current feedback in the store
          // This will trigger a re-render with the updated feedback
        }}
      />

      {/* Meta Information */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">From</p>
              <p className="font-medium">
                {currentFeedback.fromUser?.name || currentFeedback.fromUserEmail || currentFeedback.fromUserId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">To</p>
              <p className="font-medium">
                {currentFeedback.toUser?.name || currentFeedback.toUserEmail || currentFeedback.toUserId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="font-medium">
                {new Date(currentFeedback.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          {currentFeedback.cycle && (
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Cycle</p>
                <p className="font-medium">{currentFeedback.cycle.name}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Color Classification - Editable in edit mode */}
      {isEditMode && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Color Classification</h3>
          <p className="text-sm text-gray-600 mb-4">
            Internal classification (not visible to recipient)
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { value: FeedbackColorClassification.GREEN, label: 'Exceeds Expectations', bgColor: 'bg-green-500', hoverColor: 'hover:bg-green-600', ringColor: 'ring-green-500' },
              { value: FeedbackColorClassification.YELLOW, label: 'Meets Expectations', bgColor: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-600', ringColor: 'ring-yellow-500' },
              { value: FeedbackColorClassification.RED, label: 'Needs Improvement', bgColor: 'bg-red-500', hoverColor: 'hover:bg-red-600', ringColor: 'ring-red-500' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setEditedColorClassification(option.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                  editedColorClassification === option.value
                    ? `${option.bgColor} text-white border-transparent ring-2 ${option.ringColor} ring-offset-2`
                    : `bg-white border-gray-300 hover:border-gray-400 text-gray-700`
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Overall Comment */}
      {(currentFeedback.content?.overallComment || isEditMode) && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Overall Feedback</h3>
          {isEditMode ? (
            <Textarea
              value={editedContent?.overallComment || ''}
              onChange={(e) => setEditedContent(prev => prev ? { ...prev, overallComment: e.target.value } : undefined)}
              placeholder="Provide your overall feedback..."
              rows={4}
            />
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">
              {currentFeedback.content?.overallComment || 'No overall feedback provided.'}
            </p>
          )}
        </Card>
      )}


      {/* Strengths */}
      {(currentFeedback.content?.strengths && currentFeedback.content.strengths.length > 0 || isEditMode) && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Strengths
          </h3>
          {isEditMode ? (
            <div className="space-y-3">
              {editedContent?.strengths?.map((strength, index) => (
                <div key={index} className="flex items-start gap-2">
                  <textarea
                    value={strength}
                    onChange={(e) => {
                      const newStrengths = [...(editedContent?.strengths || [])];
                      newStrengths[index] = e.target.value;
                      setEditedContent(prev => prev ? { ...prev, strengths: newStrengths } : undefined);
                    }}
                    placeholder="Describe a strength..."
                    className="flex-1 p-3 border rounded-md min-h-20 resize-none"
                    rows={2}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newStrengths = editedContent?.strengths?.filter((_, i) => i !== index) || [];
                      setEditedContent(prev => prev ? { ...prev, strengths: newStrengths } : undefined);
                    }}
                    icon={Trash2}
                    className="mt-2"
                  />
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const newStrengths = [...(editedContent?.strengths || []), ''];
                  setEditedContent(prev => prev ? { ...prev, strengths: newStrengths } : undefined);
                }}
              >
                Add Strength
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {currentFeedback.content?.strengths?.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{strength}</span>
                </li>
              )) || <p className="text-gray-500 italic">No strengths identified.</p>}
            </ul>
          )}
        </Card>
      )}

      {/* Areas for Improvement */}
      {(currentFeedback.content?.areasForImprovement &&
        currentFeedback.content.areasForImprovement.length > 0 || isEditMode) && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Areas for Improvement
            </h3>
            {isEditMode ? (
              <div className="space-y-3">
                {editedContent?.areasForImprovement?.map((area, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <textarea
                      value={area}
                      onChange={(e) => {
                        const newAreas = [...(editedContent?.areasForImprovement || [])];
                        newAreas[index] = e.target.value;
                        setEditedContent(prev => prev ? { ...prev, areasForImprovement: newAreas } : undefined);
                      }}
                      placeholder="Describe an area for improvement..."
                      className="flex-1 p-3 border rounded-md min-h-20 resize-none"
                      rows={2}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newAreas = editedContent?.areasForImprovement?.filter((_, i) => i !== index) || [];
                        setEditedContent(prev => prev ? { ...prev, areasForImprovement: newAreas } : undefined);
                      }}
                      icon={Trash2}
                      className="mt-2"
                    />
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newAreas = [...(editedContent?.areasForImprovement || []), ''];
                    setEditedContent(prev => prev ? { ...prev, areasForImprovement: newAreas } : undefined);
                  }}
                >
                  Add Area for Improvement
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {currentFeedback.content?.areasForImprovement?.map((area, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                    <span className="text-gray-700">{area}</span>
                  </li>
                )) || <p className="text-gray-500 italic">No areas for improvement identified.</p>}
              </ul>
            )}
          </Card>
        )}

      {/* Specific Examples - Hidden from UI but data preserved */}

      {/* Recommendations - Hidden from UI but data preserved */}

      {/* Growth & Development (Goals) */}
      {((currentFeedback.goals && currentFeedback.goals.length > 0) || isEditMode) && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Growth & Development
            </h3>
            {isEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={addGoal}
                icon={Plus}
                className="flex-shrink-0 whitespace-nowrap"
              >
                Add Goal
              </Button>
            )}
          </div>
          {isEditMode ? (
            <div className="space-y-4">
              {editedGoals.length === 0 ? (
                <p className="text-gray-500 italic">No goals yet. Click "Add Goal" to create one.</p>
              ) : (
                editedGoals.map((goal, index) => (
                  <div key={index} className="p-4 border rounded-md space-y-3">
                    <div className="flex items-start gap-3">
                      <Input
                        label="Goal Title"
                        value={goal.title}
                        onChange={(e) => updateGoal(index, 'title', e.target.value)}
                        placeholder="e.g., Improve communication skills"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGoal(index)}
                        icon={Trash2}
                        className="mt-6"
                      />
                    </div>
                    <textarea
                      className="w-full p-3 border rounded-md min-h-20 resize-none"
                      value={goal.description}
                      onChange={(e) => updateGoal(index, 'description', e.target.value)}
                      placeholder="Describe the goal..."
                      rows={2}
                    />
                    <div className="max-w-xs">
                      <Input
                        label="Target Date"
                        type="date"
                        value={goal.targetDate}
                        onChange={(e) => updateGoal(index, 'targetDate', e.target.value)}
                      />
                    </div>
                    {/* Category and Priority hidden from UI */}
                  </div>
                ))
              )}
            </div>
          ) : (
            <ul className="space-y-4">
              {currentFeedback.goals?.map((goal) => (
                <li key={goal.id} className="border-l-2 border-purple-200 pl-4">
                  <span className="font-medium text-gray-900">{goal.title}</span>
                  <p className="text-gray-700 mb-2">{goal.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-gray-600">
                    {/* Category and Priority hidden from UI */}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Target: {new Date(goal.targetDate).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Bottom Line */}
      {(currentFeedback.content?.bottomLine || isEditMode) && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Bottom Line</h3>
          {isEditMode ? (
            <textarea
              className="w-full p-3 border rounded-md min-h-24"
              value={editedContent?.bottomLine || ''}
              onChange={(e) => setEditedContent(prev => prev ? { ...prev, bottomLine: e.target.value } : undefined)}
              placeholder="What is the key message or takeaway..."
            />
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">{currentFeedback.content?.bottomLine}</p>
          )}
        </Card>
      )}

      {/* Acknowledgment */}
      {currentFeedback.acknowledgment && (
        <Card className="p-6 bg-green-50 border-green-200">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Acknowledged
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Acknowledged on {new Date(currentFeedback.acknowledgment.acknowledgedAt).toLocaleString()}
          </p>
          {currentFeedback.acknowledgment.response && (
            <p className="text-gray-700 italic">{currentFeedback.acknowledgment.response}</p>
          )}
        </Card>
      )}
    </div>
  );
};

