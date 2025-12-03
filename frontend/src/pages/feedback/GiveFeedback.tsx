import React, { useState, useEffect } from 'react';
import { useHierarchyStore } from '../../stores/hierarchyStore';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/Avatar';
import { 
  Users, 
  MessageSquare, 
  Send, 
  AlertCircle, 
  CheckCircle,
  User,
  Mail,
  Briefcase,
  Building
} from 'lucide-react';

const GiveFeedback: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    directReports, 
    isLoading, 
    error, 
    fetchDirectReports, 
    clearError 
  } = useHierarchyStore();

  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<string>('constructive');
  const [feedbackContent, setFeedbackContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (user?.id) {
      // Fetch direct reports for the current user (assuming they are a manager)
      fetchDirectReports(user.id);
    }
  }, [user?.id, fetchDirectReports]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !feedbackContent.trim()) return;

    setIsSubmitting(true);
    try {
      // Mock feedback submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubmitSuccess(true);
      setFeedbackContent('');
      setSelectedEmployee('');
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEmployeeData = directReports.find(emp => emp.id === selectedEmployee);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-800">{error}</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearError}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              Clear Error
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (directReports.length === 0) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Direct Reports</h2>
          <p className="text-gray-600 mb-4">
            You don't have any direct reports to give feedback to. Only managers can give feedback to their direct reports.
          </p>
          <Badge variant="secondary">Manager Role Required</Badge>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <MessageSquare className="h-6 w-6 mr-2" />
          Give Feedback
        </h1>
        <p className="text-gray-600 mt-1">
          Provide feedback to your direct reports. You can only give feedback to employees who report directly to you.
        </p>
      </div>

      {submitSuccess && (
        <Card className="p-4 bg-green-50 border-green-200 mb-6">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-green-800">Feedback submitted successfully!</p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Direct Reports List */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Your Direct Reports ({directReports.length})
          </h3>
          <div className="space-y-3">
            {directReports.map((employee) => (
              <div
                key={employee.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedEmployee === employee.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedEmployee(employee.id)}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={employee.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.name}`} 
                      alt={employee.name} 
                    />
                    <AvatarFallback className="text-sm font-semibold bg-gray-200 text-gray-700">
                      {employee.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {employee.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {employee.position}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {employee.department}
                    </p>
                  </div>
                  {employee.isManager && (
                    <Badge variant="outline" className="text-xs">
                      Manager
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Feedback Form */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Feedback Form</h3>
            
            {selectedEmployeeData ? (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage 
                      src={selectedEmployeeData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedEmployeeData.name}`} 
                      alt={selectedEmployeeData.name} 
                    />
                    <AvatarFallback className="text-lg font-semibold bg-gray-200 text-gray-700">
                      {selectedEmployeeData.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium text-gray-900">{selectedEmployeeData.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {selectedEmployeeData.email}
                      </span>
                      <span className="flex items-center">
                        <Briefcase className="h-3 w-3 mr-1" />
                        {selectedEmployeeData.position}
                      </span>
                      <span className="flex items-center">
                        <Building className="h-3 w-3 mr-1" />
                        {selectedEmployeeData.department}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                  <p className="text-yellow-800">Please select an employee to give feedback to.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback Type
                </label>
                <Select
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value)}
                >
                  <option value="constructive">Constructive Feedback</option>
                  <option value="positive">Positive Recognition</option>
                  <option value="improvement">Areas for Improvement</option>
                  <option value="general">General Feedback</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback Content
                </label>
                <Textarea
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  placeholder="Provide specific, actionable feedback..."
                  rows={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Be specific and constructive. Focus on behaviors and outcomes.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFeedbackContent('');
                    setSelectedEmployee('');
                  }}
                >
                  Clear
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedEmployee || !feedbackContent.trim() || isSubmitting}
                  icon={Send}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GiveFeedback;
