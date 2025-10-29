import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamForm } from '../TeamForm';
import { useOrganizationStore } from '../../../../stores/organizationStore';
import { TeamType } from '../../../../types/organization.types';

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

describe('TeamForm', () => {
  const organizationId = 'org-123';
  const mockOnClose = jest.fn();
  const mockCreateTeam = jest.fn();
  const mockUpdateTeam = jest.fn();

  const mockDepartments = [
    { id: 'dept-1', name: 'Engineering', organizationId },
    { id: 'dept-2', name: 'Marketing', organizationId },
  ];

  const mockStore = {
    createTeam: mockCreateTeam,
    updateTeam: mockUpdateTeam,
    departments: mockDepartments,
    teamsLoading: false,
    teamsError: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOrganizationStore.mockReturnValue(mockStore);
  });

  describe('Create Team Mode', () => {
    it('should render create team form', () => {
      render(
        <TeamForm
          organizationId={organizationId}
          team={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Create New Team')).toBeInTheDocument();
      expect(screen.getByLabelText('Team Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Team Type *')).toBeInTheDocument();
      expect(screen.getByLabelText('Department')).toBeInTheDocument();
      expect(screen.getByLabelText('Team Lead')).toBeInTheDocument();
    });

    it('should show validation error for required fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TeamForm
          organizationId={organizationId}
          team={null}
          onClose={mockOnClose}
        />
      );

      const submitButton = screen.getByRole('button', { name: /create team/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Team name is required')).toBeInTheDocument();
      });
    });

    it('should create a team successfully', async () => {
      const user = userEvent.setup();
      mockCreateTeam.mockResolvedValueOnce({});

      render(
        <TeamForm
          organizationId={organizationId}
          team={null}
          onClose={mockOnClose}
        />
      );

      // Fill out the form
      await user.type(screen.getByLabelText('Team Name *'), 'Test Team');
      await user.type(screen.getByLabelText('Description'), 'A test team');
      
      // Select team type
      const typeSelect = screen.getByLabelText('Team Type *');
      await user.selectOptions(typeSelect, TeamType.CORE);

      // Select department
      const departmentSelect = screen.getByLabelText('Department');
      await user.selectOptions(departmentSelect, 'dept-1');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create team/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateTeam).toHaveBeenCalledWith(organizationId, {
          name: 'Test Team',
          description: 'A test team',
          type: TeamType.CORE,
          departmentId: 'dept-1',
          teamLeadId: '',
          allowPeerFeedback: true,
          requireTeamLeadApproval: false,
          feedbackFrequency: 30,
          emailNotifications: true,
          inAppNotifications: true,
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle create team error', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to create team';
      mockCreateTeam.mockRejectedValueOnce(new Error(errorMessage));

      render(
        <TeamForm
          organizationId={organizationId}
          team={null}
          onClose={mockOnClose}
        />
      );

      // Fill out the form
      await user.type(screen.getByLabelText('Team Name *'), 'Test Team');
      await user.selectOptions(screen.getByLabelText('Team Type *'), TeamType.CORE);

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create team/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Edit Team Mode', () => {
    const existingTeam = {
      id: 'team-123',
      organizationId,
      name: 'Existing Team',
      description: 'An existing team',
      type: TeamType.SUPPORT,
      departmentId: 'dept-1',
      teamLeadId: 'user-123',
      isActive: true,
      settings: {
        allowPeerFeedback: false,
        requireTeamLeadApproval: true,
        feedbackFrequency: 60,
        notificationPreferences: {
          email: false,
          inApp: true,
        },
      },
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    };

    it('should render edit team form with existing data', () => {
      render(
        <TeamForm
          organizationId={organizationId}
          team={existingTeam}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Edit Team')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing Team')).toBeInTheDocument();
      expect(screen.getByDisplayValue('An existing team')).toBeInTheDocument();
      expect(screen.getByDisplayValue(TeamType.SUPPORT)).toBeInTheDocument();
    });

    it('should update a team successfully', async () => {
      const user = userEvent.setup();
      mockUpdateTeam.mockResolvedValueOnce({});

      render(
        <TeamForm
          organizationId={organizationId}
          team={existingTeam}
          onClose={mockOnClose}
        />
      );

      // Update the team name
      const nameInput = screen.getByDisplayValue('Existing Team');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Team');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /update team/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateTeam).toHaveBeenCalledWith(organizationId, existingTeam.id, {
          name: 'Updated Team',
          description: 'An existing team',
          type: TeamType.SUPPORT,
          departmentId: 'dept-1',
          teamLeadId: 'user-123',
          allowPeerFeedback: false,
          requireTeamLeadApproval: true,
          feedbackFrequency: 60,
          emailNotifications: false,
          inAppNotifications: true,
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle update team error', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to update team';
      mockUpdateTeam.mockRejectedValueOnce(new Error(errorMessage));

      render(
        <TeamForm
          organizationId={organizationId}
          team={existingTeam}
          onClose={mockOnClose}
        />
      );

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /update team/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should validate team name is required', async () => {
      const user = userEvent.setup();

      render(
        <TeamForm
          organizationId={organizationId}
          team={null}
          onClose={mockOnClose}
        />
      );

      const submitButton = screen.getByRole('button', { name: /create team/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Team name is required')).toBeInTheDocument();
      });
    });

    it('should validate team type is required', async () => {
      const user = userEvent.setup();

      render(
        <TeamForm
          organizationId={organizationId}
          team={null}
          onClose={mockOnClose}
        />
      );

      await user.type(screen.getByLabelText('Team Name *'), 'Test Team');
      
      const submitButton = screen.getByRole('button', { name: /create team/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Team type is required')).toBeInTheDocument();
      });
    });

    it('should validate feedback frequency is a positive number', async () => {
      const user = userEvent.setup();

      render(
        <TeamForm
          organizationId={organizationId}
          team={null}
          onClose={mockOnClose}
        />
      );

      await user.type(screen.getByLabelText('Team Name *'), 'Test Team');
      await user.selectOptions(screen.getByLabelText('Team Type *'), TeamType.CORE);
      await user.type(screen.getByLabelText('Feedback Frequency (days)'), '-5');

      const submitButton = screen.getByRole('button', { name: /create team/i });
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
        <TeamForm
          organizationId={organizationId}
          team={null}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show loading state when submitting', async () => {
      const user = userEvent.setup();
      mockCreateTeam.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <TeamForm
          organizationId={organizationId}
          team={null}
          onClose={mockOnClose}
        />
      );

      await user.type(screen.getByLabelText('Team Name *'), 'Test Team');
      await user.selectOptions(screen.getByLabelText('Team Type *'), TeamType.CORE);

      const submitButton = screen.getByRole('button', { name: /create team/i });
      await user.click(submitButton);

      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });

    it('should show store error when present', () => {
      const storeWithError = {
        ...mockStore,
        teamsError: 'Store error message',
      };
      mockUseOrganizationStore.mockReturnValue(storeWithError);

      render(
        <TeamForm
          organizationId={organizationId}
          team={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Store error message')).toBeInTheDocument();
    });

    it('should show loading spinner when store is loading', () => {
      const storeWithLoading = {
        ...mockStore,
        teamsLoading: true,
      };
      mockUseOrganizationStore.mockReturnValue(storeWithLoading);

      render(
        <TeamForm
          organizationId={organizationId}
          team={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Settings Section', () => {
    it('should render settings section with checkboxes', () => {
      render(
        <TeamForm
          organizationId={organizationId}
          team={null}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Team Settings')).toBeInTheDocument();
      expect(screen.getByLabelText('Allow Peer Feedback')).toBeInTheDocument();
      expect(screen.getByLabelText('Require Team Lead Approval')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Notifications')).toBeInTheDocument();
      expect(screen.getByLabelText('In-App Notifications')).toBeInTheDocument();
    });

    it('should toggle settings checkboxes', async () => {
      const user = userEvent.setup();

      render(
        <TeamForm
          organizationId={organizationId}
          team={null}
          onClose={mockOnClose}
        />
      );

      const allowPeerFeedbackCheckbox = screen.getByLabelText('Allow Peer Feedback');
      const requireApprovalCheckbox = screen.getByLabelText('Require Team Lead Approval');

      expect(allowPeerFeedbackCheckbox).toBeChecked();
      expect(requireApprovalCheckbox).not.toBeChecked();

      await user.click(allowPeerFeedbackCheckbox);
      await user.click(requireApprovalCheckbox);

      expect(allowPeerFeedbackCheckbox).not.toBeChecked();
      expect(requireApprovalCheckbox).toBeChecked();
    });
  });
});
