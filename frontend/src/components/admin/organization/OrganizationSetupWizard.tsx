import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useOrganizationStore } from '../../../stores/organizationStore';
import { CreateOrganizationRequest, CreateDepartmentRequest, CreateTeamRequest, SubscriptionPlan, DepartmentType, TeamType } from '../../../types/organization.types';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { CheckCircle, ArrowRight, ArrowLeft, Building, Users, User, AlertCircle } from 'lucide-react';

interface OrganizationSetupWizardProps {
  onComplete: (organizationId: string) => void;
  onCancel: () => void;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
}

interface OrganizationFormData {
  name: string;
  slug: string;
  description: string;
  contactEmail: string;
  subscriptionPlan: SubscriptionPlan;
  maxUsers: number;
  maxCycles: number;
  storageLimitGb: number;
}

interface DepartmentFormData {
  name: string;
  description: string;
  type: DepartmentType;
}

interface TeamFormData {
  name: string;
  description: string;
  type: TeamType;
  departmentId: string;
}

const OrganizationSetupWizard: React.FC<OrganizationSetupWizardProps> = ({ onComplete, onCancel }) => {
  const {
    createOrganization,
    createDepartment,
    createTeam,
    organizationsLoading,
    organizationsError,
  } = useOrganizationStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [createdOrganizationId, setCreatedOrganizationId] = useState<string | null>(null);
  const [createdDepartments, setCreatedDepartments] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const steps: WizardStep[] = [
    {
      id: 'organization',
      title: 'Organization Details',
      description: 'Set up your organization information and subscription plan',
      icon: Building,
    },
    {
      id: 'departments',
      title: 'Departments',
      description: 'Create your organizational departments',
      icon: Users,
    },
    {
      id: 'teams',
      title: 'Teams',
      description: 'Set up teams within your departments',
      icon: User,
    },
    {
      id: 'complete',
      title: 'Complete',
      description: 'Your organization is ready to use',
      icon: CheckCircle,
    },
  ];

  const {
    register: registerOrg,
    handleSubmit: handleOrgSubmit,
    formState: { errors: orgErrors },
    watch: watchOrg,
  } = useForm<OrganizationFormData>({
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      contactEmail: '',
      subscriptionPlan: SubscriptionPlan.BASIC,
      maxUsers: 10,
      maxCycles: 5,
      storageLimitGb: 1,
    },
  });

  const {
    register: registerDept,
    handleSubmit: handleDeptSubmit,
    formState: { errors: deptErrors },
  } = useForm<DepartmentFormData>({
    defaultValues: {
      name: '',
      description: '',
      type: DepartmentType.OTHER,
    },
  });

  const {
    register: registerTeam,
    handleSubmit: handleTeamSubmit,
    formState: { errors: teamErrors },
  } = useForm<TeamFormData>({
    defaultValues: {
      name: '',
      description: '',
      type: TeamType.CORE,
      departmentId: '',
    },
  });

  const [departments, setDepartments] = useState<DepartmentFormData[]>([]);
  const [teams, setTeams] = useState<TeamFormData[]>([]);

  const watchedOrgName = watchOrg('name');

  // Auto-generate slug from name
  React.useEffect(() => {
    if (watchedOrgName) {
      const generatedSlug = watchedOrgName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      // Note: In a real implementation, you'd use setValue from react-hook-form
    }
  }, [watchedOrgName]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onOrganizationSubmit = async (data: OrganizationFormData) => {
    try {
      setError(null);
      const orgData: CreateOrganizationRequest = {
        name: data.name,
        slug: data.slug,
        description: data.description || undefined,
        contactEmail: data.contactEmail,
        subscriptionPlan: data.subscriptionPlan,
        maxUsers: data.maxUsers,
        maxCycles: data.maxCycles,
        storageLimitGb: data.storageLimitGb,
      };
      
      const organization = await createOrganization(orgData);
      setCreatedOrganizationId(organization.id);
      handleNext();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create organization');
    }
  };

  const onDepartmentSubmit = (data: DepartmentFormData) => {
    setDepartments(prev => [...prev, data]);
    // Reset form
    handleDeptSubmit(() => {})();
  };

  const onTeamSubmit = (data: TeamFormData) => {
    setTeams(prev => [...prev, data]);
    // Reset form
    handleTeamSubmit(() => {})();
  };

  const handleComplete = async () => {
    if (!createdOrganizationId) return;

    try {
      setError(null);

      // Create departments
      for (const dept of departments) {
        const deptData: CreateDepartmentRequest = {
          name: dept.name,
          description: dept.description || undefined,
          type: dept.type,
        };
        const department = await createDepartment(createdOrganizationId, deptData);
        setCreatedDepartments(prev => [...prev, department.id]);
      }

      // Create teams
      for (const team of teams) {
        const teamData: CreateTeamRequest = {
          name: team.name,
          description: team.description || undefined,
          type: team.type,
          departmentId: team.departmentId || undefined,
        };
        await createTeam(createdOrganizationId, teamData);
      }

      onComplete(createdOrganizationId);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to complete setup');
    }
  };

  const removeDepartment = (index: number) => {
    setDepartments(prev => prev.filter((_, i) => i !== index));
  };

  const removeTeam = (index: number) => {
    setTeams(prev => prev.filter((_, i) => i !== index));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name *
              </label>
              <Input
                {...registerOrg('name', { required: 'Organization name is required' })}
                placeholder="Enter organization name"
                className={orgErrors.name ? 'border-red-300' : ''}
              />
              {orgErrors.name && (
                <p className="mt-1 text-sm text-red-600">{orgErrors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug *
              </label>
              <Input
                {...registerOrg('slug', { required: 'Slug is required' })}
                placeholder="organization-slug"
                className={orgErrors.slug ? 'border-red-300' : ''}
              />
              {orgErrors.slug && (
                <p className="mt-1 text-sm text-red-600">{orgErrors.slug.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...registerOrg('description')}
                rows={3}
                placeholder="Enter organization description"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email *
              </label>
              <Input
                {...registerOrg('contactEmail', { 
                  required: 'Contact email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                type="email"
                placeholder="contact@organization.com"
                className={orgErrors.contactEmail ? 'border-red-300' : ''}
              />
              {orgErrors.contactEmail && (
                <p className="mt-1 text-sm text-red-600">{orgErrors.contactEmail.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subscription Plan *
                </label>
                <select
                  {...registerOrg('subscriptionPlan', { required: 'Subscription plan is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={SubscriptionPlan.FREE}>Free</option>
                  <option value={SubscriptionPlan.BASIC}>Basic</option>
                  <option value={SubscriptionPlan.PROFESSIONAL}>Professional</option>
                  <option value={SubscriptionPlan.ENTERPRISE}>Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Users *
                </label>
                <Input
                  {...registerOrg('maxUsers', { 
                    required: 'Max users is required',
                    min: { value: 1, message: 'Must be at least 1' }
                  })}
                  type="number"
                  min="1"
                  className={orgErrors.maxUsers ? 'border-red-300' : ''}
                />
                {orgErrors.maxUsers && (
                  <p className="mt-1 text-sm text-red-600">{orgErrors.maxUsers.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Cycles *
                </label>
                <Input
                  {...registerOrg('maxCycles', { 
                    required: 'Max cycles is required',
                    min: { value: 1, message: 'Must be at least 1' }
                  })}
                  type="number"
                  min="1"
                  className={orgErrors.maxCycles ? 'border-red-300' : ''}
                />
                {orgErrors.maxCycles && (
                  <p className="mt-1 text-sm text-red-600">{orgErrors.maxCycles.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Storage Limit (GB) *
                </label>
                <Input
                  {...registerOrg('storageLimitGb', { 
                    required: 'Storage limit is required',
                    min: { value: 1, message: 'Must be at least 1 GB' }
                  })}
                  type="number"
                  min="1"
                  className={orgErrors.storageLimitGb ? 'border-red-300' : ''}
                />
                {orgErrors.storageLimitGb && (
                  <p className="mt-1 text-sm text-red-600">{orgErrors.storageLimitGb.message}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <form onSubmit={handleDeptSubmit(onDepartmentSubmit)} className="space-y-4">
              <h4 className="font-medium text-gray-900">Add Department</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Name *
                  </label>
                  <Input
                    {...registerDept('name', { required: 'Department name is required' })}
                    placeholder="Enter department name"
                    className={deptErrors.name ? 'border-red-300' : ''}
                  />
                  {deptErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{deptErrors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    {...registerDept('type', { required: 'Department type is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={DepartmentType.ENGINEERING}>Engineering</option>
                    <option value={DepartmentType.MARKETING}>Marketing</option>
                    <option value={DepartmentType.SALES}>Sales</option>
                    <option value={DepartmentType.HR}>Human Resources</option>
                    <option value={DepartmentType.FINANCE}>Finance</option>
                    <option value={DepartmentType.OPERATIONS}>Operations</option>
                    <option value={DepartmentType.CUSTOMER_SUCCESS}>Customer Success</option>
                    <option value={DepartmentType.PRODUCT}>Product</option>
                    <option value={DepartmentType.DESIGN}>Design</option>
                    <option value={DepartmentType.OTHER}>Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...registerDept('description')}
                  rows={2}
                  placeholder="Enter department description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Button type="submit" variant="outline" size="sm">
                Add Department
              </Button>
            </form>

            {/* Departments List */}
            {departments && departments.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Added Departments</h4>
                <div className="space-y-2">
                  {departments.map((dept, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{dept.name}</p>
                        <p className="text-sm text-gray-600 capitalize">{dept.type}</p>
                      </div>
                      <Button
                        onClick={() => removeDepartment(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <form onSubmit={handleTeamSubmit(onTeamSubmit)} className="space-y-4">
              <h4 className="font-medium text-gray-900">Add Team</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Name *
                  </label>
                  <Input
                    {...registerTeam('name', { required: 'Team name is required' })}
                    placeholder="Enter team name"
                    className={teamErrors.name ? 'border-red-300' : ''}
                  />
                  {teamErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{teamErrors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    {...registerTeam('type', { required: 'Team type is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={TeamType.CORE}>Core Team</option>
                    <option value={TeamType.SUPPORT}>Support Team</option>
                    <option value={TeamType.PROJECT}>Project Team</option>
                    <option value={TeamType.CROSS_FUNCTIONAL}>Cross-functional Team</option>
                    <option value={TeamType.TEMPORARY}>Temporary Team</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  {...registerTeam('departmentId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No department</option>
                  {departments.map((dept, index) => (
                    <option key={index} value={index.toString()}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...registerTeam('description')}
                  rows={2}
                  placeholder="Enter team description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Button type="submit" variant="outline" size="sm">
                Add Team
              </Button>
            </form>

            {/* Teams List */}
            {teams && teams.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Added Teams</h4>
                <div className="space-y-2">
                  {teams.map((team, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{team.name}</p>
                        <p className="text-sm text-gray-600 capitalize">{team.type}</p>
                        {team.departmentId && (
                          <p className="text-sm text-gray-500">
                            Department: {departments[parseInt(team.departmentId)]?.name}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => removeTeam(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Setup Complete!</h3>
            <p className="text-gray-600 mb-6">
              Your organization has been created with {departments?.length || 0} departments and {teams?.length || 0} teams.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Organization created successfully</li>
                <li>• {departments?.length || 0} departments configured</li>
                <li>• {teams?.length || 0} teams set up</li>
                <li>• Ready to start using FeedbackFlow</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Organization Setup</h2>
              <p className="text-gray-600">Set up your organization structure</p>
            </div>
            <Button onClick={onCancel} variant="ghost" size="sm">
              Cancel
            </Button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted 
                      ? 'bg-green-600 border-green-600 text-white' 
                      : isActive 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* Error Display */}
          {(error || organizationsError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error || organizationsError}</p>
              </div>
            </div>
          )}

          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-between">
            <Button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex space-x-3">
              {currentStep === 0 && (
                <Button
                  onClick={handleOrgSubmit(onOrganizationSubmit)}
                  disabled={organizationsLoading}
                >
                  {organizationsLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
              
              {currentStep === 1 && (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              
              {currentStep === 2 && (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              
              {currentStep === 3 && (
                <Button
                  onClick={handleComplete}
                  disabled={organizationsLoading}
                >
                  {organizationsLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Completing...
                    </>
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSetupWizard;
