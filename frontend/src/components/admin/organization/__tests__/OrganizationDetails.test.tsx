import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrganizationDetails } from '../OrganizationDetails';
import { useOrganizationStore } from '../../../../stores/organizationStore';
import { OrganizationStatus, SubscriptionPlan } from '../../../../types/organization.types';

// Mock the organization store
jest.mock('../../../../stores/organizationStore');
const mockUseOrganizationStore = useOrganizationStore as jest.MockedFunction<typeof useOrganizationStore>;

// Mock the form components
jest.mock('../TeamForm', () => {
  return function MockTeamForm({ onClose, organizationId, team }: any) {
    return (
      <div data-testid="team-form">
        <h2>{team ? 'Edit Team' : 'Create New Team'}</h2>
        <button onClick={onClose}>Close Team Form</button>
      </div>
    );
  };
});

jest.mock('../DepartmentForm', () => {
  return function MockDepartmentForm({ onClose, organizationId, department }: any) {
    return (
      <div data-testid="department-form">
        <h2>{department ? 'Edit Department' : 'Create New Department'}</h2>
        <button onClick={onClose}>Close Department Form</button>
      </div>
    );
  };
});

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

jest.mock('../../ui/Badge', () => {
  return function MockBadge({ children, variant, ...props }: any) {
    return <span data-variant={variant} {...props}>{children}</span>;
  };
});

jest.mock('../../ui/LoadingSpinner', () => {
  return function MockLoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>;
  };
});

