// Give Feedback Form Component - Polished Version

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { useCyclesStore } from '../../stores/cyclesStore';
import { useAuthStore } from '../../stores/authStore';
import { useHierarchyStore } from '../../stores/hierarchyStore';
import { ReviewType, GoalCategory, GoalPriority, CreateFeedbackRequest, FeedbackColorClassification } from '../../types/feedback.types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Autocomplete } from '../ui/Autocomplete';
import { UserSearchResult } from '../../services/userSearch.service';
import { 
  Plus, Trash2, Save, Send, X, Calendar, Users, Target, HelpCircle, Sparkles, Loader2,
  MessageSquare, TrendingUp, TrendingDown, Award, User, Mail, Building, FileText, Star
} from 'lucide-react';
import api from '../../lib/api';

interface GiveFeedbackProps {
  cycleId?: string;
  toUserEmail?: string;
  toUserName?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

interface RatingInput {
  category: string;
  subcategory?: string;
  score: number;
  maxScore: number;
  comment?: string;
}

interface GoalInput {
  title: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;
  targetDate: string;
}

export const GiveFeedback: React.FC<GiveFeedbackProps> = ({
  cycleId: initialCycleId,
  toUserEmail: initialToUserEmail,
  toUserName,
  onClose,
  onSuccess,
}) => {
  const { createFeedback, submitFeedback, isCreating, createError, clearErrors } = useFeedbackStore();
  const { cycles, fetchCycles } = useCyclesStore();
  const { user } = useAuthStore();
  const { directReports, isLoading: isLoadingDirectReports, fetchDirectReports } = useHierarchyStore();

  // Form state
  const [selectedCycleId, setSelectedCycleId] = useState(initialCycleId || '');
  const [toUserEmail, setToUserEmail] = useState(initialToUserEmail || '');
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [reviewType, setReviewType] = useState<ReviewType>(ReviewType.MANAGER_REVIEW);
  const [overallComment, setOverallComment] = useState('');
  const [strengths, setStrengths] = useState<string[]>(['']);
  const [areasForImprovement, setAreasForImprovement] = useState<string[]>(['']);
  const [specificExamples, setSpecificExamples] = useState<string[]>(['']);
  const [recommendations, setRecommendations] = useState<string[]>(['']);
  const [bottomLine, setBottomLine] = useState('');
  const [confidential, setConfidential] = useState(false);
  const [colorClassification, setColorClassification] = useState<FeedbackColorClassification | ''>('');
  const [ratings, setRatings] = useState<RatingInput[]>([]);
  const [goals, setGoals] = useState<GoalInput[]>([{
    title: '',
    description: '',
    category: GoalCategory.CAREER_DEVELOPMENT,
    priority: GoalPriority.MEDIUM,
    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }]);
  
  // AI Generation state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Feature flag for AI generation
  const isAIEnabled = import.meta.env.VITE_ENABLE_AI_FEEDBACK === 'true';

  useEffect(() => {
    clearErrors();
    if (user?.organizationId) {
      fetchCycles({ organizationId: user.organizationId });
    } else {
      fetchCycles();
    }
    if (user?.id) {
      fetchDirectReports(user.id);
    }
  }, [clearErrors, fetchCycles, user?.id, user?.organizationId, fetchDirectReports]);

  useEffect(() => {
    if (initialToUserEmail && directReports.length > 0 && !selectedUser) {
      const matchingUser = directReports.find(emp => emp.email === initialToUserEmail);
      if (matchingUser) {
        setSelectedUser({
          id: matchingUser.id,
          name: matchingUser.name,
          email: matchingUser.email,
          avatarUrl: matchingUser.avatarUrl,
          department: matchingUser.department || '',
          position: matchingUser.position || '',
          isActive: true
        });
      } else if (toUserName) {
        setSelectedUser({
          id: '',
          name: toUserName,
          email: initialToUserEmail,
          avatarUrl: '',
          department: '',
          position: '',
          isActive: true
        });
      }
    }
  }, [initialToUserEmail, toUserName, directReports, selectedUser]);

  const activeCycles = (cycles || []).filter(cycle => cycle.status === 'active');
  const requiresDirectReports = reviewType === ReviewType.MANAGER_REVIEW;

  const getHelpText = (section: string): string => {
    const helpTexts = {
      manager: {
        strengths: "Which strengths, skills, or behaviors showed up clearly in your work? Please share examples.",
        improvements: "Which areas or skills could be improved or handled differently? Where should you focus on doing better? Please share examples.",
        examples: "Provide concrete examples of situations that illustrate your feedback.",
        recommendations: "Suggest specific actions or resources for professional development."
      },
      project: {
        strengths: "Which strengths, skills, or behaviors showed up clearly in your work? Please share examples.",
        improvements: "Which areas or skills could be improved or handled differently? Where should you focus on doing better? Please share examples.",
        examples: "Share specific instances from the project that stood out.",
        recommendations: "Suggestions for future collaborations or team processes."
      }
    };
    const type = reviewType === ReviewType.MANAGER_REVIEW ? 'manager' : 'project';
    return helpTexts[type][section as keyof typeof helpTexts.manager] || '';
  };

  const addStrength = () => setStrengths([...strengths, '']);
  const removeStrength = (index: number) => setStrengths(strengths.filter((_, i) => i !== index));
  const updateStrength = (index: number, value: string) => {
    const updated = [...strengths];
    updated[index] = value;
    setStrengths(updated);
  };

  const addAreaForImprovement = () => setAreasForImprovement([...areasForImprovement, '']);
  const removeAreaForImprovement = (index: number) =>
    setAreasForImprovement(areasForImprovement.filter((_, i) => i !== index));
  const updateAreaForImprovement = (index: number, value: string) => {
    const updated = [...areasForImprovement];
    updated[index] = value;
    setAreasForImprovement(updated);
  };

  const addExample = () => setSpecificExamples([...specificExamples, '']);
  const removeExample = (index: number) =>
    setSpecificExamples(specificExamples.filter((_, i) => i !== index));
  const updateExample = (index: number, value: string) => {
    const updated = [...specificExamples];
    updated[index] = value;
    setSpecificExamples(updated);
  };

  const addRecommendation = () => setRecommendations([...recommendations, '']);
  const removeRecommendation = (index: number) =>
    setRecommendations(recommendations.filter((_, i) => i !== index));
  const updateRecommendation = (index: number, value: string) => {
    const updated = [...recommendations];
    updated[index] = value;
    setRecommendations(updated);
  };

  const handleUserSelect = (user: UserSearchResult) => {
    setSelectedUser(user);
    setToUserEmail(user.email);
  };

  const handleDirectReportSelect = (userId: string) => {
    const user = directReports.find(emp => emp.id === userId);
    if (user) {
      setSelectedUser({
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        department: user.department || '',
        position: user.position || '',
        isActive: true
      });
      setToUserEmail(user.email);
    }
  };

  const addGoal = () => {
    setGoals([
      ...goals,
      {
        title: '',
        description: '',
        category: GoalCategory.TECHNICAL_SKILLS,
        priority: GoalPriority.MEDIUM,
        targetDate: '',
      },
    ]);
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const updateGoal = (index: number, field: keyof GoalInput, value: any) => {
    const updated = [...goals];
    updated[index] = { ...updated[index], [field]: value };
    setGoals(updated);
  };

  const handleGenerateAI = async () => {
    if (!selectedUser) {
      setAiError('Please select a recipient first');
      return;
    }
    
    setIsGeneratingAI(true);
    setAiError(null);
    
    try {
      const response = await api.post('/ai/generate-feedback', {
        recipientName: selectedUser.name,
        recipientPosition: selectedUser.position || 'Employee',
        recipientDepartment: selectedUser.department || '',
        feedbackType: reviewType === ReviewType.MANAGER_REVIEW ? 'constructive' : 'general'
      });
      
      if (response.data.success) {
        const { 
          strengths: aiStrengths, 
          areasForImprovement: aiAreas, 
          recommendations: aiRecs,
          bottomLine: aiBottomLine,
          developmentGoals: aiDevGoals,
          overallComment: aiComment 
        } = response.data.data;
        
        if (aiStrengths) {
          setStrengths(Array.isArray(aiStrengths) ? aiStrengths : aiStrengths.split('. ').filter((s: string) => s.trim()));
        }
        if (aiAreas) {
          setAreasForImprovement(Array.isArray(aiAreas) ? aiAreas : aiAreas.split('. ').filter((a: string) => a.trim()));
        }
        if (aiRecs) {
          setRecommendations(Array.isArray(aiRecs) ? aiRecs : aiRecs.split('. ').filter((r: string) => r.trim()));
        }
        if (aiBottomLine) {
          setBottomLine(aiBottomLine);
        }
        if (aiComment) {
          setOverallComment(aiComment);
        }
        if (aiDevGoals && reviewType === ReviewType.MANAGER_REVIEW) {
          const newGoals = (Array.isArray(aiDevGoals) ? aiDevGoals : [aiDevGoals]).map((title: string) => ({
            title,
            description: '',
            category: GoalCategory.PERFORMANCE,
            priority: GoalPriority.MEDIUM,
            targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }));
          setGoals(newGoals);
        }
      } else {
        setAiError(response.data.error || 'Failed to generate feedback');
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      setAiError(error.response?.data?.error || 'Failed to generate AI feedback. Please try again.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSaveAsDraft = async () => {
    if (!toUserEmail) {
      toast.error('Please enter a recipient email');
      return;
    }

    const data: CreateFeedbackRequest = {
      cycleId: selectedCycleId,
      toUserEmail,
      reviewType,
      colorClassification: colorClassification || undefined,
      content: {
        overallComment,
        strengths: strengths.filter((s) => s.trim()),
        areasForImprovement: areasForImprovement.filter((a) => a.trim()),
        specificExamples: specificExamples.filter((e) => e.trim()),
        recommendations: recommendations.filter((r) => r.trim()),
        bottomLine: bottomLine.trim() || undefined,
        confidential,
      },
      ratings: [],
      goals: goals.map((g) => ({
        title: g.title,
        description: g.description,
        category: g.category,
        priority: g.priority,
        targetDate: g.targetDate,
      })),
    };

    const result = await createFeedback(data);
    if (result) {
      toast.success('Feedback saved as draft');
      onSuccess?.();
      onClose?.();
    }
  };

  const handleSubmit = async () => {
    if (!selectedCycleId) {
      toast.error('Please select a feedback cycle');
      return;
    }

    if (!toUserEmail) {
      toast.error('Please enter a recipient email');
      return;
    }

    if (!colorClassification) {
      toast.error('Please select a color classification');
      return;
    }

    if (!overallComment.trim()) {
      toast.error('Please provide an overall comment');
      return;
    }

    const data: CreateFeedbackRequest = {
      cycleId: selectedCycleId,
      toUserEmail,
      reviewType,
      colorClassification: colorClassification || undefined,
      content: {
        overallComment,
        strengths: strengths.filter((s) => s.trim()),
        areasForImprovement: areasForImprovement.filter((a) => a.trim()),
        specificExamples: specificExamples.filter((e) => e.trim()),
        recommendations: recommendations.filter((r) => r.trim()),
        bottomLine: bottomLine.trim() || undefined,
        confidential,
      },
      ratings: [],
      goals: goals.map((g) => ({
        title: g.title,
        description: g.description,
        category: g.category,
        priority: g.priority,
        targetDate: g.targetDate,
      })),
    };

    const result = await createFeedback(data);
    if (result) {
      const submitted = await submitFeedback(result.id);
      if (submitted) {
        toast.success('Feedback submitted successfully');
        onSuccess?.();
        onClose?.();
      }
    }
  };

  if (isLoadingDirectReports) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col justify-center items-center py-20">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 font-medium">Loading team members...</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header - Gradient when recipient selected */}
      {selectedUser ? (
        <div className="relative overflow-hidden rounded-2xl mb-6">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />
          
          {/* Decorative orbs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-400/20 rounded-full blur-2xl" />
          
          {/* Content */}
          <div className="relative p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-full blur-lg scale-110" />
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-4 ring-white/30 shadow-xl">
                  <span className="text-2xl sm:text-3xl font-bold text-white">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              
              {/* Info */}
              <div className="flex-1">
                <p className="text-white/70 text-sm font-medium mb-1">Giving feedback to</p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{selectedUser.name}</h2>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-white/80">
                  {selectedUser.position && (
                    <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full">
                      <Building className="w-3.5 h-3.5" />
                      {selectedUser.position}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full">
                    <Mail className="w-3.5 h-3.5" />
                    {selectedUser.email}
                  </span>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                {isAIEnabled && (
                  <Button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={isGeneratingAI}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm shadow-lg"
                  >
                    {isGeneratingAI ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span className="hidden sm:inline">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Generate with AI</span>
                        <span className="sm:hidden">AI</span>
                      </>
                    )}
                  </Button>
                )}
                {onClose && (
                  <button 
                    onClick={onClose}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Give Feedback</h2>
            <p className="text-gray-500 mt-1">Select a team member to get started</p>
          </div>
          <div className="flex items-center gap-2">
            {onClose && (
              <Button variant="ghost" onClick={onClose} icon={X}>
                Close
              </Button>
            )}
          </div>
        </div>
      )}

      {aiError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-800">{aiError}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Select Recipient - Only show if not pre-selected */}
        {!initialToUserEmail && (
          <Card className="p-6 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl">
            <SectionHeader 
              icon={User} 
              iconBg="bg-gradient-to-br from-blue-500 to-indigo-600" 
              title="Select Recipient" 
              subtitle="Choose a team member to provide feedback to"
            />
            <div className="space-y-4">
              {requiresDirectReports ? (
                directReports.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-amber-800">
                      You don't have any direct reports. Manager reviews can only be given to direct reports.
                    </p>
                  </div>
                ) : (
                  <Select
                    label="Select Direct Report"
                    value={selectedUser?.id || ''}
                    onChange={(e) => handleDirectReportSelect(e.target.value)}
                    required
                  >
                    <option value="">Select a direct report...</option>
                    {directReports.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.email})
                      </option>
                    ))}
                  </Select>
                )
              ) : (
                <Autocomplete
                  label="Recipient Email"
                  value={toUserEmail}
                  onChange={setToUserEmail}
                  onSelect={handleUserSelect}
                  placeholder="Search users by email or name..."
                  required
                  organizationId={user?.organizationId}
                />
              )}
            </div>
          </Card>
        )}

        {/* Cycle Selection */}
        <Card className="p-6 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl">
          <SectionHeader 
            icon={Calendar} 
            iconBg="bg-gradient-to-br from-purple-500 to-pink-600" 
            title="Feedback Cycle" 
            subtitle="Select the performance cycle for this feedback"
          />
          <Select
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            required
            className="mb-4"
          >
            <option value="">Choose a feedback cycle...</option>
            {activeCycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name} ({cycle.type}) - {new Date(cycle.startDate).toLocaleDateString()} to {new Date(cycle.endDate).toLocaleDateString()}
              </option>
            ))}
          </Select>
          {selectedCycleId && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-800">Cycle Details</span>
              </div>
              {(() => {
                const selectedCycle = activeCycles.find(c => c.id === selectedCycleId);
                return selectedCycle ? (
                  <div className="text-sm text-purple-700 space-y-1">
                    <p><strong>Type:</strong> {selectedCycle.type}</p>
                    <p><strong>Duration:</strong> {new Date(selectedCycle.startDate).toLocaleDateString()} - {new Date(selectedCycle.endDate).toLocaleDateString()}</p>
                    <p><strong>Participants:</strong> {selectedCycle.participants || 0}</p>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </Card>

        {/* Performance Classification */}
        <Card className="p-6 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl">
          <SectionHeader 
            icon={Target} 
            iconBg="bg-gradient-to-br from-gray-700 to-gray-900" 
            title="Take a moment" 
            subtitle="Ask yourself, where is your team member currently standing?"
          />
          <div className="flex flex-wrap gap-3">
            {[
              { 
                value: FeedbackColorClassification.GREEN, 
                label: 'Exceeds Expectations', 
                icon: TrendingUp,
                gradient: 'from-emerald-500 to-emerald-600',
                ring: 'ring-emerald-400',
                lightBg: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
                tooltip: 'Consistently delivers strong results, shows ownership and positive impact'
              },
              { 
                value: FeedbackColorClassification.YELLOW, 
                label: 'Meets Expectations', 
                icon: Award,
                gradient: 'from-amber-500 to-amber-600',
                ring: 'ring-amber-400',
                lightBg: 'bg-amber-50 border-amber-200 hover:border-amber-400',
                tooltip: "Performs well and meets the role's requirements"
              },
              { 
                value: FeedbackColorClassification.RED, 
                label: 'Needs Improvement', 
                icon: TrendingDown,
                gradient: 'from-rose-500 to-rose-600',
                ring: 'ring-rose-400',
                lightBg: 'bg-rose-50 border-rose-200 hover:border-rose-400',
                tooltip: 'Gaps in delivery, behavior or engagement that require attention'
              },
            ].map((option) => {
              const isSelected = colorClassification === option.value;
              const Icon = option.icon;
              return (
                <div key={option.value} className="relative group">
                  <button
                    type="button"
                    onClick={() => setColorClassification(isSelected ? '' : option.value)}
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
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-[200px] text-center leading-relaxed">
                    {option.tooltip}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                  </div>
                </div>
              );
            })}
          </div>
          {!colorClassification && (
            <p className="text-sm text-rose-500 mt-4 font-medium">
              ⚠️ Required: Please classify
            </p>
          )}
        </Card>

        {/* Overall Comment */}
        <Card className="p-6 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl">
          <SectionHeader 
            icon={MessageSquare} 
            iconBg="bg-gradient-to-br from-blue-500 to-cyan-600" 
            title="Overall Feedback" 
            subtitle="How I experienced your work over the past few months - including standout contributions, efforts, or moments worth highlighting."
          />
          <textarea
            className="w-full p-4 border border-gray-200 rounded-xl min-h-36 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white focus:bg-white"
            value={overallComment}
            onChange={(e) => setOverallComment(e.target.value)}
            placeholder="Share your overall feedback..."
            required
          />
        </Card>

        {/* Strengths */}
        <Card className="p-6 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl">
          <div className="flex items-start justify-between mb-5">
            <SectionHeader 
              icon={Star} 
              iconBg="bg-gradient-to-br from-emerald-500 to-teal-600" 
              title="Strengths" 
              subtitle={getHelpText('strengths')}
            />
            <Button variant="outline" size="sm" onClick={addStrength} className="flex-shrink-0 rounded-xl">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
          <div className="space-y-3">
            {strengths.map((strength, index) => (
              <div key={index} className="flex gap-2 group">
                <textarea
                  value={strength}
                  onChange={(e) => updateStrength(index, e.target.value)}
                  placeholder="Describe a strength..."
                  className="flex-1 p-4 border border-gray-200 rounded-xl min-h-20 resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white focus:bg-white"
                  rows={2}
                />
                <button
                  onClick={() => removeStrength(index)}
                  className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 self-start mt-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Areas for Improvement */}
        <Card className="p-6 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl">
          <div className="flex items-start justify-between mb-5">
            <SectionHeader 
              icon={TrendingUp} 
              iconBg="bg-gradient-to-br from-amber-500 to-orange-600" 
              title="Areas for Improvement" 
              subtitle={getHelpText('improvements')}
            />
            <Button variant="outline" size="sm" onClick={addAreaForImprovement} className="flex-shrink-0 rounded-xl">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
          <div className="space-y-3">
            {areasForImprovement.map((area, index) => (
              <div key={index} className="flex gap-2 group">
                <textarea
                  value={area}
                  onChange={(e) => updateAreaForImprovement(index, e.target.value)}
                  placeholder="Describe an area for improvement..."
                  className="flex-1 p-4 border border-gray-200 rounded-xl min-h-20 resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white focus:bg-white"
                  rows={2}
                />
                <button
                  onClick={() => removeAreaForImprovement(index)}
                  className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 self-start mt-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Growth & Development */}
        {reviewType === ReviewType.MANAGER_REVIEW && (
          <Card className="p-6 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl">
            <div className="flex items-start justify-between mb-5">
              <SectionHeader 
                icon={Target} 
                iconBg="bg-gradient-to-br from-purple-500 to-indigo-600" 
                title="Growth & Development" 
                subtitle="What are the focus areas and key actions we agreed on to support your growth over the next few months?"
              />
              <Button variant="outline" size="sm" onClick={addGoal} className="flex-shrink-0 rounded-xl whitespace-nowrap">
                <Plus className="w-4 h-4 mr-1" />
                Add Goal
              </Button>
            </div>
            <div className="space-y-4">
              {goals.map((goal, index) => (
                <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl space-y-3 group">
                  <div className="flex items-start gap-3">
                    <Input
                      label="Goal Title"
                      value={goal.title}
                      onChange={(e) => updateGoal(index, 'title', e.target.value)}
                      placeholder="e.g., Improve React skills"
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
              ))}
            </div>
          </Card>
        )}

        {/* Bottom Line */}
        <Card className="p-6 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl">
          <SectionHeader 
            icon={FileText} 
            iconBg="bg-gradient-to-br from-rose-500 to-pink-600" 
            title="Bottom Line" 
            subtitle="What is the key message or takeaway I want you to leave this conversation with?"
          />
          <textarea
            className="w-full p-4 border border-gray-200 rounded-xl min-h-28 resize-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white focus:bg-white"
            value={bottomLine}
            onChange={(e) => setBottomLine(e.target.value)}
            placeholder="Share the key message or takeaway..."
          />
        </Card>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <Button 
              variant="ghost" 
              onClick={onClose} 
              disabled={isCreating}
              className="text-gray-600"
            >
              Cancel
            </Button>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleSaveAsDraft} 
                disabled={isCreating}
                className="rounded-xl"
              >
                {isCreating ? <LoadingSpinner size="sm" /> : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Save Draft</span>
                    <span className="sm:hidden">Draft</span>
                  </>
                )}
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isCreating}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg rounded-xl px-6"
              >
                {isCreating ? <LoadingSpinner size="sm" /> : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Submit Feedback</span>
                    <span className="sm:hidden">Submit</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
