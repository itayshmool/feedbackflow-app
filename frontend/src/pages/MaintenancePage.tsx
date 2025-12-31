import React from 'react';
import { Wrench } from 'lucide-react';

const MaintenancePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-200">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
              <div className="relative bg-blue-100 rounded-full p-6">
                <Wrench className="w-16 h-16 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
            Under Maintenance
          </h1>

          {/* Simple, Clear Message */}
          <div className="text-center space-y-4">
            <p className="text-lg text-gray-700">
              We're currently improving the system.
            </p>
            <p className="text-base text-gray-600">
              We'll be back shortly. Thank you for your patience.
            </p>
          </div>

          {/* Status Indicator */}
          <div className="mt-8 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">
                Maintenance in Progress
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;

