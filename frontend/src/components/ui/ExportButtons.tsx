// frontend/src/components/ui/ExportButtons.tsx
// Combined Download + Google Drive export buttons

import React from 'react';
import { Download } from 'lucide-react';
import { IconButton } from './IconButton';
import { GoogleDriveLogo } from '../icons';
import { cn } from '@/lib/utils';

export interface ExportButtonsProps {
  /** Handler for local download */
  onDownload?: () => void | Promise<void>;
  /** Handler for saving to Google Drive */
  onSaveToDrive?: () => void | Promise<void>;
  /** Loading state for download button */
  downloadLoading?: boolean;
  /** Loading state for Drive button */
  driveLoading?: boolean;
  /** Disable both buttons */
  disabled?: boolean;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class for the container */
  className?: string;
  /** Tooltip for download button */
  downloadTooltip?: string;
  /** Tooltip for Drive button */
  driveTooltip?: string;
}

/**
 * ExportButtons - Download and Google Drive save buttons
 * 
 * Usage:
 * ```tsx
 * <ExportButtons
 *   onDownload={handleDownload}
 *   onSaveToDrive={handleSaveToDrive}
 *   downloadLoading={isDownloading}
 *   driveLoading={isUploading}
 * />
 * ```
 */
export const ExportButtons: React.FC<ExportButtonsProps> = ({
  onDownload,
  onSaveToDrive,
  downloadLoading = false,
  driveLoading = false,
  disabled = false,
  size = 'md',
  className,
  downloadTooltip = 'Download',
  driveTooltip = 'Save to Google Drive',
}) => {
  // Either button loading disables interactions on both
  const isAnyLoading = downloadLoading || driveLoading;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Download Button */}
      <IconButton
        icon={<Download className="w-full h-full" />}
        tooltip={downloadTooltip}
        tooltipPosition="top"
        variant="outline"
        size={size}
        onClick={onDownload}
        loading={downloadLoading}
        disabled={disabled || (driveLoading && !downloadLoading)}
        aria-label={downloadTooltip}
        hoverClassName="hover:bg-blue-500 hover:border-blue-500 hover:text-white"
      />

      {/* Google Drive Button */}
      <IconButton
        icon={<GoogleDriveLogo className="w-full h-full" />}
        tooltip={driveTooltip}
        tooltipPosition="top"
        variant="outline"
        size={size}
        onClick={onSaveToDrive}
        loading={driveLoading}
        disabled={disabled || (downloadLoading && !driveLoading)}
        aria-label={driveTooltip}
        hoverClassName="hover:bg-[#0F9D58] hover:border-[#0F9D58]"
      />
    </div>
  );
};

export default ExportButtons;

