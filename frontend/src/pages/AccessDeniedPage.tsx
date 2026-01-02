import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Mail, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const AccessDeniedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always redirect to login, even if logout fails
      // Use window.location to force full page reload and clear state
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-12 h-12 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">
          Access Denied
        </h1>

        {/* Message */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <p className="text-gray-700 text-center mb-4">
            Your email address is not authorized to access this application.
          </p>

          {/* User Email Display */}
          {user?.email && (
            <div className="bg-gray-50 rounded-md p-4 mb-4 flex items-center justify-center gap-2">
              <Mail className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">{user.email}</span>
            </div>
          )}

          <p className="text-sm text-gray-600 text-center">
            If you believe this is an error, please contact your system administrator.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>

          <p className="text-xs text-gray-500 text-center">
            You can try signing in with a different account.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            Error Code: EMAIL_NOT_WHITELISTED
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;

