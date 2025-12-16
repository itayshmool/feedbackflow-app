// Feedback Detail Component - Polished Version

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
  TrendingDown,
  Plus,
  MessageSquare,
  Star,
  FileText,
  Award,
  ArrowRight,
  Mail,
  Building,
  Save,
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
        targetDate: goal.targetDate.split('T')[0],
        status: goal.status,
        progress: goal.progress,
      })));
    }
  }, [currentFeedback]);

  useEffect(() => {
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
        goals: editedGoals.filter(g => g.title.trim()),
      });
      setIsEditMode(false);
    } catch (error: any) {
      console.error('Failed to save feedback:', error);
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

  const addGoal = () => {
    setEditedGoals([...editedGoals, {
      title: '',
      description: '',
      category: GoalCategory.CAREER_DEVELOPMENT,
      priority: GoalPriority.MEDIUM,
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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

  // Section header component for consistency
  const SectionHeader = ({ icon: Icon, iconBg, title, subtitle }: { 
    icon: React.ElementType; 
    iconBg: string; 
    title: string; 
    subtitle?: string;
  }) => (
    <div className="flex items-start gap-3 mb-5">
      <div className={`p-2.5 ${iconBg} rounded-xl shadow-md flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600 font-medium">Loading feedback...</p>
      </div>
    );
  }

  if (error || !currentFeedback) {
    return (
      <Card className="p-8 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-xl rounded-2xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-red-600 mb-4 font-medium">Error loading feedback: {error || 'Feedback not found'}</p>
          <Button onClick={() => fetchFeedbackById(feedbackId)}>Retry</Button>
        </div>
      </Card>
    );
  }

  const fromUser = currentFeedback.fromUser;
  const toUser = currentFeedback.toUser;

  return (
    <div className={`max-w-5xl mx-auto ${isEditMode ? 'pb-24' : ''}`}>
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl mb-6">
        {/* Background gradient */}
        <div className={`absolute inset-0 ${
          isEditMode 
            ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500' 
            : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600'
        }`} />
        
        {/* Decorative orbs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-400/20 rounded-full blur-2xl" />
        
        {/* Content */}
        <div className="relative p-6 text-white">
          {/* Top row: Status badges and actions */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge color={getStatusColor(currentFeedback.status)} className="shadow-lg">
                {currentFeedback.status?.replace('_', ' ') || 'Unknown'}
              </Badge>
              {currentFeedback.content?.confidential && (
                <Badge color="gray" className="shadow-lg">
                  <Lock className="w-3 h-3 mr-1" />
                  Confidential
                </Badge>
              )}
              {isEditMode && (
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
                  ✏️ Editing Draft
                </span>
              )}
            </div>
            
            {onClose && (
              <div className="flex items-center gap-2">
                {!isEditMode && (
                  <ExportButtons
                    onDownload={handleDownload}
                    onSaveToDrive={handleSaveToDrive}
                    downloadLoading={isDownloading}
                    driveLoading={isUploadingToDrive}
                    disabled={!currentFeedback}
                    downloadTooltip="Download as DOCX"
                    driveTooltip="Save to Google Drive"
                    size="sm"
                    className="[&_button]:bg-white/20 [&_button]:hover:bg-white/30 [&_button]:border-white/30 [&_button]:text-white"
                  />
                )}
                {currentFeedback?.status === FeedbackStatus.DRAFT && !isEditMode && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    title="Edit Draft"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
          
          {/* Feedback participants */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            {/* From User */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-full blur-lg scale-110" />
                <div className="relative w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 ring-white/30 shadow-xl">
                  <span className="text-xl font-bold">
                    {(fromUser?.name || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-white/70 text-xs font-medium">From</p>
                <p className="font-bold text-lg">{fromUser?.name || 'Unknown'}</p>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="hidden sm:flex items-center justify-center">
              <div className="p-2 bg-white/20 rounded-full">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
            
            {/* To User */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-full blur-lg scale-110" />
                <div className="relative w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 ring-white/30 shadow-xl">
                  <span className="text-xl font-bold">
                    {(toUser?.name || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-white/70 text-xs font-medium">To</p>
                <p className="font-bold text-lg">{toUser?.name || 'Unknown'}</p>
              </div>
            </div>
            
            {/* Color classification badge - show to giver only */}
            {!isEditMode && currentFeedback.colorClassification && currentUserId !== currentFeedback.toUserId && (
              <div className="sm:ml-auto">
                <div 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg ${
                    currentFeedback.colorClassification === 'green' 
                      ? 'bg-emerald-500/90' 
                      : currentFeedback.colorClassification === 'yellow'
                      ? 'bg-amber-500/90'
                      : 'bg-rose-500/90'
                  }`}
                  title="Internal classification (not visible to recipient)"
                >
                  {currentFeedback.colorClassification === 'green' && <TrendingUp className="w-4 h-4" />}
                  {currentFeedback.colorClassification === 'yellow' && <Award className="w-4 h-4" />}
                  {currentFeedback.colorClassification === 'red' && <TrendingDown className="w-4 h-4" />}
                  <span className="hidden sm:inline">
                    {currentFeedback.colorClassification === 'green' ? 'Exceeds' :
                     currentFeedback.colorClassification === 'yellow' ? 'Meets' : 'Needs Improvement'}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* Meta info */}
          <div className="flex flex-wrap gap-3 mt-4 text-sm text-white/80">
            <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(currentFeedback.createdAt).toLocaleDateString()}
            </span>
            {currentFeedback.cycle && (
              <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5" />
                {currentFeedback.cycle.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Workflow */}
      {!isEditMode && (
        <div className="mb-6">
          <FeedbackWorkflow
            feedback={currentFeedback}
            currentUserId={currentUserId || '123'}
            onStatusChange={(updatedFeedback) => {}}
          />
        </div>
      )}

      <div className="space-y-6">
        {/* Color Classification - Edit Mode Only */}
        {isEditMode && (
          <Card className="p-6 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl">
            <SectionHeader 
              icon={Target} 
              iconBg="bg-gradient-to-br from-gray-700 to-gray-900" 
              title="Performance Classification" 
              subtitle="🔒 Internal use only - not visible to recipient"
            />
            <div className="flex flex-wrap gap-3">
              {[
                { 
                  value: FeedbackColorClassification.GREEN, 
                  label: 'Exceeds Expectations', 
                  icon: TrendingUp,
                  gradient: 'from-emerald-500 to-emerald-600',
                  ring: 'ring-emerald-400',
                  lightBg: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
                },
                { 
                  value: FeedbackColorClassification.YELLOW, 
                  label: 'Meets Expectations', 
                  icon: Award,
                  gradient: 'from-amber-500 to-amber-600',
                  ring: 'ring-amber-400',
                  lightBg: 'bg-amber-50 border-amber-200 hover:border-amber-400'
                },
                { 
                  value: FeedbackColorClassification.RED, 
                  label: 'Needs Improvement', 
                  icon: TrendingDown,
                  gradient: 'from-rose-500 to-rose-600',
                  ring: 'ring-rose-400',
                  lightBg: 'bg-rose-50 border-rose-200 hover:border-rose-400'
                },
              ].map((option) => {
                const isSelected = editedColorClassification === option.value;
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEditedColorClassification(option.value)}
                    className={`relative flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 transition-all duration-300 ${
                      isSelected
                        ? `bg-gradient-to-r ${option.gradient} text-white border-transparent shadow-lg ring-4 ${option.ring} ring-opacity-30`
                        : `${option.lightBg} text-gray-700`
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20' : `bg-gradient-to-r ${option.gradient}`}`}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-white'}`} />
                    </div>
                    <span className="font-semibold">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Overall Comment */}
        {(currentFeedback.content?.overallComment || isEditMode) && (
          <Card className="p-6 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl">
            <SectionHeader 
              icon={MessageSquare} 
              iconBg="bg-gradient-to-br from-blue-500 to-cyan-600" 
              title="Overall Feedback" 
              subtitle={isEditMode ? "How I experienced your work over the past few months" : undefined}
            />
            {isEditMode ? (
              <textarea
                className="w-full p-4 border border-gray-200 rounded-xl min-h-36 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white focus:bg-white"
                value={editedContent?.overallComment || ''}
                onChange={(e) => setEditedContent(prev => prev ? { ...prev, overallComment: e.target.value } : undefined)}
                placeholder="Share your overall feedback..."
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {currentFeedback.content?.overallComment || 'No overall feedback provided.'}
              </p>
            )}
          </Card>
        )}

        {/* Strengths */}
        {(currentFeedback.content?.strengths && currentFeedback.content.strengths.length > 0 || isEditMode) && (
          <Card className="p-6 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl">
            <div className="flex items-start justify-between mb-5">
              <SectionHeader 
                icon={Star} 
                iconBg="bg-gradient-to-br from-emerald-500 to-teal-600" 
                title="Strengths" 
              />
              {isEditMode && (
                <Button variant="outline" size="sm" onClick={() => {
                  const newStrengths = [...(editedContent?.strengths || []), ''];
                  setEditedContent(prev => prev ? { ...prev, strengths: newStrengths } : undefined);
                }} className="flex-shrink-0 rounded-xl">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
            {isEditMode ? (
              <div className="space-y-3">
                {editedContent?.strengths?.map((strength, index) => (
                  <div key={index} className="flex gap-2 group">
                    <textarea
                      value={strength}
                      onChange={(e) => {
                        const newStrengths = [...(editedContent?.strengths || [])];
                        newStrengths[index] = e.target.value;
                        setEditedContent(prev => prev ? { ...prev, strengths: newStrengths } : undefined);
                      }}
                      placeholder="Describe a strength..."
                      className="flex-1 p-4 border border-gray-200 rounded-xl min-h-20 resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white focus:bg-white"
                      rows={2}
                    />
                    <button
                      onClick={() => {
                        const newStrengths = editedContent?.strengths?.filter((_, i) => i !== index) || [];
                        setEditedContent(prev => prev ? { ...prev, strengths: newStrengths } : undefined);
                      }}
                      className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 self-start mt-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="space-y-3">
                {currentFeedback.content?.strengths?.map((strength, index) => (
                  <li key={index} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="p-1 bg-emerald-500 rounded-full flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
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
          <Card className="p-6 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl">
            <div className="flex items-start justify-between mb-5">
              <SectionHeader 
                icon={TrendingUp} 
                iconBg="bg-gradient-to-br from-amber-500 to-orange-600" 
                title="Areas for Improvement" 
              />
              {isEditMode && (
                <Button variant="outline" size="sm" onClick={() => {
                  const newAreas = [...(editedContent?.areasForImprovement || []), ''];
                  setEditedContent(prev => prev ? { ...prev, areasForImprovement: newAreas } : undefined);
                }} className="flex-shrink-0 rounded-xl">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
            {isEditMode ? (
              <div className="space-y-3">
                {editedContent?.areasForImprovement?.map((area, index) => (
                  <div key={index} className="flex gap-2 group">
                    <textarea
                      value={area}
                      onChange={(e) => {
                        const newAreas = [...(editedContent?.areasForImprovement || [])];
                        newAreas[index] = e.target.value;
                        setEditedContent(prev => prev ? { ...prev, areasForImprovement: newAreas } : undefined);
                      }}
                      placeholder="Describe an area for improvement..."
                      className="flex-1 p-4 border border-gray-200 rounded-xl min-h-20 resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white focus:bg-white"
                      rows={2}
                    />
                    <button
                      onClick={() => {
                        const newAreas = editedContent?.areasForImprovement?.filter((_, i) => i !== index) || [];
                        setEditedContent(prev => prev ? { ...prev, areasForImprovement: newAreas } : undefined);
                      }}
                      className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 self-start mt-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="space-y-3">
                {currentFeedback.content?.areasForImprovement?.map((area, index) => (
                  <li key={index} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0 mt-2" />
                    <span className="text-gray-700">{area}</span>
                  </li>
                )) || <p className="text-gray-500 italic">No areas for improvement identified.</p>}
              </ul>
            )}
          </Card>
        )}

        {/* Growth & Development (Goals) */}
        {((currentFeedback.goals && currentFeedback.goals.length > 0) || isEditMode) && (
          <Card className="p-6 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl">
            <div className="flex items-start justify-between mb-5">
              <SectionHeader 
                icon={Target} 
                iconBg="bg-gradient-to-br from-purple-500 to-indigo-600" 
                title="Growth & Development" 
                subtitle={isEditMode ? "Focus areas and key actions for growth" : undefined}
              />
              {isEditMode && (
                <Button variant="outline" size="sm" onClick={addGoal} className="flex-shrink-0 rounded-xl whitespace-nowrap">
                  <Plus className="w-4 h-4 mr-1" />
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
                    <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl space-y-3 group">
                      <div className="flex items-start gap-3">
                        <Input
                          label="Goal Title"
                          value={goal.title}
                          onChange={(e) => updateGoal(index, 'title', e.target.value)}
                          placeholder="e.g., Improve communication skills"
                          className="flex-1"
                        />
                        <button
                          onClick={() => removeGoal(index)}
                          className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 mt-6"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        className="w-full p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                        value={goal.description}
                        onChange={(e) => updateGoal(index, 'description', e.target.value)}
                        placeholder="Describe the goal and expected outcomes..."
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
                    </div>
                  ))
                )}
              </div>
            ) : (
              <ul className="space-y-4">
                {currentFeedback.goals?.map((goal) => (
                  <li key={goal.id} className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-md flex-shrink-0">
                        <Target className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{goal.title}</h4>
                        <p className="text-gray-700 mt-1">{goal.description}</p>
                        <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {/* Bottom Line */}
        {(currentFeedback.content?.bottomLine || isEditMode) && (
          <Card className="p-6 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl">
            <SectionHeader 
              icon={FileText} 
              iconBg="bg-gradient-to-br from-rose-500 to-pink-600" 
              title="Bottom Line" 
              subtitle={isEditMode ? "The key message or takeaway" : undefined}
            />
            {isEditMode ? (
              <textarea
                className="w-full p-4 border border-gray-200 rounded-xl min-h-28 resize-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white focus:bg-white"
                value={editedContent?.bottomLine || ''}
                onChange={(e) => setEditedContent(prev => prev ? { ...prev, bottomLine: e.target.value } : undefined)}
                placeholder="What is the key message or takeaway..."
              />
            ) : (
              <div className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-xl">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed font-medium">
                  {currentFeedback.content?.bottomLine}
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Acknowledgment */}
        {currentFeedback.acknowledgment && (
          <Card className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-lg rounded-2xl">
            <SectionHeader 
              icon={CheckCircle} 
              iconBg="bg-gradient-to-br from-emerald-500 to-teal-600" 
              title="Acknowledged" 
            />
            <p className="text-sm text-gray-600 mb-2">
              Acknowledged on {new Date(currentFeedback.acknowledgment.acknowledgedAt).toLocaleString()}
            </p>
            {currentFeedback.acknowledgment.response && (
              <p className="text-gray-700 italic bg-white/50 p-3 rounded-lg">
                "{currentFeedback.acknowledgment.response}"
              </p>
            )}
          </Card>
        )}
      </div>

      {/* Floating Action Bar - Edit Mode Only */}
      {isEditMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <Button 
                variant="ghost" 
                onClick={handleCancelEdit}
                className="text-gray-600"
              >
                <PenOff className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSaveEdit} 
                disabled={isSaving}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg rounded-xl px-6"
              >
                {isSaving ? <LoadingSpinner size="sm" /> : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Save Changes</span>
                    <span className="sm:hidden">Save</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
