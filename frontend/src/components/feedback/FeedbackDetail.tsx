// Feedback Detail Component

import React, { useState, useEffect } from 'react';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { Feedback, FeedbackStatus, GoalStatus } from '../../types/feedback.types';
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
  Download,
} from 'lucide-react';
import { generateFeedbackDocx } from '../../utils/generateFeedbackDocx';

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
  const [isSaving, setIsSaving] = useState(false);

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
      });
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
      });
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to save feedback:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(currentFeedback?.content);
    setIsEditMode(false);
  };

  const handleDownloadDocx = async () => {
    if (!currentFeedback) return;
    
    try {
      await generateFeedbackDocx(currentFeedback);
    } catch (error) {
      console.error('Error generating DOCX:', error);
      alert('Failed to generate document. Please try again.');
    }
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
          <div className="flex items-center gap-2">
            <Badge color={getStatusColor(currentFeedback.status)}>
              {currentFeedback.status?.replace('_', ' ') || 'Unknown'}
            </Badge>
            {currentFeedback.content?.confidential && (
              <Badge color="gray">
                <Lock className="w-3 h-3 mr-1" />
                Confidential
              </Badge>
            )}
          </div>
        </div>
        {onClose && (
          <div className="flex gap-2">
            {currentFeedback?.status === FeedbackStatus.DRAFT && !isEditMode && (
              <Button
                variant="outline"
                onClick={() => setIsEditMode(true)}
                icon={Edit}
              >
                Edit Draft
              </Button>
            )}
            {isEditMode && (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  icon={Edit}
                >
                  Cancel Edit
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  icon={isSaving ? <LoadingSpinner size="sm" /> : undefined}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
            <Button
              onClick={handleDownloadDocx}
              icon={Download}
              disabled={!currentFeedback}
            >
              Download
            </Button>
            <Button variant="ghost" onClick={onClose} icon={X}>
              Close
            </Button>
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
            <div className="space-y-2">
              {editedContent?.strengths?.map((strength, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={strength}
                    onChange={(e) => {
                      const newStrengths = [...(editedContent?.strengths || [])];
                      newStrengths[index] = e.target.value;
                      setEditedContent(prev => prev ? { ...prev, strengths: newStrengths } : undefined);
                    }}
                    placeholder="Describe a strength..."
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newStrengths = editedContent?.strengths?.filter((_, i) => i !== index) || [];
                      setEditedContent(prev => prev ? { ...prev, strengths: newStrengths } : undefined);
                    }}
                    icon={Trash2}
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
              <div className="space-y-2">
                {editedContent?.areasForImprovement?.map((area, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={area}
                      onChange={(e) => {
                        const newAreas = [...(editedContent?.areasForImprovement || [])];
                        newAreas[index] = e.target.value;
                        setEditedContent(prev => prev ? { ...prev, areasForImprovement: newAreas } : undefined);
                      }}
                      placeholder="Describe an area for improvement..."
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newAreas = editedContent?.areasForImprovement?.filter((_, i) => i !== index) || [];
                        setEditedContent(prev => prev ? { ...prev, areasForImprovement: newAreas } : undefined);
                      }}
                      icon={Trash2}
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

      {/* Specific Examples */}
      {(currentFeedback.content?.specificExamples &&
        currentFeedback.content.specificExamples.length > 0 || isEditMode) && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3">Specific Examples</h3>
            {isEditMode ? (
              <div className="space-y-2">
                {editedContent?.specificExamples?.map((example, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={example}
                      onChange={(e) => {
                        const newExamples = [...(editedContent?.specificExamples || [])];
                        newExamples[index] = e.target.value;
                        setEditedContent(prev => prev ? { ...prev, specificExamples: newExamples } : undefined);
                      }}
                      placeholder="Provide a specific example..."
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newExamples = editedContent?.specificExamples?.filter((_, i) => i !== index) || [];
                        setEditedContent(prev => prev ? { ...prev, specificExamples: newExamples } : undefined);
                      }}
                      icon={Trash2}
                    />
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newExamples = [...(editedContent?.specificExamples || []), ''];
                    setEditedContent(prev => prev ? { ...prev, specificExamples: newExamples } : undefined);
                  }}
                >
                  Add Specific Example
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {currentFeedback.content?.specificExamples?.map((example, index) => (
                  <li key={index} className="text-gray-700 pl-4 border-l-2 border-gray-200">
                    {example}
                  </li>
                )) || <p className="text-gray-500 italic">No specific examples provided.</p>}
              </ul>
            )}
          </Card>
        )}

      {/* Recommendations */}
      {(currentFeedback.content?.recommendations &&
        currentFeedback.content.recommendations.length > 0 || isEditMode) && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3">Recommendations</h3>
            {isEditMode ? (
              <div className="space-y-2">
                {editedContent?.recommendations?.map((rec, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={rec}
                      onChange={(e) => {
                        const newRecs = [...(editedContent?.recommendations || [])];
                        newRecs[index] = e.target.value;
                        setEditedContent(prev => prev ? { ...prev, recommendations: newRecs } : undefined);
                      }}
                      placeholder="Provide a recommendation..."
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newRecs = editedContent?.recommendations?.filter((_, i) => i !== index) || [];
                        setEditedContent(prev => prev ? { ...prev, recommendations: newRecs } : undefined);
                      }}
                      icon={Trash2}
                    />
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newRecs = [...(editedContent?.recommendations || []), ''];
                    setEditedContent(prev => prev ? { ...prev, recommendations: newRecs } : undefined);
                  }}
                >
                  Add Recommendation
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {currentFeedback.content?.recommendations?.map((rec, index) => (
                  <li key={index} className="text-gray-700 pl-4 border-l-2 border-green-200">
                    {rec}
                  </li>
                )) || <p className="text-gray-500 italic">No recommendations provided.</p>}
              </ul>
            )}
          </Card>
        )}

      {/* Goals */}
      {currentFeedback.goals && currentFeedback.goals.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Development Goals
          </h3>
          <ul className="space-y-4">
            {currentFeedback.goals.map((goal) => (
              <li key={goal.id} className="border-l-2 border-purple-200 pl-4">
                <span className="font-medium text-gray-900">{goal.title}</span>
                <p className="text-gray-700 mb-2">{goal.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-gray-600">
                  <span className="capitalize">Category: {goal.category?.replace('_', ' ') || 'Unknown'}</span>
                  <span className="capitalize">Priority: {goal.priority}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Target: {new Date(goal.targetDate).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
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

