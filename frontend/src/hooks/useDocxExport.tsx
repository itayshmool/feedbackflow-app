// frontend/src/hooks/useDocxExport.ts
// Hook for handling DOCX export (download + Google Drive)

import { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { googleDriveService, DriveUploadResult } from '@/services/googleDrive.service';
import { toast } from 'react-hot-toast';

export interface UseDocxExportOptions {
  /** Called when export starts */
  onExportStart?: () => void;
  /** Called when export completes successfully */
  onExportSuccess?: (method: 'download' | 'drive', result?: DriveUploadResult) => void;
  /** Called when export fails */
  onExportError?: (method: 'download' | 'drive', error: Error) => void;
}

export interface DocxExportResult {
  blob: Blob;
  filename: string;
}

export interface UseDocxExportReturn {
  /** Whether a download is in progress */
  isDownloading: boolean;
  /** Whether a Drive upload is in progress */
  isUploadingToDrive: boolean;
  /** Download the DOCX file locally */
  download: (getDocx: () => Promise<DocxExportResult>) => Promise<void>;
  /** Upload the DOCX file to Google Drive */
  saveToDrive: (getDocx: () => Promise<DocxExportResult>, description?: string) => Promise<void>;
}

/**
 * Hook for exporting DOCX files via download or Google Drive
 * 
 * @example
 * const { isDownloading, isUploadingToDrive, download, saveToDrive } = useDocxExport();
 * 
 * // In ExportButtons:
 * <ExportButtons
 *   onDownload={() => download(() => createFeedbackDocxBlob(feedback))}
 *   onSaveToDrive={() => saveToDrive(() => createFeedbackDocxBlob(feedback))}
 *   downloadLoading={isDownloading}
 *   driveLoading={isUploadingToDrive}
 * />
 */
export function useDocxExport(options: UseDocxExportOptions = {}): UseDocxExportReturn {
  const { onExportStart, onExportSuccess, onExportError } = options;
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);

  const download = useCallback(async (getDocx: () => Promise<DocxExportResult>) => {
    setIsDownloading(true);
    onExportStart?.();
    
    try {
      const { blob, filename } = await getDocx();
      saveAs(blob, filename);
      
      toast.success('Document downloaded successfully!');
      onExportSuccess?.('download');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Download failed');
      console.error('Download error:', err);
      toast.error(`Download failed: ${err.message}`);
      onExportError?.('download', err);
    } finally {
      setIsDownloading(false);
    }
  }, [onExportStart, onExportSuccess, onExportError]);

  const saveToDrive = useCallback(async (
    getDocx: () => Promise<DocxExportResult>,
    description?: string
  ) => {
    setIsUploadingToDrive(true);
    onExportStart?.();
    
    try {
      // Generate the document
      const { blob, filename } = await getDocx();
      
      // Show uploading toast
      const toastId = toast.loading('Uploading to Google Drive...');
      
      // Upload to Drive
      const result = await googleDriveService.uploadFile(blob, filename, {
        description,
      });
      
      // Success!
      toast.dismiss(toastId);
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-medium">Saved to Google Drive!</span>
          <a 
            href={result.webViewLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Open in Drive →
          </a>
        </div>,
        { duration: 5000 }
      );
      
      onExportSuccess?.('drive', result);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Upload failed');
      console.error('Google Drive upload error:', err);
      
      // Handle specific errors
      if (err.message.includes('popup')) {
        toast.error('Please allow the popup to sign in with Google');
      } else if (err.message.includes('access_denied')) {
        toast.error('Google Drive access was denied');
      } else {
        toast.error(`Failed to save to Drive: ${err.message}`);
      }
      
      onExportError?.('drive', err);
    } finally {
      setIsUploadingToDrive(false);
    }
  }, [onExportStart, onExportSuccess, onExportError]);

  return {
    isDownloading,
    isUploadingToDrive,
    download,
    saveToDrive,
  };
}

