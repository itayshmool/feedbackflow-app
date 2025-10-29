import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepartmentForm } from '../DepartmentForm';
import { useOrganizationStore } from '../../../../stores/organizationStore';
import { DepartmentType } from '../../../../types/organization.types';

// Mock the organization store
jest.mock('../../../../stores/organizationStore');
const mockUseOrganizationStore = useOrganizationStore as jest.MockedFunction<typeof useOrganizationStore>;

// Mock the UI components
jest.mock('../../ui/Button', () => {
  return function MockButton({ children, onClick, ...props }: any) {
    return (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    );
  };
});

jest.mock('../../ui/Input', () => {
  return function MockInput({ ...props }: any) {
    return <input {...props} />;
  };
});

jest.mock('../../ui/Card', () => {
  return {
    Card: function MockCard({ children, ...props }: any) {
      return <div {...props}>{children}</div>;
    },
    CardContent: function MockCardContent({ children, ...props }: any) {
      return <div {...props}>{children}</div>;
    },
    CardHeader: function MockCardHeader({ children, ...props }: any) {
      return <div {...props}>{children}</div>;
    },
    CardTitle: function MockCardTitle({ children, ...props }: any) {
      return <h2 {...props}>{children}</h2>;
    },
  };
});

jest.mock('../../ui/LoadingSpinner', () => {
  return function MockLoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>;
  };
});

