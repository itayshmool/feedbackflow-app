import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useOrganizationStore } from '../../../stores/organizationStore';
import { Team, CreateTeamRequest, UpdateTeamRequest, TeamType } from '../../../types/organization.types';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { X, Save, AlertCircle, Users } from 'lucide-react';

interface TeamFormProps {
  organizationId: string;
  team?: Team | null;
  onClose: () => void;
}

interface FormData {
  name: string;
  description: string;
  type: TeamType;
  departmentId: string;
  teamLeadEmail: string;
  allowPeerFeedback: boolean;
  requireTeamLeadApproval: boolean;
}

const TeamForm: React.FC<TeamFormProps> = ({ organizationId, team, onClose }) => {
  const {
    createTeam,
    updateTeam,
    departments,
    teamsLoading,
    teamsError,
  } = useOrganizationStore();

  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      name: team?.name || '',
      description: team?.description || '',
      type: team?.type || TeamType.CORE,
      departmentId: team?.departmentId || '',
      teamLeadEmail: '',
      allowPeerFeedback: team?.settings?.allowPeerFeedback ?? true,
      requireTeamLeadApproval: team?.settings?.requireTeamLeadApproval ?? false,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);

      const teamData = {
        name: data.name,
        description: data.description || undefined,
        type: data.type,
        departmentId: data.departmentId && data.departmentId.trim() !== '' ? data.departmentId : undefined,
        teamLeadEmail: data.teamLeadEmail && data.teamLeadEmail.trim() !== '' ? data.teamLeadEmail : undefined,
        settings: {
          allowPeerFeedback: data.allowPeerFeedback,
          requireTeamLeadApproval: data.requireTeamLeadApproval,
          customWorkflows: [],
          collaborationTools: [],
        },
      };

      console.log('📤 Sending team data:', JSON.stringify(teamData, null, 2));

      if (team) {
        // Update existing team
        await updateTeam(organizationId, team.id, teamData as UpdateTeamRequest);
      } else {
        // Create new team
        await createTeam(organizationId, teamData as CreateTeamRequest);
      }

      console.log('✅ Team created successfully');
      onClose();
    } catch (error) {
      console.error('❌ Error creating team:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        response: (error as any)?.response?.data,
        status: (error as any)?.response?.status,
      });
      
      // Extract the actual error message from the backend response
      let errorMessage = 'Failed to save team';
      
      if ((error as any)?.response?.data) {
        const responseData = (error as any).response.data;
        // Check for details field first (more specific error)
        if (responseData.details) {
          errorMessage = responseData.details;
        } else if (responseData.error) {
          errorMessage = responseData.error;
        } else if (responseData.message) {
          errorMessage = responseData.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    }
  };

  // Get departments for this organization
  const organizationDepartments = (departments || []).filter(dept => dept.organizationId === organizationId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 animate-slideUp">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {team ? 'Edit Team' : 'Create New Team'}
                </h2>
                <p className="text-sm text-gray-500">
                  {team ? 'Update team information and settings' : 'Add a new team to your organization'}
                </p>
              </div>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm" className="hover:bg-gray-100">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Error Display */}
          {(error || teamsError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error || teamsError}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Name *
                </label>
                <Input
                  {...register('name', { required: 'Team name is required' })}
                  placeholder="Enter team name"
                  className={errors.name ? 'border-red-300' : ''}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Enter team description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Type *
                  </label>
                  <select
                    {...register('type', { required: 'Team type is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={TeamType.CORE}>Core Team</option>
                    <option value={TeamType.SUPPORT}>Support Team</option>
                    <option value={TeamType.PROJECT}>Project Team</option>
                    <option value={TeamType.CROSS_FUNCTIONAL}>Cross-functional Team</option>
                    <option value={TeamType.TEMPORARY}>Temporary Team</option>
                  </select>
                  {errors.type && (
                    <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    {...register('departmentId')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No department</option>
                    {organizationDepartments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Lead Email
                </label>
                <Input
                  {...register('teamLeadEmail', {
                    validate: (value) => {
                      if (!value || value.trim() === '') return true;
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      return emailRegex.test(value) || 'Please enter a valid email address';
                    }
                  })}
                  type="email"
                  placeholder="Enter team lead email address"
                />
                {errors.teamLeadEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.teamLeadEmail.message}</p>
                )}
              </div>
            </div>

            {/* Feedback Settings */}
            <div className="space-y-4 bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <h3 className="text-lg font-medium text-gray-900">Feedback Settings</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    {...register('allowPeerFeedback')}
                    type="checkbox"
                    id="allowPeerFeedback"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="allowPeerFeedback" className="ml-2 block text-sm text-gray-900">
                    Allow peer feedback within team
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    {...register('requireTeamLeadApproval')}
                    type="checkbox"
                    id="requireTeamLeadApproval"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="requireTeamLeadApproval" className="ml-2 block text-sm text-gray-900">
                    Require team lead approval for feedback
                  </label>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 bg-gray-50 -mx-6 px-6 py-4 rounded-b-lg mt-6">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                disabled={isSubmitting}
                className="min-w-[100px] hover:bg-gray-100"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {team ? 'Update Team' : 'Create Team'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default TeamForm;
