// GrowthPulse Logo Component
// A bonsai tree with a pulse/heartbeat line representing growth and vitality

import React from 'react';

interface GrowthPulseLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export const GrowthPulseLogoIcon: React.FC<{ size?: number; className?: string }> = ({ 
  size = 48, 
  className = '' 
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Pot */}
    <path
      d="M35 78 L65 78 L60 92 L40 92 Z"
      fill="#5D4037"
      stroke="#4E342E"
      strokeWidth="1"
    />
    {/* Pot highlight */}
    <path
      d="M42 82 L52 82 L50 88 L44 88 Z"
      fill="#8D6E63"
      opacity="0.5"
    />
    {/* Pot rim */}
    <rect x="33" y="75" width="34" height="5" rx="1" fill="#6D4C41" />
    
    {/* Tree trunk */}
    <path
      d="M50 75 
         C50 70, 48 65, 50 60
         C52 55, 50 50, 50 45
         C50 40, 52 35, 50 30"
      stroke="#5D4037"
      strokeWidth="6"
      strokeLinecap="round"
      fill="none"
    />
    
    {/* Left branch */}
    <path
      d="M50 55 C45 52, 38 50, 32 48"
      stroke="#5D4037"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
    />
    
    {/* Right branch */}
    <path
      d="M50 55 C55 52, 62 50, 68 48"
      stroke="#5D4037"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
    />
    
    {/* Main foliage (top) */}
    <ellipse cx="50" cy="22" rx="22" ry="14" fill="#26A69A" />
    <ellipse cx="42" cy="20" rx="12" ry="10" fill="#2DB5A6" />
    <ellipse cx="58" cy="20" rx="12" ry="10" fill="#2DB5A6" />
    <ellipse cx="50" cy="16" rx="14" ry="9" fill="#4DB6AC" />
    
    {/* Left foliage */}
    <ellipse cx="28" cy="42" rx="14" ry="10" fill="#26A69A" />
    <ellipse cx="24" cy="40" rx="10" ry="8" fill="#2DB5A6" />
    <ellipse cx="32" cy="38" rx="8" ry="6" fill="#4DB6AC" />
    
    {/* Right foliage */}
    <ellipse cx="72" cy="42" rx="14" ry="10" fill="#26A69A" />
    <ellipse cx="76" cy="40" rx="10" ry="8" fill="#2DB5A6" />
    <ellipse cx="68" cy="38" rx="8" ry="6" fill="#4DB6AC" />
    
    {/* Pulse/Heartbeat line */}
    <path
      d="M15 45 
         L35 45 
         L40 35 
         L45 55 
         L50 30 
         L55 50 
         L60 40 
         L65 45 
         L85 45"
      stroke="#2196F3"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const GrowthPulseLogo: React.FC<GrowthPulseLogoProps> = ({
  size = 48,
  className = '',
  showText = true,
  textClassName = ''
}) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <GrowthPulseLogoIcon size={size} />
    {showText && (
      <span className={`text-xl font-bold tracking-tight ${textClassName}`}>
        <span className="text-gray-800">GROWTH</span>
        <span className="text-gray-500 font-normal">PULSE</span>
      </span>
    )}
  </div>
);

export default GrowthPulseLogo;

