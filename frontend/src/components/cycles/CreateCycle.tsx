// frontend/src/components/cycles/CreateCycle.tsx

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Calendar, Users, Settings, X, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { useCyclesStore } from '../../stores/cyclesStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useAuthStore } from '../../stores/authStore';
import { CycleFormData, CycleType, Cycle } from '../../types/cycles.types';
import { OrganizationStatus } from '../../types/organization.types';

interface CreateCycleProps {
  onClose: () => void;
  onSuccess?: () => void;
  editingCycle?: Cycle | null;
}

export const CreateCycle: React.FC<CreateCycleProps> = ({ onClose, onSuccess, editingCycle }) => {
  const { createCycle, updateCycle, isCreating, isUpdating, createError, updateError, clearCreateError, clearUpdateError } = useCyclesStore();
  const { organizations, fetchOrganizations, organizationsLoading } = useOrganizationStore();
  const { user } = useAuthStore();
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
    reset,
  } = useForm<CycleFormData>({
    defaultValues: {
      name: '',
      description: '',
      organizationId: '',
      startDate: '',
      endDate: '',
      type: CycleType.QUARTERLY,
      settings: {
        allowSelfReview: true,
        allowPeerReview: true,
        allowManagerReview: true,
        allowUpwardReview: true,
        requireAcknowledgment: true,
        autoCloseAfterDays: 30,
        reminderSettings: {
          enabled: true,
          daysBeforeDeadline: [7, 3, 1],
        },
        feedbackSettings: {
          minRatingsRequired: 1,
          maxRatingsAllowed: 5,
          allowAnonymous: false,
          requireComments: true,
          categories: ['Communication', 'Teamwork', 'Leadership', 'Problem Solving'],
        },
      },
    },
  });

  useEffect(() => {
    // Fetch organizations when component mounts
    if (organizations.length === 0) {
      // Admin: fetch all active organizations
      // Manager: fetch organizations (will be filtered below)
      if (user?.roles?.includes('admin')) {
        fetchOrganizations({ status: OrganizationStatus.ACTIVE, limit: 100 });
      } else {
        fetchOrganizations({ limit: 100 });
      }
    }
  }, [organizations.length, fetchOrganizations, user]);

  // Filter organizations based on user role
  const availableOrganizations = React.useMemo(() => {
    if (!user) return [];
    
    // Admin can see all active organizations
    if (user.roles?.includes('admin')) {
      return organizations.filter(org => org.status === OrganizationStatus.ACTIVE);
    }
    
    // Manager can only see their own organization
    return organizations.filter(org => org.id === user.organizationId);
  }, [organizations, user]);

  // Populate form when editing a cycle
  useEffect(() => {
    if (editingCycle) {
      // Convert ISO dates to YYYY-MM-DD format for HTML date inputs
      const formatDateForInput = (isoDate: string) => {
        if (!isoDate) return '';
        const date = new Date(isoDate);
        return date.toISOString().split('T')[0];
      };

      reset({
        name: editingCycle.name,
        description: editingCycle.description || '',
        organizationId: editingCycle.organizationId,
        startDate: formatDateForInput(editingCycle.startDate),
        endDate: formatDateForInput(editingCycle.endDate),
        type: editingCycle.type,
        settings: editingCycle.settings,
      });
    } else if (user && !user.roles?.includes('admin') && user.organizationId) {
      // Auto-select organization for non-admin users (managers)
      setValue('organizationId', user.organizationId);
    }
  }, [editingCycle, reset, user, setValue]);

  const watchedCategories = watch('settings.feedbackSettings.categories');
  const [newCategory, setNewCategory] = useState('');

  const onSubmit = async (data: CycleFormData) => {
    clearCreateError();
    clearUpdateError();
    
    try {
      let result;
      
      if (editingCycle) {
        // Update existing cycle
        const { organizationId, ...updateData } = data;
        result = await updateCycle(editingCycle.id, {
          name: updateData.name,
          description: updateData.description,
          startDate: updateData.startDate,
          endDate: updateData.endDate,
          // type cannot be changed
          settings: updateData.settings,
        });
      } else {
        // Create new cycle
        result = await createCycle({
          name: data.name,
          description: data.description,
          organizationId: data.organizationId,
          startDate: data.startDate,
          endDate: data.endDate,
          type: data.type,
          settings: data.settings,
        });
      }

      if (result) {
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error(`Error ${editingCycle ? 'updating' : 'creating'} cycle:`, error);
    }
  };

  const addCategory = () => {
    if (newCategory.trim() && !watchedCategories.includes(newCategory.trim())) {
      const currentCategories = getValues('settings.feedbackSettings.categories');
      setValue('settings.feedbackSettings.categories', [...currentCategories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const removeCategory = (index: number) => {
    const currentCategories = getValues('settings.feedbackSettings.categories');
    setValue('settings.feedbackSettings.categories', currentCategories.filter((_, i) => i !== index));
  };

  const addReminderDay = () => {
    const currentDays = getValues('settings.reminderSettings.daysBeforeDeadline');
    const maxDay = Math.max(...currentDays, 0);
    setValue('settings.reminderSettings.daysBeforeDeadline', [...currentDays, maxDay + 1]);
  };

  const removeReminderDay = (index: number) => {
    const currentDays = getValues('settings.reminderSettings.daysBeforeDeadline');
    setValue('settings.reminderSettings.daysBeforeDeadline', currentDays.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingCycle ? 'Edit Cycle' : 'Create New Cycle'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {(createError || updateError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{createError || updateError}</p>
            </div>
          )}

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Basic Information
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  label="Cycle Name"
                  {...register('name', { required: 'Cycle name is required' })}
                  error={errors.name?.message}
                  placeholder="e.g., Q1 2024 Performance Review"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  placeholder="Brief description of this cycle"
                  rows={3}
                  {...register('description')}
                />
              </div>

              <div>
                <Select
                  label="Organization"
                  {...register('organizationId', { required: 'Organization is required' })}
                  error={errors.organizationId?.message}
                  disabled={organizationsLoading}
                >
                  <option value="">Select an organization</option>
                  {availableOrganizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} (@{org.slug})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Select
                    label="Cycle Type"
                    {...register('type', { required: 'Cycle type is required' })}
                    error={errors.type?.message}
                  >
                    <option value={CycleType.ANNUAL}>Annual</option>
                    <option value={CycleType.QUARTERLY}>Quarterly</option>
                    <option value={CycleType.MONTHLY}>Monthly</option>
                    <option value={CycleType.PROJECT_BASED}>Project Based</option>
                    <option value={CycleType.CUSTOM}>Custom</option>
                  </Select>
                </div>

                <div>
                  <Input
                    label="Start Date"
                    type="date"
                    {...register('startDate', { required: 'Start date is required' })}
                    error={errors.startDate?.message}
                  />
                </div>

                <div>
                  <Input
                    label="End Date"
                    type="date"
                    {...register('endDate', { required: 'End date is required' })}
                    error={errors.endDate?.message}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Review Settings */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Review Settings
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...register('settings.requireAcknowledgment')}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Require Acknowledgment</span>
              </label>

              <div>
                <Input
                  label="Auto-close after (days)"
                  type="number"
                  {...register('settings.autoCloseAfterDays', { valueAsNumber: true })}
                  placeholder="30"
                />
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Advanced Settings
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                >
                  {showAdvancedSettings ? 'Hide' : 'Show'} Advanced
                </Button>
              </div>
            </CardHeader>
            
            {showAdvancedSettings && (
              <CardContent className="space-y-6">
                {/* Reminder Settings */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Reminder Settings</h4>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...register('settings.reminderSettings.enabled')}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Enable reminders</span>
                    </label>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Remind participants (days before deadline)
                      </label>
                      <div className="space-y-2">
                        {watchedCategories.map((day, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Input
                              type="number"
                              {...register(`settings.reminderSettings.daysBeforeDeadline.${index}`, { valueAsNumber: true })}
                              className="w-20"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeReminderDay(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addReminderDay}
                          leftIcon={<Plus className="h-4 w-4" />}
                        >
                          Add Day
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feedback Settings */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Feedback Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Min Ratings Required"
                      type="number"
                      {...register('settings.feedbackSettings.minRatingsRequired', { valueAsNumber: true })}
                    />
                    <Input
                      label="Max Ratings Allowed"
                      type="number"
                      {...register('settings.feedbackSettings.maxRatingsAllowed', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...register('settings.feedbackSettings.allowAnonymous')}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Allow Anonymous</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...register('settings.feedbackSettings.requireComments')}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Require Comments</span>
                    </label>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Feedback Categories
                    </label>
                    <div className="space-y-2">
                      {watchedCategories.map((category, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            {...register(`settings.feedbackSettings.categories.${index}`)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCategory(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex items-center space-x-2">
                        <Input
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="Add new category"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addCategory}
                          leftIcon={<Plus className="h-4 w-4" />}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || isUpdating}>
              {isCreating ? 'Creating...' : isUpdating ? 'Saving...' : editingCycle ? 'Save Changes' : 'Create Cycle'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
