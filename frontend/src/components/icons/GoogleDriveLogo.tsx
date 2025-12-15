// frontend/src/components/icons/GoogleDriveLogo.tsx
// Official Google Drive logo with brand colors

import React from 'react';

interface GoogleDriveLogoProps {
  className?: string;
  size?: number;
}

export const GoogleDriveLogo: React.FC<GoogleDriveLogoProps> = ({ 
  className = '', 
  size = 24 
}) => {
  return (
    <svg
      viewBox="0 0 87.3 78"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      aria-label="Google Drive"
      role="img"
    >
      {/* Green (bottom-left to bottom-right) */}
      <path
        d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z"
        fill="#0F9D58"
      />
      {/* Yellow (top-left) */}
      <path
        d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 52.55c-.8 1.4-1.2 2.95-1.2 4.5h27.5l16.15-32.05z"
        fill="#FFBA00"
      />
      {/* Blue (right side) */}
      <path
        d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.9l-6.3 12.5 6.3 12.5 13.65-1.2z"
        fill="#4285F4"
      />
      {/* Blue (top-right area) */}
      <path
        d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2L43.65 25z"
        fill="#4285F4"
      />
      {/* Green (right-bottom connection) */}
      <path
        d="M59.9 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2L59.9 53z"
        fill="#0F9D58"
      />
      {/* Yellow (top connection) */}
      <path
        d="M73.4 26.5l-12.1-21c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.9 53h27.4c0-1.55-.4-3.1-1.2-4.5l-12.7-22z"
        fill="#FFBA00"
      />
    </svg>
  );
};

export default GoogleDriveLogo;

