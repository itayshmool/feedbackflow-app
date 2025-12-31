import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface MaintenanceStatus {
  isMaintenanceMode: boolean;
  isChecking: boolean;
}

/**
 * Hook to check if the system is in maintenance mode
 * 
 * Checks both:
 * 1. Frontend environment variable (VITE_MAINTENANCE_MODE)
 * 2. Backend API endpoint (/api/v1/maintenance-status)
 * 
 * If frontend env var is true, immediately returns maintenance mode.
 * Otherwise, checks backend status.
 * 
 * @returns {MaintenanceStatus} Object with isMaintenanceMode and isChecking flags
 */
export const useMaintenanceMode = (): MaintenanceStatus => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        // Check frontend environment variable first (for immediate response)
        const envMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';
        
        if (envMaintenanceMode) {
          console.log('[MaintenanceMode] Frontend env var enabled');
          setIsMaintenanceMode(true);
          setIsChecking(false);
          return;
        }

        // Then check backend status
        const response = await api.get('/maintenance-status');
        const backendMaintenanceMode = response.data.data.maintenance;
        
        console.log('[MaintenanceMode] Backend status:', backendMaintenanceMode);
        setIsMaintenanceMode(backendMaintenanceMode);
      } catch (error) {
        // If API call fails, assume no maintenance mode
        console.log('[MaintenanceMode] Check failed, assuming no maintenance');
        setIsMaintenanceMode(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkMaintenanceStatus();
    
    // Check every 30 seconds in case maintenance mode is toggled
    const interval = setInterval(checkMaintenanceStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { isMaintenanceMode, isChecking };
};

