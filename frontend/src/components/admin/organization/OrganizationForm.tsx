import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useOrganizationStore } from '../../../stores/organizationStore';
import { Organization, CreateOrganizationRequest, UpdateOrganizationRequest, SubscriptionPlan, OrganizationStatus } from '../../../types/organization.types';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { X, Save, AlertCircle } from 'lucide-react';

interface OrganizationFormProps {
  organization?: Organization | null;
  onClose: () => void;
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  contactEmail: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  website: string;
  logoUrl: string;
  subscriptionPlan: SubscriptionPlan;
  maxUsers: number;
  maxCycles: number;
  storageLimitGb: number;
  isActive: boolean;
  status: OrganizationStatus;
}

const OrganizationForm: React.FC<OrganizationFormProps> = ({ organization, onClose }) => {
  const {
    createOrganization,
    updateOrganization,
    checkSlugAvailability,
    organizationsLoading,
    organizationsError,
  } = useOrganizationStore();

  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset,
  } = useForm<FormData>({
    defaultValues: {
      name: organization?.name || '',
      slug: organization?.slug || '',
      description: organization?.description || '',
      contactEmail: organization?.contactEmail || '',
      phone: organization?.phone || '',
      address: organization?.address || '',
      city: organization?.city || '',
      state: organization?.state || '',
      zipCode: organization?.zipCode || '',
      country: organization?.country || '',
      website: organization?.website || '',
      logoUrl: organization?.logoUrl || '',
      subscriptionPlan: organization?.subscriptionPlan || SubscriptionPlan.BASIC,
      maxUsers: organization?.maxUsers || 10,
      maxCycles: organization?.maxCycles || 5,
      storageLimitGb: organization?.storageLimitGb || 1,
      isActive: organization?.isActive ?? true,
      status: organization?.status || OrganizationStatus.ACTIVE,
    },
  });

  const watchedName = watch('name');
  const watchedSlug = watch('slug');

  // Auto-generate slug from name
  useEffect(() => {
    if (watchedName && !organization) {
      const generatedSlug = watchedName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setValue('slug', generatedSlug);
    }
  }, [watchedName, organization, setValue]);

  // Check slug availability
  useEffect(() => {
    const checkSlug = async () => {
      if (watchedSlug && watchedSlug.length > 2) {
        setCheckingSlug(true);
        try {
          const available = await checkSlugAvailability(watchedSlug, organization?.id);
          setSlugAvailable(available);
        } catch (error) {
          console.error('Failed to check slug availability:', error);
          setSlugAvailable(null);
        } finally {
          setCheckingSlug(false);
        }
      } else {
        setSlugAvailable(null);
      }
    };

    const timeoutId = setTimeout(checkSlug, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedSlug, organization?.id, checkSlugAvailability]);

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);

      if (organization) {
        // Update existing organization
        const updateData: UpdateOrganizationRequest = {
          name: data.name,
          // slug is immutable
          description: data.description || undefined,
          contactEmail: data.contactEmail,
          phone: data.phone || undefined,
          address: data.address || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          zipCode: data.zipCode || undefined,
          country: data.country || undefined,
          website: data.website || undefined,
          logoUrl: data.logoUrl || undefined,
          subscriptionPlan: data.subscriptionPlan,
          maxUsers: data.maxUsers,
          maxCycles: data.maxCycles,
          storageLimitGb: data.storageLimitGb,
          isActive: data.isActive,
          status: data.status,
        };
        await updateOrganization(organization.id, updateData);
      } else {
        // Create new organization
        const createData: CreateOrganizationRequest = {
          name: data.name,
          slug: data.slug,
          description: data.description || undefined,
          contactEmail: data.contactEmail,
          phone: data.phone || undefined,
          address: data.address || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          zipCode: data.zipCode || undefined,
          country: data.country || undefined,
          website: data.website || undefined,
          logoUrl: data.logoUrl || undefined,
          subscriptionPlan: data.subscriptionPlan,
          maxUsers: data.maxUsers,
          maxCycles: data.maxCycles,
          storageLimitGb: data.storageLimitGb,
        };
        await createOrganization(createData);
      }

      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save organization');
    }
  };

  const isSlugValid = slugAvailable === true;
  const isSlugInvalid = slugAvailable === false;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" data-testid="organization-form-modal">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {organization ? 'Edit Organization' : 'Create New Organization'}
            </h2>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>

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

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Name *
                  </label>
                  <Input
                    {...register('name', { required: 'Organization name is required' })}
                    placeholder="Enter organization name"
                    className={errors.name ? 'border-red-300' : ''}
                    data-testid="organization-name-input"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug *
                  </label>
                  <div className="relative">
                    <Input
                      {...register('slug', { 
                        required: 'Slug is required',
                        pattern: {
                          value: /^[a-z0-9-]+$/,
                          message: 'Slug can only contain lowercase letters, numbers, and hyphens'
                        }
                      })}
                      placeholder="organization-slug"
                      className={`${errors.slug ? 'border-red-300' : ''} ${isSlugInvalid ? 'border-red-300' : ''} ${isSlugValid ? 'border-green-300' : ''}`}
                      data-testid="organization-slug-input"
                    />
                    {checkingSlug && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <LoadingSpinner size="sm" />
                      </div>
                    )}
                  </div>
                  {errors.slug && (
                    <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
                  )}
                  {isSlugInvalid && (
                    <p className="mt-1 text-sm text-red-600">This slug is already taken</p>
                  )}
                  {isSlugValid && (
                    <p className="mt-1 text-sm text-green-600">This slug is available</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
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
                  {...register('contactEmail', { 
                    required: 'Contact email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  type="email"
                  placeholder="contact@organization.com"
                  className={errors.contactEmail ? 'border-red-300' : ''}
                  data-testid="organization-contact-email-input"
                />
                {errors.contactEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.contactEmail.message}</p>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <Input
                    {...register('phone')}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <Input
                    {...register('website')}
                    placeholder="https://www.organization.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <Input
                  {...register('address')}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <Input
                    {...register('city')}
                    placeholder="New York"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <Input
                    {...register('state')}
                    placeholder="NY"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <Input
                    {...register('zipCode')}
                    placeholder="10001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <Input
                  {...register('country')}
                  placeholder="United States"
                />
              </div>
            </div>

            {/* Subscription & Limits */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Subscription & Limits</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subscription Plan *
                  </label>
                  <select
                    {...register('subscriptionPlan', { required: 'Subscription plan is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={SubscriptionPlan.FREE}>Free</option>
                    <option value={SubscriptionPlan.BASIC}>Basic</option>
                    <option value={SubscriptionPlan.PROFESSIONAL}>Professional</option>
                    <option value={SubscriptionPlan.ENTERPRISE}>Enterprise</option>
                  </select>
                  {errors.subscriptionPlan && (
                    <p className="mt-1 text-sm text-red-600">{errors.subscriptionPlan.message}</p>
                  )}
                </div>

                {organization && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      {...register('status')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={OrganizationStatus.ACTIVE}>Active</option>
                      <option value={OrganizationStatus.INACTIVE}>Inactive</option>
                      <option value={OrganizationStatus.SUSPENDED}>Suspended</option>
                      <option value={OrganizationStatus.PENDING}>Pending</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Users *
                  </label>
                  <Input
                    {...register('maxUsers', { 
                      required: 'Max users is required',
                      min: { value: 1, message: 'Must be at least 1' }
                    })}
                    type="number"
                    min="1"
                    className={errors.maxUsers ? 'border-red-300' : ''}
                  />
                  {errors.maxUsers && (
                    <p className="mt-1 text-sm text-red-600">{errors.maxUsers.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Cycles *
                  </label>
                  <Input
                    {...register('maxCycles', { 
                      required: 'Max cycles is required',
                      min: { value: 1, message: 'Must be at least 1' }
                    })}
                    type="number"
                    min="1"
                    className={errors.maxCycles ? 'border-red-300' : ''}
                  />
                  {errors.maxCycles && (
                    <p className="mt-1 text-sm text-red-600">{errors.maxCycles.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Storage Limit (GB) *
                  </label>
                  <Input
                    {...register('storageLimitGb', { 
                      required: 'Storage limit is required',
                      min: { value: 1, message: 'Must be at least 1 GB' }
                    })}
                    type="number"
                    min="1"
                    className={errors.storageLimitGb ? 'border-red-300' : ''}
                  />
                  {errors.storageLimitGb && (
                    <p className="mt-1 text-sm text-red-600">{errors.storageLimitGb.message}</p>
                  )}
                </div>
              </div>

              {organization && (
                <div className="flex items-center">
                  <input
                    {...register('isActive')}
                    type="checkbox"
                    id="isActive"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Organization is active
                  </label>
                </div>
              )}
            </div>

            {/* Logo URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo URL
              </label>
              <Input
                {...register('logoUrl')}
                placeholder="https://example.com/logo.png"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isSlugInvalid || checkingSlug}
                data-testid="organization-submit-button"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {organization ? 'Update Organization' : 'Create Organization'}
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

export default OrganizationForm;
