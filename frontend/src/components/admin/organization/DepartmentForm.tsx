import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useOrganizationStore } from '../../../stores/organizationStore';
import { Department, CreateDepartmentRequest, UpdateDepartmentRequest, DepartmentType } from '../../../types/organization.types';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { X, Save, AlertCircle, Building } from 'lucide-react';

interface DepartmentFormProps {
  organizationId: string;
  department?: Department | null;
  onClose: () => void;
}

interface FormData {
  name: string;
  description: string;
  type: DepartmentType;
  parentDepartmentId: string;
  managerEmail: string;
  budget: number;
  allowCrossDepartmentFeedback: boolean;
  requireManagerApproval: boolean;
  feedbackFrequency: number;
  emailNotifications: boolean;
  inAppNotifications: boolean;
}

const DepartmentForm: React.FC<DepartmentFormProps> = ({ organizationId, department, onClose }) => {
  const {
    createDepartment,
    updateDepartment,
    departments,
    departmentsLoading,
    departmentsError,
  } = useOrganizationStore();

  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      name: department?.name || '',
      description: department?.description || '',
      type: department?.type || DepartmentType.OTHER,
      parentDepartmentId: department?.parentDepartmentId || '',
      managerEmail: '',
      budget: department?.budget || 0,
      allowCrossDepartmentFeedback: department?.settings?.allowCrossDepartmentFeedback ?? true,
      requireManagerApproval: department?.settings?.requireManagerApproval ?? true,
      feedbackFrequency: department?.settings?.feedbackFrequency || 30,
      emailNotifications: department?.settings?.notificationPreferences?.email ?? true,
      inAppNotifications: department?.settings?.notificationPreferences?.inApp ?? true,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);

      const departmentData = {
        name: data.name,
        description: data.description || undefined,
        type: data.type,
        parentDepartmentId: data.parentDepartmentId && data.parentDepartmentId.trim() !== '' ? data.parentDepartmentId : undefined,
        managerEmail: data.managerEmail && data.managerEmail.trim() !== '' ? data.managerEmail : undefined,
        budget: data.budget || undefined,
        settings: {
          allowCrossDepartmentFeedback: data.allowCrossDepartmentFeedback,
          requireManagerApproval: data.requireManagerApproval,
          feedbackFrequency: data.feedbackFrequency,
          notificationPreferences: {
            email: data.emailNotifications,
            inApp: data.inAppNotifications,
          },
        },
      };

      if (department) {
        // Update existing department
        await updateDepartment(organizationId, department.id, departmentData as UpdateDepartmentRequest);
      } else {
        // Create new department
        await createDepartment(organizationId, departmentData as CreateDepartmentRequest);
      }

      onClose();
    } catch (error) {
      console.error('❌ Error creating/updating department:', error);
      
      // Extract the actual error message from the backend response
      let errorMessage = 'Failed to save department';
      
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

  // Get parent departments (exclude current department if editing)
  const parentDepartments = (departments || []).filter(dept => 
    dept.organizationId === organizationId && 
    dept.id !== department?.id
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 animate-slideUp">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Building className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {department ? 'Edit Department' : 'Create New Department'}
                </h2>
                <p className="text-sm text-gray-500">
                  {department ? 'Update department information and settings' : 'Add a new department to your organization'}
                </p>
              </div>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm" className="hover:bg-gray-100">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Error Display */}
          {(error || departmentsError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error || departmentsError}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name *
                </label>
                <Input
                  {...register('name', { required: 'Department name is required' })}
                  placeholder="Enter department name"
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
                  placeholder="Enter department description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Type *
                  </label>
                  <select
                    {...register('type', { required: 'Department type is required' })}
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
                  {errors.type && (
                    <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Department
                  </label>
                  <select
                    {...register('parentDepartmentId')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No parent department</option>
                    {parentDepartments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager Email
                  </label>
                  <Input
                    {...register('managerEmail', {
                      validate: (value) => {
                        if (!value || value.trim() === '') return true;
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        return emailRegex.test(value) || 'Please enter a valid email address';
                      }
                    })}
                    type="email"
                    placeholder="Enter manager email address"
                  />
                  {errors.managerEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.managerEmail.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget
                  </label>
                  <Input
                    {...register('budget', { 
                      min: { value: 0, message: 'Budget must be positive' }
                    })}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={errors.budget ? 'border-red-300' : ''}
                  />
                  {errors.budget && (
                    <p className="mt-1 text-sm text-red-600">{errors.budget.message}</p>
                  )}
                </div>
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
                    {...register('allowCrossDepartmentFeedback')}
                    type="checkbox"
                    id="allowCrossDepartmentFeedback"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="allowCrossDepartmentFeedback" className="ml-2 block text-sm text-gray-900">
                    Allow cross-department feedback
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    {...register('requireManagerApproval')}
                    type="checkbox"
                    id="requireManagerApproval"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="requireManagerApproval" className="ml-2 block text-sm text-gray-900">
                    Require manager approval for feedback
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback Frequency (days)
                </label>
                <Input
                  {...register('feedbackFrequency', { 
                    required: 'Feedback frequency is required',
                    min: { value: 1, message: 'Must be at least 1 day' }
                  })}
                  type="number"
                  min="1"
                  placeholder="30"
                  className={errors.feedbackFrequency ? 'border-red-300' : ''}
                />
                {errors.feedbackFrequency && (
                  <p className="mt-1 text-sm text-red-600">{errors.feedbackFrequency.message}</p>
                )}
              </div>
            </div>

            {/* Notification Settings */}
            <div className="space-y-4 bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    {...register('emailNotifications')}
                    type="checkbox"
                    id="emailNotifications"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-900">
                    Email notifications
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    {...register('inAppNotifications')}
                    type="checkbox"
                    id="inAppNotifications"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="inAppNotifications" className="ml-2 block text-sm text-gray-900">
                    In-app notifications
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
                className="min-w-[140px] bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {department ? 'Update Department' : 'Create Department'}
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

export default DepartmentForm;
