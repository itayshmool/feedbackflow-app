import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUserStore } from '@/stores/userStore';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { User, UserCreateData, UserUpdateData } from '@/types/user.types';
import { X, Save, User as UserIcon } from 'lucide-react';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  organizationId: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  roles: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  emailVerified: z.boolean().default(false),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  user?: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({ user, onClose, onSuccess }) => {
  const {
    roles,
    isCreating,
    isUpdating,
    createError,
    updateError,
    createUser,
    updateUser,
    fetchRoles,
  } = useUserStore();

  const {
    organizations,
    fetchOrganizations,
  } = useOrganizationStore();

  const { user: currentUser } = useAuthStore();
  const canAssignSuperAdmin = currentUser?.roles?.includes('super_admin');

  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      organizationId: user?.organizationId || '',
      department: user?.department || '',
      position: user?.position || '',
      roles: user?.roles?.map(r => r.roleName) || [],
      isActive: user?.isActive ?? true,
      emailVerified: user?.emailVerified ?? false,
    },
  });

  const watchedEmail = watch('email');
  const watchedRoles = watch('roles');

  useEffect(() => {
    fetchRoles();
    fetchOrganizations({});
  }, [fetchRoles, fetchOrganizations]);

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        organizationId: user.organizationId || '',
        department: user.department || '',
        position: user.position || '',
        roles: user.roles?.map(r => r.roleName) || [],
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      });
    }
  }, [user, reset]);

  // Check email availability when email changes (for new users)
  useEffect(() => {
    if (!user && watchedEmail && watchedEmail.includes('@')) {
      const checkEmail = async () => {
        setCheckingEmail(true);
        try {
          // This would be implemented in the user service
          // const available = await userService.checkEmailAvailability(watchedEmail);
          // setEmailAvailable(available);
          setEmailAvailable(true); // Mock for now
        } catch (error) {
          setEmailAvailable(false);
        } finally {
          setCheckingEmail(false);
        }
      };

      const debounceTimer = setTimeout(checkEmail, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [watchedEmail, user]);

  const onSubmit = async (data: UserFormData) => {
    console.log('Form submitted with data:', data);
    try {
      if (user) {
        // Update existing user
        const updateData: UserUpdateData = {
          name: data.name,
          email: data.email,
          organizationId: data.organizationId || undefined,
          department: data.department || undefined,
          position: data.position || undefined,
          roles: data.roles,
          isActive: data.isActive,
          emailVerified: data.emailVerified,
        };
        
        console.log('Updating user with data:', updateData);
        const updatedUser = await updateUser(user.id, updateData);
        console.log('Update result:', updatedUser);
        if (updatedUser) {
          console.log('Calling onSuccess');
          onSuccess();
        } else {
          console.log('Update failed - not calling onSuccess');
        }
      } else {
        // Create new user
        const createData: UserCreateData = {
          name: data.name,
          email: data.email,
          organizationId: data.organizationId || undefined,
          department: data.department || undefined,
          position: data.position || undefined,
          roles: data.roles,
        };
        
        console.log('Creating user with data:', createData);
        const newUser = await createUser(createData);
        console.log('Create result:', newUser);
        if (newUser) {
          console.log('Calling onSuccess');
          onSuccess();
        } else {
          console.log('Create failed - not calling onSuccess');
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleRoleToggle = (roleName: string) => {
    const currentRoles = watchedRoles || [];
    const newRoles = currentRoles.includes(roleName)
      ? currentRoles.filter(role => role !== roleName)
      : [...currentRoles, roleName];
    setValue('roles', newRoles);
  };

  const isLoading = isCreating || isUpdating || isSubmitting;
  const error = createError || updateError;

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <UserIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {user ? 'Edit User' : 'Create New User'}
            </h2>
            <p className="text-sm text-gray-600">
              {user ? 'Update user information and permissions' : 'Add a new user to the system'}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter full name"
                className={errors.name ? 'border-red-300' : ''}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="Enter email address"
                  className={errors.email ? 'border-red-300' : ''}
                />
                {checkingEmail && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
                {emailAvailable === false && !checkingEmail && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
                    Email already exists
                  </div>
                )}
                {emailAvailable === true && !checkingEmail && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                    Available
                  </div>
                )}
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="organizationId">Organization</Label>
            <Select
              id="organizationId"
              {...register('organizationId')}
              className={errors.organizationId ? 'border-red-300' : ''}
            >
              <option value="">Select an organization (optional)</option>
              {(organizations || []).map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.slug})
                </option>
              ))}
            </Select>
            {errors.organizationId && (
              <p className="mt-1 text-sm text-red-600">{errors.organizationId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                {...register('department')}
                placeholder="Enter department"
              />
            </div>

            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                {...register('position')}
                placeholder="Enter position"
              />
            </div>
          </div>
        </div>

        {/* Roles */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Roles & Permissions</h3>
          
          <div className="space-y-3">
            <Label>Assign Roles</Label>
            <div className="grid grid-cols-2 gap-3">
              {roles.map((role) => {
                const isDisabled = role.name === 'super_admin' && !canAssignSuperAdmin;
                return (
                  <div key={role.id} className="flex items-center space-x-3">
                    <Switch
                      id={`role-${role.id}`}
                      checked={watchedRoles?.includes(role.name) || false}
                      onCheckedChange={() => handleRoleToggle(role.name)}
                      disabled={isDisabled}
                    />
                    <Label 
                      htmlFor={`role-${role.id}`} 
                      className={`text-sm ${isDisabled ? 'text-gray-400' : ''}`}
                      title={isDisabled ? 'Only Super Admins can assign this role' : ''}
                    >
                      {role.name}
                      {isDisabled && (
                        <span className="ml-1 text-xs text-gray-400">(requires super_admin)</span>
                      )}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Status</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isActive">Active User</Label>
                <p className="text-sm text-gray-600">User can log in and access the system</p>
              </div>
              <Switch
                id="isActive"
                checked={watch('isActive')}
                onCheckedChange={(checked) => setValue('isActive', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailVerified">Email Verified</Label>
                <p className="text-sm text-gray-600">User's email address has been verified</p>
              </div>
              <Switch
                id="emailVerified"
                checked={watch('emailVerified')}
                onCheckedChange={(checked) => setValue('emailVerified', checked)}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
            <Save className="h-4 w-4 mr-2" />
            {user ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </form>
    </div>
  );
};

