import React from 'react';
import { cn } from '@/lib/utils';

interface PenOffProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const PenOff: React.FC<PenOffProps> = ({ 
  size = 24, 
  className, 
  ...props 
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn('flex-shrink-0', className)}
    {...props}
  >
    {/* Pen body */}
    <path d="m13.5 10.5-1 1" />
    <path d="m16 7-4.5 4.5" />
    <path d="M10 13.5 7.5 16H5v-2.5L13.5 5c.83-.83 2.17-.83 3 0l.5.5c.83.83.83 2.17 0 3L10 13.5Z" />
    {/* Slash through */}
    <path d="m2 2 20 20" />
  </svg>
);

