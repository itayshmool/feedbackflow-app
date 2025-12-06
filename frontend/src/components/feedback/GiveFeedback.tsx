// Give Feedback Form Component

import React, { useState, useEffect } from 'react';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { useCyclesStore } from '../../stores/cyclesStore';
import { useAuthStore } from '../../stores/authStore';
import { useHierarchyStore } from '../../stores/hierarchyStore';
import { ReviewType, GoalCategory, GoalPriority, CreateFeedbackRequest } from '../../types/feedback.types';
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
  const [confidential, setConfidential] = useState(false);
  const [ratings, setRatings] = useState<RatingInput[]>([]);
  const [goals, setGoals] = useState<GoalInput[]>([]);
  
  // AI Generation state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Feature flag for AI generation
  const isAIEnabled = import.meta.env.VITE_ENABLE_AI_FEEDBACK === 'true';

  useEffect(() => {
    clearErrors();
    fetchCycles(); // Fetch available cycles
    if (user?.id) {
      fetchDirectReports(user.id); // Fetch direct reports for the current user
    }
  }, [clearErrors, fetchCycles, user?.id, fetchDirectReports]);

  // Get active cycles for selection - filtered by organization for managers
  const activeCycles = (cycles || []).filter(cycle => 
    cycle.status === 'active' && 
    (user?.roles?.includes('admin') || cycle.organizationId === user?.organizationId)
  );

  // Determine if current review type requires direct reports only
  const requiresDirectReports = reviewType === ReviewType.MANAGER_REVIEW;

  // Helper function to get contextual help text based on review type
  const getHelpText = (section: string): string => {
    const helpTexts = {
      manager: {
        strengths: "What has this employee done exceptionally well? Focus on specific achievements and behaviors.",
        improvements: "What skills or behaviors should they develop? Be constructive and actionable.",
        examples: "Provide concrete examples of situations that illustrate your feedback.",
        recommendations: "Suggest specific actions or resources for professional development."
      },
      project: {
        strengths: "What went well in this collaboration? Highlight positive contributions.",
        improvements: "What could improve in future projects? Keep it constructive and forward-looking.",
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
          specificExamples: aiExamples,
          recommendations: aiRecs,
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
        if (aiExamples) {
          setSpecificExamples(Array.isArray(aiExamples) ? aiExamples : aiExamples.split('. ').filter((e: string) => e.trim()));
        }
        if (aiRecs) {
          setRecommendations(Array.isArray(aiRecs) ? aiRecs : aiRecs.split('. ').filter((r: string) => r.trim()));
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
      alert('Please enter a recipient email');
      return;
    }

    const data: CreateFeedbackRequest = {
      cycleId: selectedCycleId,
      toUserEmail,
      reviewType,
      content: {
        overallComment,
        strengths: strengths.filter((s) => s.trim()),
        areasForImprovement: areasForImprovement.filter((a) => a.trim()),
        specificExamples: specificExamples.filter((e) => e.trim()),
        recommendations: recommendations.filter((r) => r.trim()),
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
      onSuccess?.();
      onClose?.();
    }
  };

  const handleSubmit = async () => {
    if (!selectedCycleId) {
      alert('Please select a feedback cycle');
      return;
    }

    if (!toUserEmail) {
      alert('Please enter a recipient email');
      return;
    }

    if (!overallComment.trim()) {
      alert('Please provide an overall comment');
      return;
    }

    const data: CreateFeedbackRequest = {
      cycleId: selectedCycleId,
      toUserEmail,
      reviewType,
      content: {
        overallComment,
        strengths: strengths.filter((s) => s.trim()),
        areasForImprovement: areasForImprovement.filter((a) => a.trim()),
        specificExamples: specificExamples.filter((e) => e.trim()),
        recommendations: recommendations.filter((r) => r.trim()),
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
      await submitFeedback(result.id);
      onSuccess?.();
      onClose?.();
    }
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
            <Button variant="ghost" onClick={onClose} icon={X}>
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

      {createError && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-800">{createError}</p>
        </Card>
      )}

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
          <div>
            <Select
              label="Review Type"
              value={reviewType}
              onChange={(e) => setReviewType(e.target.value as ReviewType)}
              required
            >
              <option value={ReviewType.MANAGER_REVIEW}>Manager Review</option>
              <option value={ReviewType.PROJECT_REVIEW}>Project Review</option>
            </Select>
            {reviewType === ReviewType.MANAGER_REVIEW && (
              <p className="text-sm text-blue-600 mt-1">
                Manager reviews can only be given to your direct reports.
              </p>
            )}
            {reviewType === ReviewType.PROJECT_REVIEW && (
              <p className="text-sm text-green-600 mt-1">
                Project reviews can be given to anyone in your organization.
              </p>
            )}
          </div>
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

      {/* Overall Comment */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Overall Feedback</h3>
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
              <Input
                value={strength}
                onChange={(e) => updateStrength(index, e.target.value)}
                placeholder="Describe a strength..."
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeStrength(index)}
                icon={Trash2}
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
              <Input
                value={area}
                onChange={(e) => updateAreaForImprovement(index, e.target.value)}
                placeholder="Describe an area for improvement..."
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAreaForImprovement(index)}
                icon={Trash2}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Specific Examples */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Specific Examples</h3>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <HelpCircle className="w-4 h-4" />
              {getHelpText('examples')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addExample} icon={Plus}>
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {specificExamples.map((example, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={example}
                onChange={(e) => updateExample(index, e.target.value)}
                placeholder="Provide a specific example..."
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeExample(index)}
                icon={Trash2}
              />
            </div>
          ))}
        </div>
      </Card>

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
              <Input
                value={rec}
                onChange={(e) => updateRecommendation(index, e.target.value)}
                placeholder="Provide a recommendation..."
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRecommendation(index)}
                icon={Trash2}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Goals - Only show for Manager Reviews */}
      {reviewType === ReviewType.MANAGER_REVIEW && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Development Goals</h3>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <HelpCircle className="w-4 h-4" />
                Set 3-5 SMART goals for the employee's growth and development
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
              <div className="grid grid-cols-3 gap-3">
                <Select
                  label="Category"
                  value={goal.category}
                  onChange={(e) => updateGoal(index, 'category', e.target.value as GoalCategory)}
                >
                  <option value={GoalCategory.TECHNICAL_SKILLS}>Technical Skills</option>
                  <option value={GoalCategory.SOFT_SKILLS}>Soft Skills</option>
                  <option value={GoalCategory.LEADERSHIP}>Leadership</option>
                  <option value={GoalCategory.COMMUNICATION}>Communication</option>
                  <option value={GoalCategory.PERFORMANCE}>Performance</option>
                  <option value={GoalCategory.CAREER_DEVELOPMENT}>Career Development</option>
                </Select>
                <Select
                  label="Priority"
                  value={goal.priority}
                  onChange={(e) => updateGoal(index, 'priority', e.target.value as GoalPriority)}
                >
                  <option value={GoalPriority.LOW}>Low</option>
                  <option value={GoalPriority.MEDIUM}>Medium</option>
                  <option value={GoalPriority.HIGH}>High</option>
                  <option value={GoalPriority.CRITICAL}>Critical</option>
                </Select>
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

