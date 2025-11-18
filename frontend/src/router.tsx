import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRouteGuard from './components/auth/AdminRouteGuard';
import { useAuthStore } from './stores/authStore';

// Pages
import LoginPage from './pages/auth/LoginPage';
import GoogleOAuthTestPage from './pages/auth/GoogleOAuthTestPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import ManagerDashboard from './pages/dashboard/ManagerDashboard';
import OrganizationManagement from './pages/admin/OrganizationManagement';
import UserManagement from './pages/admin/UserManagement';
import SystemSettings from './pages/admin/SystemSettings';
import IntegrationSettings from './pages/admin/IntegrationSettings';
import CyclesPage from './pages/cycles/CyclesPage';
import CreateCycle from './pages/cycles/CreateCycle';
import CycleDetailPage from './pages/cycles/CycleDetailPage';
import FeedbackPage from './pages/feedback/FeedbackPage';
import GiveFeedback from './pages/feedback/GiveFeedback';
import ReceiveFeedback from './pages/feedback/ReceiveFeedback';
import FeedbackDetailPage from './pages/feedback/FeedbackDetailPage';
import TeamFeedbackPage from './pages/feedback/TeamFeedbackPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import ProfilePage from './pages/profile/ProfilePage';
import SettingsPage from './pages/settings/SettingsPage';
import HierarchyManagement from './pages/admin/HierarchyManagement';
import TemplatesManagement from './pages/admin/TemplatesManagement';
import NotFoundPage from './pages/NotFoundPage';

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
              path: 'organizations',
              element: <OrganizationManagement />,
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
              path: 'integrations',
              element: <IntegrationSettings />,
            },
            {
              path: 'hierarchy',
              element: <HierarchyManagement />,
            },
            {
              path: 'templates',
              element: <TemplatesManagement />,
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
              path: 'give',
              element: <GiveFeedback />,
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
          path: 'team-feedback',
          element: <TeamFeedbackPage />,
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