describe('OrganizationDetails', () => {
  const mockOnClose = jest.fn();
  const mockOnEdit = jest.fn();
  const mockFetchDepartments = jest.fn();
  const mockFetchTeams = jest.fn();

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    description: 'A test organization',
    contactEmail: 'test@example.com',
    phone: '+1234567890',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    country: 'Test Country',
    website: 'https://test.com',
    logoUrl: 'https://example.com/logo.png',
    isActive: true,
    status: OrganizationStatus.ACTIVE,
    subscriptionPlan: SubscriptionPlan.BASIC,
    planStartDate: '2023-01-01T00:00:00Z',
    planEndDate: '2024-01-01T00:00:00Z',
    maxUsers: 100,
    maxCycles: 10,
    storageLimitGb: 50,
    featureFlags: {},
    settings: {
      timezone: 'UTC',
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      currency: 'USD',
      workingDays: [1, 2, 3, 4, 5],
      workingHours: { start: '09:00', end: '17:00' },
      feedbackSettings: {
        allowAnonymous: false,
        requireManagerApproval: true,
        autoReminders: true,
        reminderFrequency: 7,
      },
      notificationPreferences: {
        email: true,
        inApp: true,
        slack: false,
      },
      integrationSettings: {},
    },
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  const mockDepartments = [
    {
      id: 'dept-1',
      organizationId: 'org-123',
      name: 'Engineering',
      description: 'Engineering department',
      type: 'engineering',
      parentDepartmentId: null,
      managerId: 'user-1',
      budget: 100000,
      isActive: true,
      settings: {},
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
    {
      id: 'dept-2',
      organizationId: 'org-123',
      name: 'Marketing',
      description: 'Marketing department',
      type: 'marketing',
      parentDepartmentId: null,
      managerId: 'user-2',
      budget: 50000,
      isActive: true,
      settings: {},
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
  ];

  const mockTeams = [
    {
      id: 'team-1',
      organizationId: 'org-123',
      departmentId: 'dept-1',
      name: 'Frontend Team',
      description: 'Frontend development team',
      type: 'core',
      teamLeadId: 'user-3',
      isActive: true,
      settings: {},
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
    {
      id: 'team-2',
      organizationId: 'org-123',
      departmentId: 'dept-1',
      name: 'Backend Team',
      description: 'Backend development team',
      type: 'core',
      teamLeadId: 'user-4',
      isActive: true,
      settings: {},
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
  ];

  const mockStore = {
    departments: mockDepartments,
    teams: mockTeams,
    departmentsLoading: false,
    teamsLoading: false,
    departmentsError: null,
    teamsError: null,
    fetchDepartments: mockFetchDepartments,
    fetchTeams: mockFetchTeams,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOrganizationStore.mockReturnValue(mockStore);
  });

  describe('Component Rendering', () => {
    it('should render organization details', () => {
      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('Test Organization')).toBeInTheDocument();
      expect(screen.getByText('@test-org')).toBeInTheDocument();
      expect(screen.getByText('A test organization')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should render tabs for different sections', () => {
      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Departments')).toBeInTheDocument();
      expect(screen.getByText('Teams')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should show overview tab by default', () => {
      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('Organization Information')).toBeInTheDocument();
      expect(screen.getByText('Contact Information')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to departments tab', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const departmentsTab = screen.getByText('Departments');
      await user.click(departmentsTab);

      expect(screen.getByText('Departments')).toBeInTheDocument();
      expect(screen.getByText('Add Department')).toBeInTheDocument();
    });

    it('should switch to teams tab', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const teamsTab = screen.getByText('Teams');
      await user.click(teamsTab);

      expect(screen.getByText('Teams')).toBeInTheDocument();
      expect(screen.getByText('Add Team')).toBeInTheDocument();
    });

    it('should switch to settings tab', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const settingsTab = screen.getByText('Settings');
      await user.click(settingsTab);

      expect(screen.getByText('Organization Settings')).toBeInTheDocument();
    });
  });

  describe('Department Management', () => {
    it('should display departments in departments tab', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const departmentsTab = screen.getByText('Departments');
      await user.click(departmentsTab);

      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('Marketing')).toBeInTheDocument();
    });

    it('should open department form when Add Department is clicked', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const departmentsTab = screen.getByText('Departments');
      await user.click(departmentsTab);

      const addDepartmentButton = screen.getByText('Add Department');
      await user.click(addDepartmentButton);

      expect(screen.getByTestId('department-form')).toBeInTheDocument();
      expect(screen.getByText('Create New Department')).toBeInTheDocument();
    });

    it('should open department form for editing when Edit button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const departmentsTab = screen.getByText('Departments');
      await user.click(departmentsTab);

      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]); // Click first edit button

      expect(screen.getByTestId('department-form')).toBeInTheDocument();
      expect(screen.getByText('Edit Department')).toBeInTheDocument();
    });

    it('should close department form when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const departmentsTab = screen.getByText('Departments');
      await user.click(departmentsTab);

      const addDepartmentButton = screen.getByText('Add Department');
      await user.click(addDepartmentButton);

      expect(screen.getByTestId('department-form')).toBeInTheDocument();

      const closeButton = screen.getByText('Close Department Form');
      await user.click(closeButton);

      expect(screen.queryByTestId('department-form')).not.toBeInTheDocument();
    });
  });

  describe('Team Management', () => {
    it('should display teams in teams tab', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const teamsTab = screen.getByText('Teams');
      await user.click(teamsTab);

      expect(screen.getByText('Frontend Team')).toBeInTheDocument();
      expect(screen.getByText('Backend Team')).toBeInTheDocument();
    });

    it('should open team form when Add Team is clicked', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const teamsTab = screen.getByText('Teams');
      await user.click(teamsTab);

      const addTeamButton = screen.getByText('Add Team');
      await user.click(addTeamButton);

      expect(screen.getByTestId('team-form')).toBeInTheDocument();
      expect(screen.getByText('Create New Team')).toBeInTheDocument();
    });

    it('should open team form for editing when Edit button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const teamsTab = screen.getByText('Teams');
      await user.click(teamsTab);

      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]); // Click first edit button

      expect(screen.getByTestId('team-form')).toBeInTheDocument();
      expect(screen.getByText('Edit Team')).toBeInTheDocument();
    });

    it('should close team form when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const teamsTab = screen.getByText('Teams');
      await user.click(teamsTab);

      const addTeamButton = screen.getByText('Add Team');
      await user.click(addTeamButton);

      expect(screen.getByTestId('team-form')).toBeInTheDocument();

      const closeButton = screen.getByText('Close Team Form');
      await user.click(closeButton);

      expect(screen.queryByTestId('team-form')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner when departments are loading', async () => {
      const storeWithLoading = {
        ...mockStore,
        departmentsLoading: true,
      };
      mockUseOrganizationStore.mockReturnValue(storeWithLoading);

      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const departmentsTab = screen.getByText('Departments');
      await user.click(departmentsTab);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should show loading spinner when teams are loading', async () => {
      const storeWithLoading = {
        ...mockStore,
        teamsLoading: true,
      };
      mockUseOrganizationStore.mockReturnValue(storeWithLoading);

      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const teamsTab = screen.getByText('Teams');
      await user.click(teamsTab);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no departments exist', async () => {
      const storeWithNoDepartments = {
        ...mockStore,
        departments: [],
      };
      mockUseOrganizationStore.mockReturnValue(storeWithNoDepartments);

      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const departmentsTab = screen.getByText('Departments');
      await user.click(departmentsTab);

      expect(screen.getByText('No departments found')).toBeInTheDocument();
    });

    it('should show empty state when no teams exist', async () => {
      const storeWithNoTeams = {
        ...mockStore,
        teams: [],
      };
      mockUseOrganizationStore.mockReturnValue(storeWithNoTeams);

      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const teamsTab = screen.getByText('Teams');
      await user.click(teamsTab);

      expect(screen.getByText('No teams found')).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch departments and teams on mount', () => {
      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      expect(mockFetchDepartments).toHaveBeenCalledWith(mockOrganization.id);
      expect(mockFetchTeams).toHaveBeenCalledWith(mockOrganization.id);
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined departments gracefully', async () => {
      const storeWithUndefinedDepartments = {
        ...mockStore,
        departments: undefined,
      };
      mockUseOrganizationStore.mockReturnValue(storeWithUndefinedDepartments);

      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const departmentsTab = screen.getByText('Departments');
      await user.click(departmentsTab);

      // Should not crash and should show empty state
      expect(screen.getByText('No departments found')).toBeInTheDocument();
    });

    it('should handle undefined teams gracefully', async () => {
      const storeWithUndefinedTeams = {
        ...mockStore,
        teams: undefined,
      };
      mockUseOrganizationStore.mockReturnValue(storeWithUndefinedTeams);

      const user = userEvent.setup();

      render(
        <OrganizationDetails
          organization={mockOrganization}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />
      );

      const teamsTab = screen.getByText('Teams');
      await user.click(teamsTab);

      // Should not crash and should show empty state
      expect(screen.getByText('No teams found')).toBeInTheDocument();
    });
  });
});

