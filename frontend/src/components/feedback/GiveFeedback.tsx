// Give Feedback Form Component

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
import { Plus, Trash2, Save, Send, X, Calendar, Users, Target, HelpCircle, Sparkles, Loader2 } from 'lucide-react';
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
  const [goals, setGoals] = useState<GoalInput[]>([]);
  
  // AI Generation state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Feature flag for AI generation
  const isAIEnabled = import.meta.env.VITE_ENABLE_AI_FEEDBACK === 'true';

  useEffect(() => {
    clearErrors();
    // Fetch cycles filtered by user's organization (non-admins only see their org's cycles)
    if (user?.organizationId) {
      fetchCycles({ organizationId: user.organizationId });
    } else {
      fetchCycles(); // Admins or users without org see all
    }
    if (user?.id) {
      fetchDirectReports(user.id); // Fetch direct reports for the current user
    }
  }, [clearErrors, fetchCycles, user?.id, user?.organizationId, fetchDirectReports]);

  // Initialize selectedUser when initialToUserEmail is provided and directReports are loaded
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
        // If not in direct reports but we have the name, create a minimal user object
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

  // Get active cycles for selection (already filtered by organization from backend)
  const activeCycles = (cycles || []).filter(cycle => cycle.status === 'active');

  // Determine if current review type requires direct reports only
  const requiresDirectReports = reviewType === ReviewType.MANAGER_REVIEW;

  // Helper function to get contextual help text based on review type
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

  // AI Feedback Generation
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
        
        // Auto-fill form fields - handle both array and string formats
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
        // Development goals - add as goals if manager review
        if (aiDevGoals && reviewType === ReviewType.MANAGER_REVIEW) {
          const newGoals = (Array.isArray(aiDevGoals) ? aiDevGoals : [aiDevGoals]).map((title: string) => ({
            title,
            description: '',
            category: GoalCategory.PERFORMANCE,
            priority: GoalPriority.MEDIUM,
            targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 90 days from now
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
      colorClassification: colorClassification || undefined, // Internal triage color
      content: {
        overallComment,
        strengths: strengths.filter((s) => s.trim()),
        areasForImprovement: areasForImprovement.filter((a) => a.trim()),
        specificExamples: specificExamples.filter((e) => e.trim()),
        recommendations: recommendations.filter((r) => r.trim()),
        bottomLine: bottomLine.trim() || undefined,
        confidential,
      },
      ratings: [], // Ratings removed from UI
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
    // Error toast is shown by api.ts interceptor
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
      colorClassification: colorClassification || undefined, // Internal triage color
      content: {
        overallComment,
        strengths: strengths.filter((s) => s.trim()),
        areasForImprovement: areasForImprovement.filter((a) => a.trim()),
        specificExamples: specificExamples.filter((e) => e.trim()),
        recommendations: recommendations.filter((r) => r.trim()),
        bottomLine: bottomLine.trim() || undefined,
        confidential,
      },
      ratings: [], // Ratings removed from UI
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
      // After creating as draft, submit it immediately
      const submitted = await submitFeedback(result.id);
      if (submitted) {
        toast.success('Feedback submitted successfully');
        onSuccess?.();
        onClose?.();
      }
      // Error toast for submit failure is shown by api.ts interceptor
    }
    // Error toast for create failure is shown by api.ts interceptor
  };

  if (isLoadingDirectReports) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading direct reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Give Feedback</h2>
        <div className="flex items-center gap-2">
          {isAIEnabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateAI}
              disabled={!selectedUser || isGeneratingAI}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-none hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate with AI
                </>
              )}
            </Button>
          )}
          {onClose && (
            <Button 
              type="button"
              variant="ghost" 
              onClick={onClose}
              icon={X}
            >
              Close
            </Button>
          )}
        </div>
      </div>

      {aiError && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-800">{aiError}</p>
        </Card>
      )}

      {/* Error messages are shown via toast notifications */}

      {/* Basic Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="space-y-4">
          {!initialToUserEmail && (
            <>
              {requiresDirectReports ? (
                // Manager Review - Only direct reports
                directReports.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-800">
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
                // Peer Review, Project Review - Anyone in organization
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
            </>
          )}
          {(toUserName || selectedUser) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient
              </label>
              <div className="p-3 bg-gray-50 rounded-md border">
                <p className="text-gray-900 font-medium">
                  {selectedUser?.name || toUserName}
                </p>
                <p className="text-sm text-gray-600">{toUserEmail}</p>
                {selectedUser && (
                  <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                    {selectedUser.department && (
                      <span>Department: {selectedUser.department}</span>
                    )}
                    {selectedUser.position && (
                      <span>Position: {selectedUser.position}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Review type is hidden - always Manager Review */}
        </div>
      </Card>

      {/* Cycle Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Feedback Cycle
        </h3>
        <div className="space-y-4">
          <Select
            label="Select Cycle"
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            required
          >
            <option value="">Choose a feedback cycle...</option>
            {activeCycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name} ({cycle.type}) - {new Date(cycle.startDate).toLocaleDateString()} to {new Date(cycle.endDate).toLocaleDateString()}
              </option>
            ))}
          </Select>
          {selectedCycleId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Cycle Details</span>
              </div>
              {(() => {
                const selectedCycle = activeCycles.find(c => c.id === selectedCycleId);
                return selectedCycle ? (
                  <div className="text-sm text-blue-700">
                    <p><strong>Type:</strong> {selectedCycle.type}</p>
                    <p><strong>Duration:</strong> {new Date(selectedCycle.startDate).toLocaleDateString()} - {new Date(selectedCycle.endDate).toLocaleDateString()}</p>
                    <p><strong>Participants:</strong> {selectedCycle.participants || 0}</p>
                    {selectedCycle.description && (
                      <p><strong>Description:</strong> {selectedCycle.description}</p>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>
      </Card>

      {/* Performance Classification - Internal Use Only */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">
            Performance Classification <span className="text-red-500">*</span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            🔒 This classification is for internal use only and will <strong>not</strong> be visible to the recipient.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { value: FeedbackColorClassification.GREEN, label: 'Exceeds Expectations', bgColor: 'bg-green-500', hoverColor: 'hover:bg-green-600', ringColor: 'ring-green-500' },
            { value: FeedbackColorClassification.YELLOW, label: 'Meets Expectations', bgColor: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-600', ringColor: 'ring-yellow-500' },
            { value: FeedbackColorClassification.RED, label: 'Needs Improvement', bgColor: 'bg-red-500', hoverColor: 'hover:bg-red-600', ringColor: 'ring-red-500' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setColorClassification(colorClassification === option.value ? '' : option.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                colorClassification === option.value
                  ? `${option.bgColor} text-white border-transparent ring-2 ${option.ringColor} ring-offset-2`
                  : `bg-white border-gray-300 hover:border-gray-400 text-gray-700`
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${option.bgColor}`} />
              <span className="font-medium">{option.label}</span>
            </button>
          ))}
        </div>
        {!colorClassification && (
          <p className="text-sm text-red-500 mt-3">
            * Required: Please select a color classification
          </p>
        )}
      </Card>

      {/* Overall Comment */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Overall Feedback</h3>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <HelpCircle className="w-4 h-4" />
            How I experienced your work over the past few months - including standout contributions, efforts, or moments worth highlighting.
          </p>
        </div>
        <textarea
          className="w-full p-3 border rounded-md min-h-32"
          value={overallComment}
          onChange={(e) => setOverallComment(e.target.value)}
          placeholder="Provide your overall feedback..."
          required
        />
      </Card>


      {/* Strengths */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Strengths</h3>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <HelpCircle className="w-4 h-4" />
              {getHelpText('strengths')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addStrength} icon={Plus}>
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {strengths.map((strength, index) => (
            <div key={index} className="flex gap-2">
              <textarea
                value={strength}
                onChange={(e) => updateStrength(index, e.target.value)}
                placeholder="Describe a strength..."
                className="flex-1 p-3 border rounded-md min-h-20 resize-none"
                rows={2}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeStrength(index)}
                icon={Trash2}
                className="self-start mt-2"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Areas for Improvement */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Areas for Improvement</h3>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <HelpCircle className="w-4 h-4" />
              {getHelpText('improvements')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addAreaForImprovement} icon={Plus}>
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {areasForImprovement.map((area, index) => (
            <div key={index} className="flex gap-2">
              <textarea
                value={area}
                onChange={(e) => updateAreaForImprovement(index, e.target.value)}
                placeholder="Describe an area for improvement..."
                className="flex-1 p-3 border rounded-md min-h-20 resize-none"
                rows={2}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAreaForImprovement(index)}
                icon={Trash2}
                className="self-start mt-2"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Specific Examples - Hidden from UI but data structure preserved */}

      {/* Recommendations */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Recommendations</h3>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <HelpCircle className="w-4 h-4" />
              {getHelpText('recommendations')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addRecommendation} icon={Plus}>
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {recommendations.map((rec, index) => (
            <div key={index} className="flex gap-2">
              <textarea
                value={rec}
                onChange={(e) => updateRecommendation(index, e.target.value)}
                placeholder="Provide a recommendation..."
                className="flex-1 p-3 border rounded-md min-h-20 resize-none"
                rows={2}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRecommendation(index)}
                icon={Trash2}
                className="self-start mt-2"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Bottom Line */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Bottom Line</h3>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <HelpCircle className="w-4 h-4" />
            What is the key message or takeaway I want you to leave this conversation with?
          </p>
        </div>
        <textarea
          className="w-full p-3 border rounded-md min-h-24"
          value={bottomLine}
          onChange={(e) => setBottomLine(e.target.value)}
          placeholder="Share the key message or takeaway..."
        />
      </Card>

      {/* Goals - Only show for Manager Reviews */}
      {reviewType === ReviewType.MANAGER_REVIEW && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Growth & Development</h3>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <HelpCircle className="w-4 h-4" />
                What is the main area you should focus on to grow and increase your impact in the upcoming period? (Skills to grow, things to do a bit differently, or where you can make more impact).
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addGoal} icon={Plus}>
              Add Goal
            </Button>
          </div>
        <div className="space-y-4">
          {goals.map((goal, index) => (
            <div key={index} className="p-4 border rounded-md space-y-3">
              <div className="flex items-start gap-3">
                <Input
                  label="Goal Title"
                  value={goal.title}
                  onChange={(e) => updateGoal(index, 'title', e.target.value)}
                  placeholder="e.g., Improve React skills"
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
                className="w-full p-3 border rounded-md"
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
              {/* Category and Priority hidden from UI but preserved in data structure */}
            </div>
          ))}
        </div>
      </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end sticky bottom-0 bg-white py-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isCreating}>
          Cancel
        </Button>
        <Button 
          variant="outline" 
          onClick={handleSaveAsDraft} 
          disabled={isCreating}
          icon={Save}
        >
          {isCreating ? <LoadingSpinner size="sm" /> : 'Save as Draft'}
        </Button>
        <Button onClick={handleSubmit} disabled={isCreating} icon={Send}>
          {isCreating ? <LoadingSpinner size="sm" /> : 'Submit Feedback'}
        </Button>
      </div>
    </div>
  );
};