describe('DepartmentForm', () => {
  const organizationId = 'org-123';
  const mockOnClose = jest.fn();
  const mockCreateDepartment = jest.fn();
  const mockUpdateDepartment = jest.fn();

  const mockDepartments = [
    { id: 'dept-1', name: 'Engineering', organizationId, parentDepartmentId: null },
    { id: 'dept-2', name: 'Marketing', organizationId, parentDepartmentId: null },
    { id: 'dept-3', name: 'Frontend', organizationId, parentDepartmentId: 'dept-1' },
  ];

  const mockStore = {
    createDepartment: mockCreateDepartment,
    updateDepartment: mockUpdateDepartment,
    departments: mockDepartments,
    departmentsLoading: false,
    departmentsError: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOrganizationStore.mockReturnValue(mockStore);
  });

  describe('Create Department Mode', () => {
    it('should render create department form', () => {
      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Create New Department')).toBeInTheDocument();
      expect(screen.getByLabelText('Department Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Department Type *')).toBeInTheDocument();
      expect(screen.getByLabelText('Parent Department')).toBeInTheDocument();
      expect(screen.getByLabelText('Manager')).toBeInTheDocument();
      expect(screen.getByLabelText('Budget')).toBeInTheDocument();
    });

    it('should show validation error for required fields', async () => {
      const user = userEvent.setup();
      
      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      const submitButton = screen.getByRole('button', { name: /create department/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Department name is required')).toBeInTheDocument();
      });
    });

    it('should create a department successfully', async () => {
      const user = userEvent.setup();
      mockCreateDepartment.mockResolvedValueOnce({});

      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      // Fill out the form
      await user.type(screen.getByLabelText('Department Name *'), 'Test Department');
      await user.type(screen.getByLabelText('Description'), 'A test department');
      
      // Select department type
      const typeSelect = screen.getByLabelText('Department Type *');
      await user.selectOptions(typeSelect, DepartmentType.ENGINEERING);

      // Select parent department
      const parentSelect = screen.getByLabelText('Parent Department');
      await user.selectOptions(parentSelect, 'dept-1');

      // Enter budget
      await user.type(screen.getByLabelText('Budget'), '100000');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create department/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateDepartment).toHaveBeenCalledWith(organizationId, {
          name: 'Test Department',
          description: 'A test department',
          type: DepartmentType.ENGINEERING,
          parentDepartmentId: 'dept-1',
          managerId: '',
          budget: 100000,
          allowCrossDepartmentFeedback: false,
          requireManagerApproval: true,
          feedbackFrequency: 30,
          emailNotifications: true,
          inAppNotifications: true,
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle create department error', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to create department';
      mockCreateDepartment.mockRejectedValueOnce(new Error(errorMessage));

      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      // Fill out the form
      await user.type(screen.getByLabelText('Department Name *'), 'Test Department');
      await user.selectOptions(screen.getByLabelText('Department Type *'), DepartmentType.ENGINEERING);

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create department/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Edit Department Mode', () => {
    const existingDepartment = {
      id: 'dept-123',
      organizationId,
      name: 'Existing Department',
      description: 'An existing department',
      type: DepartmentType.MARKETING,
      parentDepartmentId: 'dept-1',
      managerId: 'user-123',
      budget: 50000,
      isActive: true,
      settings: {
        allowCrossDepartmentFeedback: true,
        requireManagerApproval: false,
        feedbackFrequency: 60,
        notificationPreferences: {
          email: false,
          inApp: true,
        },
      },
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    };

    it('should render edit department form with existing data', () => {
      render(
        <DepartmentForm
          organizationId={organizationId}
          department={existingDepartment}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Edit Department')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing Department')).toBeInTheDocument();
      expect(screen.getByDisplayValue('An existing department')).toBeInTheDocument();
      expect(screen.getByDisplayValue(DepartmentType.MARKETING)).toBeInTheDocument();
      expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
    });

    it('should update a department successfully', async () => {
      const user = userEvent.setup();
      mockUpdateDepartment.mockResolvedValueOnce({});

      render(
        <DepartmentForm
          organizationId={organizationId}
          department={existingDepartment}
          onClose={mockOnClose}
        />
      );

      // Update the department name
      const nameInput = screen.getByDisplayValue('Existing Department');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Department');

      // Update budget
      const budgetInput = screen.getByDisplayValue('50000');
      await user.clear(budgetInput);
      await user.type(budgetInput, '75000');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /update department/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateDepartment).toHaveBeenCalledWith(organizationId, existingDepartment.id, {
          name: 'Updated Department',
          description: 'An existing department',
          type: DepartmentType.MARKETING,
          parentDepartmentId: 'dept-1',
          managerId: 'user-123',
          budget: 75000,
          allowCrossDepartmentFeedback: true,
          requireManagerApproval: false,
          feedbackFrequency: 60,
          emailNotifications: false,
          inAppNotifications: true,
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle update department error', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to update department';
      mockUpdateDepartment.mockRejectedValueOnce(new Error(errorMessage));

      render(
        <DepartmentForm
          organizationId={organizationId}
          department={existingDepartment}
          onClose={mockOnClose}
        />
      );

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /update department/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should validate department name is required', async () => {
      const user = userEvent.setup();

      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      const submitButton = screen.getByRole('button', { name: /create department/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Department name is required')).toBeInTheDocument();
      });
    });

    it('should validate department type is required', async () => {
      const user = userEvent.setup();

      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      await user.type(screen.getByLabelText('Department Name *'), 'Test Department');
      
      const submitButton = screen.getByRole('button', { name: /create department/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Department type is required')).toBeInTheDocument();
      });
    });

    it('should validate budget is a positive number', async () => {
      const user = userEvent.setup();

      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      await user.type(screen.getByLabelText('Department Name *'), 'Test Department');
      await user.selectOptions(screen.getByLabelText('Department Type *'), DepartmentType.ENGINEERING);
      await user.type(screen.getByLabelText('Budget'), '-1000');

      const submitButton = screen.getByRole('button', { name: /create department/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Budget must be a positive number')).toBeInTheDocument();
      });
    });

    it('should validate feedback frequency is a positive number', async () => {
      const user = userEvent.setup();

      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      await user.type(screen.getByLabelText('Department Name *'), 'Test Department');
      await user.selectOptions(screen.getByLabelText('Department Type *'), DepartmentType.ENGINEERING);
      await user.type(screen.getByLabelText('Feedback Frequency (days)'), '-5');

      const submitButton = screen.getByRole('button', { name: /create department/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Feedback frequency must be a positive number')).toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    it('should close form when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show loading state when submitting', async () => {
      const user = userEvent.setup();
      mockCreateDepartment.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      await user.type(screen.getByLabelText('Department Name *'), 'Test Department');
      await user.selectOptions(screen.getByLabelText('Department Type *'), DepartmentType.ENGINEERING);

      const submitButton = screen.getByRole('button', { name: /create department/i });
      await user.click(submitButton);

      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });

    it('should show store error when present', () => {
      const storeWithError = {
        ...mockStore,
        departmentsError: 'Store error message',
      };
      mockUseOrganizationStore.mockReturnValue(storeWithError);

      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Store error message')).toBeInTheDocument();
    });

    it('should show loading spinner when store is loading', () => {
      const storeWithLoading = {
        ...mockStore,
        departmentsLoading: true,
      };
      mockUseOrganizationStore.mockReturnValue(storeWithLoading);

      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Settings Section', () => {
    it('should render settings section with checkboxes', () => {
      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Department Settings')).toBeInTheDocument();
      expect(screen.getByLabelText('Allow Cross-Department Feedback')).toBeInTheDocument();
      expect(screen.getByLabelText('Require Manager Approval')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Notifications')).toBeInTheDocument();
      expect(screen.getByLabelText('In-App Notifications')).toBeInTheDocument();
    });

    it('should toggle settings checkboxes', async () => {
      const user = userEvent.setup();

      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      const allowCrossDeptCheckbox = screen.getByLabelText('Allow Cross-Department Feedback');
      const requireApprovalCheckbox = screen.getByLabelText('Require Manager Approval');

      expect(allowCrossDeptCheckbox).not.toBeChecked();
      expect(requireApprovalCheckbox).toBeChecked();

      await user.click(allowCrossDeptCheckbox);
      await user.click(requireApprovalCheckbox);

      expect(allowCrossDeptCheckbox).toBeChecked();
      expect(requireApprovalCheckbox).not.toBeChecked();
    });
  });

  describe('Parent Department Selection', () => {
    it('should show parent departments in dropdown', () => {
      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      const parentSelect = screen.getByLabelText('Parent Department');
      expect(parentSelect).toBeInTheDocument();

      // Should show top-level departments (no parent)
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('Marketing')).toBeInTheDocument();
    });

    it('should exclude current department from parent options when editing', () => {
      const existingDepartment = {
        id: 'dept-1',
        organizationId,
        name: 'Engineering',
        type: DepartmentType.ENGINEERING,
        parentDepartmentId: null,
        isActive: true,
      };

      render(
        <DepartmentForm
          organizationId={organizationId}
          department={existingDepartment}
          onClose={mockOnClose}
        />
      );

      const parentSelect = screen.getByLabelText('Parent Department');
      
      // Engineering should not be available as a parent option for itself
      const options = Array.from(parentSelect.querySelectorAll('option'));
      const engineeringOption = options.find(option => option.textContent === 'Engineering');
      expect(engineeringOption).toBeUndefined();
    });
  });

  describe('Budget Field', () => {
    it('should handle empty budget field', async () => {
      const user = userEvent.setup();
      mockCreateDepartment.mockResolvedValueOnce({});

      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      await user.type(screen.getByLabelText('Department Name *'), 'Test Department');
      await user.selectOptions(screen.getByLabelText('Department Type *'), DepartmentType.ENGINEERING);
      // Leave budget field empty

      const submitButton = screen.getByRole('button', { name: /create department/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateDepartment).toHaveBeenCalledWith(organizationId, expect.objectContaining({
          budget: undefined,
        }));
      });
    });

    it('should convert budget string to number', async () => {
      const user = userEvent.setup();
      mockCreateDepartment.mockResolvedValueOnce({});

      render(
        <DepartmentForm
          organizationId={organizationId}
          department={null}
          onClose={mockOnClose}
        />
      );

      await user.type(screen.getByLabelText('Department Name *'), 'Test Department');
      await user.selectOptions(screen.getByLabelText('Department Type *'), DepartmentType.ENGINEERING);
      await user.type(screen.getByLabelText('Budget'), '150000');

      const submitButton = screen.getByRole('button', { name: /create department/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateDepartment).toHaveBeenCalledWith(organizationId, expect.objectContaining({
          budget: 150000,
        }));
      });
    });
  });
});

