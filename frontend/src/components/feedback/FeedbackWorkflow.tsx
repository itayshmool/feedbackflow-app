// Feedback Workflow Component - Manages feedback review and approval process

import React, { useState } from 'react';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { Feedback, FeedbackStatus } from '../../types/feedback.types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { 
  CheckCircle, 
  Clock, 
  Eye, 
  MessageSquare, 
  Send, 
  ThumbsUp, 
  AlertCircle,
  User,
  Calendar,
  FileText
} from 'lucide-react';

interface FeedbackWorkflowProps {
  feedback: Feedback;
  currentUserId: string;
  onStatusChange?: (feedback: Feedback) => void;
}

interface WorkflowAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: FeedbackStatus;
  color: string;
  requiresComment?: boolean;
}

const WORKFLOW_ACTIONS: Record<FeedbackStatus, WorkflowAction[]> = {
  [FeedbackStatus.DRAFT]: [
    {
      id: 'submit',
      label: 'Submit for Review',
      description: 'Submit this feedback to the receiver',
      icon: <Send className="w-4 h-4" />,
      status: FeedbackStatus.SUBMITTED,
      color: 'bg-blue-500 hover:bg-blue-600',
      requiresComment: false,
    },
  ],
  [FeedbackStatus.SUBMITTED]: [
    {
      id: 'complete',
      label: 'Mark as Complete',
      description: 'Mark this feedback as completed',
      icon: <CheckCircle className="w-4 h-4" />,
      status: FeedbackStatus.COMPLETED,
      color: 'bg-green-500 hover:bg-green-600',
      requiresComment: false,
    },
    {
      id: 'acknowledge',
      label: 'Acknowledge Feedback',
      description: 'Acknowledge that you have received and reviewed this feedback',
      icon: <ThumbsUp className="w-4 h-4" />,
      status: FeedbackStatus.COMPLETED,
      color: 'bg-purple-500 hover:bg-purple-600',
      requiresComment: true,
    },
  ],
  [FeedbackStatus.COMPLETED]: [
    {
      id: 'acknowledge',
      label: 'Acknowledge Feedback',
      description: 'Add an acknowledgment message to this feedback',
      icon: <ThumbsUp className="w-4 h-4" />,
      status: FeedbackStatus.COMPLETED,
      color: 'bg-purple-500 hover:bg-purple-600',
      requiresComment: true,
    },
  ],
  [FeedbackStatus.UNDER_REVIEW]: [],
  [FeedbackStatus.ACKNOWLEDGED]: [],
  [FeedbackStatus.ARCHIVED]: [],
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  [FeedbackStatus.DRAFT]: 'bg-gray-100 text-gray-800',
  [FeedbackStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
  [FeedbackStatus.UNDER_REVIEW]: 'bg-yellow-100 text-yellow-800',
  [FeedbackStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [FeedbackStatus.ACKNOWLEDGED]: 'bg-purple-100 text-purple-800',
  [FeedbackStatus.ARCHIVED]: 'bg-gray-100 text-gray-600',
};

const STATUS_ICONS: Record<FeedbackStatus, React.ReactNode> = {
  [FeedbackStatus.DRAFT]: <FileText className="w-4 h-4" />,
  [FeedbackStatus.SUBMITTED]: <Send className="w-4 h-4" />,
  [FeedbackStatus.UNDER_REVIEW]: <Eye className="w-4 h-4" />,
  [FeedbackStatus.COMPLETED]: <CheckCircle className="w-4 h-4" />,
  [FeedbackStatus.ACKNOWLEDGED]: <ThumbsUp className="w-4 h-4" />,
  [FeedbackStatus.ARCHIVED]: <Clock className="w-4 h-4" />,
};

export const FeedbackWorkflow: React.FC<FeedbackWorkflowProps> = ({
  feedback,
  currentUserId,
  onStatusChange,
}) => {
  const { updateFeedback, submitFeedback, completeFeedback, acknowledgeFeedback, isUpdating } = useFeedbackStore();
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const availableActions = WORKFLOW_ACTIONS[feedback.status] || [];
  const isRecipient = feedback.toUserId === currentUserId || feedback.toUserEmail === currentUserId;
  const isGiver = feedback.fromUserId === currentUserId;

  const handleAction = async (action: WorkflowAction) => {
    if (action.requiresComment && !comment.trim()) {
      alert('Please provide a comment for this action');
      return;
    }

    setIsProcessing(true);
    try {
      let updatedFeedback;
      
      if (action.id === 'submit') {
        updatedFeedback = await submitFeedback(feedback.id);
      } else if (action.id === 'complete') {
        updatedFeedback = await completeFeedback(feedback.id);
      } else if (action.id === 'acknowledge') {
        updatedFeedback = await acknowledgeFeedback(feedback.id, comment);
      } else {
        // Fallback to updateFeedback for other actions
        updatedFeedback = await updateFeedback(feedback.id, {
          status: action.status,
        });
      }

      setComment('');
      setSelectedAction('');
      onStatusChange?.(updatedFeedback);
    } catch (error) {
      console.error('Failed to update feedback status:', error);
      alert('Failed to update feedback status');
    } finally {
      setIsProcessing(false);
    }
  };

  const canPerformAction = (action: WorkflowAction): boolean => {
    // Only givers can submit draft feedback
    if (action.id === 'submit') {
      return isGiver && feedback.status === FeedbackStatus.DRAFT;
    }
    
    // Givers can mark as complete (when status is SUBMITTED)
    if (action.id === 'complete') {
      return isGiver && feedback.status === FeedbackStatus.SUBMITTED;
    }
    
    // Receivers can acknowledge at any time after submission (SUBMITTED or COMPLETED)
    if (action.id === 'acknowledge') {
      return isRecipient && feedback.status !== FeedbackStatus.DRAFT;
    }
    
    return false;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Feedback Workflow
        </h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${STATUS_COLORS[feedback.status]}`}>
          {STATUS_ICONS[feedback.status]}
          {feedback.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
        </div>
      </div>

      {/* Feedback Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-sm text-gray-600">From</p>
            <p className="font-medium">{feedback.fromUser?.name || feedback.fromUserEmail || feedback.fromUserId}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-sm text-gray-600">To</p>
            <p className="font-medium">{feedback.toUser?.name || feedback.toUserEmail || feedback.toUserId}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-sm text-gray-600">Created</p>
            <p className="font-medium">{new Date(feedback.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MessageSquare className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-sm text-gray-600">Type</p>
            <p className="font-medium">{feedback.reviewType}</p>
          </div>
        </div>
      </div>

      {/* Available Actions */}
      {availableActions.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Available Actions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableActions.map((action) => (
              <div
                key={action.id}
                className={`p-4 border rounded-lg ${
                  canPerformAction(action) 
                    ? 'border-gray-200 hover:border-gray-300' 
                    : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg text-white ${action.color}`}>
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{action.label}</h5>
                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    {action.requiresComment && (
                      <p className="text-xs text-orange-600 mt-1">Requires comment</p>
                    )}
                  </div>
                </div>
                {canPerformAction(action) && (
                  <div className="mt-3">
                    {action.requiresComment && (
                      <div className="mb-3">
                        <Input
                          placeholder="Add a comment..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    )}
                    <Button
                      onClick={() => handleAction(action)}
                      disabled={isProcessing}
                      className={`w-full ${action.color} text-white`}
                      size="sm"
                    >
                      {isProcessing ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          {action.icon}
                          {action.label}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Actions Available */}
      {availableActions.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h4 className="font-medium text-gray-900 mb-2">Workflow Complete</h4>
          <p className="text-gray-600">
            This feedback has completed its workflow process.
          </p>
        </div>
      )}

      {/* Comments History */}
      {feedback.comments && feedback.comments.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium text-gray-900 mb-3">Workflow Comments</h4>
          <div className="space-y-3">
            {feedback.comments
              .filter(comment => comment.type === 'workflow')
              .map((comment) => (
                <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3 h-3 text-gray-500" />
                    <span className="text-sm font-medium">{comment.userId}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{comment.content}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </Card>
  );
};
