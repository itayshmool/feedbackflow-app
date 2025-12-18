import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRouteGuard from './components/auth/AdminRouteGuard';
import SuperAdminRouteGuard from './components/auth/SuperAdminRouteGuard';
import { useAuthStore } from './stores/authStore';

// Pages
import LoginPage from './pages/auth/LoginPage';
import GoogleOAuthTestPage from './pages/auth/GoogleOAuthTestPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import ManagerDashboard from './pages/dashboard/ManagerDashboard';
import EmployeeDashboard from './pages/dashboard/EmployeeDashboard';
import OrganizationManagement from './pages/admin/OrganizationManagement';
import UserManagement from './pages/admin/UserManagement';
import SystemSettings from './pages/admin/SystemSettings';
// IntegrationSettings removed - will be added later
import CyclesPage from './pages/cycles/CyclesPage';
import CreateCycle from './pages/cycles/CreateCycle';
import CycleDetailPage from './pages/cycles/CycleDetailPage';
import FeedbackPage from './pages/feedback/FeedbackPage';
import ReceiveFeedback from './pages/feedback/ReceiveFeedback';
import FeedbackDetailPage from './pages/feedback/FeedbackDetailPage';
import TeamFeedbackPage from './pages/feedback/TeamFeedbackPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import ProfilePage from './pages/profile/ProfilePage';
import SettingsPage from './pages/settings/SettingsPage';
import HierarchyManagement from './pages/admin/HierarchyManagement';
import TemplatesManagement from './pages/admin/TemplatesManagement';
import BulkSetupPage from './pages/admin/BulkSetupPage';
import TemplateLibrary from './pages/manager/TemplateLibrary';
import EmployeeHistoryPage from './pages/team/EmployeeHistoryPage';
import TeamPage from './pages/team/TeamPage';
import QuoteArchivePage from './pages/quotes/QuoteArchivePage';
import NotFoundPage from './pages/NotFoundPage';
import QuoteTest from './pages/test/QuoteTest';

// Layout
import Layout from './components/layout/Layout';

const AppRouter: React.FC = () => {
  const { user } = useAuthStore();

  const router = createBrowserRouter([
    {
      path: '/login',
      element: <LoginPage />,
    },
    {
      path: '/test-google-login',
      element: <GoogleOAuthTestPage />,
    },
    {
      path: '/test/quote',
      element: <QuoteTest />,
    },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      ),
      children: [
        {
          index: true,
          element: <DashboardPage />,
        },
        {
          path: 'dashboard',
          element: <DashboardPage />,
        },
        {
          path: 'admin',
          element: (
            <AdminRouteGuard>
              <Outlet />
            </AdminRouteGuard>
          ),
          children: [
            {
              index: true,
              element: <AdminDashboard />,
            },
            {
              // Organizations management - super_admin only
              path: 'organizations',
              element: (
                <SuperAdminRouteGuard>
                  <OrganizationManagement />
                </SuperAdminRouteGuard>
              ),
            },
            {
              path: 'users',
              element: <UserManagement />,
            },
            {
              path: 'settings',
              element: <SystemSettings />,
            },
            {
              path: 'hierarchy',
              element: <HierarchyManagement />,
            },
            {
              path: 'templates',
              element: <TemplatesManagement />,
            },
            {
              path: 'bulk-setup',
              element: <BulkSetupPage />,
            },
          ],
        },
        {
          path: 'cycles',
          children: [
            {
              index: true,
              element: <CyclesPage />,
            },
            {
              path: 'create',
              element: <CreateCycle />,
            },
            {
              path: ':id',
              element: <CycleDetailPage />,
            },
          ],
        },
        {
          path: 'feedback',
          children: [
            {
              index: true,
              element: <FeedbackPage />,
            },
            {
              path: 'receive',
              element: <ReceiveFeedback />,
            },
            {
              path: ':id',
              element: <FeedbackDetailPage />,
            },
          ],
        },
        {
          path: 'myself',
          element: <EmployeeDashboard />,
        },
        {
          path: 'quotes',
          element: <QuoteArchivePage />,
        },
        {
          path: 'team',
          element: <TeamPage />,
        },
        {
          path: 'team/:employeeId',
          element: <EmployeeHistoryPage />,
        },
        {
          path: 'team-feedback',
          element: <TeamFeedbackPage />,
        },
        {
          path: 'templates',
          element: <TemplateLibrary />,
        },
        {
          path: 'analytics',
          element: <AnalyticsPage />,
        },
        {
          path: 'notifications',
          element: <NotificationsPage />,
        },
        {
          path: 'profile',
          element: <ProfilePage />,
        },
        {
          path: 'settings',
          element: <SettingsPage />,
        },
      ],
    },
    {
      path: '*',
      element: <NotFoundPage />,
    },
  ]);

  return <RouterProvider router={router} />;
};

export default AppRouter;
