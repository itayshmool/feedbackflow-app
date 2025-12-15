// frontend/src/services/googleDrive.service.ts
// Google Drive service for uploading files
// Uses dynamic GIS loading to avoid conflicts with @react-oauth/google

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

// Folder name in user's Google Drive where files will be saved
const FEEDBACKFLOW_FOLDER_NAME = 'FeedbackFlow';

export interface DriveUploadResult {
  /** Google Drive file ID */
  fileId: string;
  /** URL to view/edit in Google Docs */
  webViewLink: string;
  /** Direct download URL */
  webContentLink?: string;
  /** File name */
  fileName: string;
}

export interface DriveUploadOptions {
  /** Folder name to save in (defaults to 'FeedbackFlow') */
  folderName?: string;
  /** File description */
  description?: string;
}

class GoogleDriveService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private gisLoaded: boolean = false;
  private gisLoadPromise: Promise<void> | null = null;

  /**
   * Dynamically load the Google Identity Services script
   * This avoids conflicts with @react-oauth/google
   */
  private async loadGIS(): Promise<void> {
    // Already loaded
    if (this.gisLoaded && window.google?.accounts?.oauth2) {
      return;
    }

    // Already loading
    if (this.gisLoadPromise) {
      return this.gisLoadPromise;
    }

    this.gisLoadPromise = new Promise((resolve, reject) => {
      // Check if GIS is already available (loaded by @react-oauth/google)
      if (window.google?.accounts?.oauth2) {
        this.gisLoaded = true;
        resolve();
        return;
      }

      // GIS script might already be in DOM but not fully loaded
      const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      
      if (existingScript) {
        // Wait for it to load
        const checkLoaded = () => {
          if (window.google?.accounts?.oauth2) {
            this.gisLoaded = true;
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        return;
      }

      // Load the script ourselves
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        // Wait a bit for the library to initialize
        const checkLoaded = () => {
          if (window.google?.accounts?.oauth2) {
            this.gisLoaded = true;
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Identity Services'));
      };
      
      document.head.appendChild(script);
    });

    return this.gisLoadPromise;
  }

  /**
   * Request access token for Google Drive
   * Opens a popup for user consent if needed
   */
  async requestDriveAccess(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Ensure GIS is loaded
    await this.loadGIS();

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('Google Client ID not configured');
    }

    return new Promise((resolve, reject) => {
      const tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPE,
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          
          this.accessToken = response.access_token;
          // Token expires in expires_in seconds, subtract 60s for safety margin
          this.tokenExpiry = Date.now() + (response.expires_in - 60) * 1000;
          resolve(response.access_token);
        },
        error_callback: (error) => {
          reject(new Error(error.message || 'Failed to get access token'));
        },
      });

      // Request the token - this will show a popup
      tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  /**
   * Find or create a folder in Google Drive
   */
  private async findOrCreateFolder(folderName: string): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    // Search for existing folder
    const searchQuery = encodeURIComponent(
      `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );
    
    const searchResponse = await fetch(
      `${DRIVE_API_BASE}/files?q=${searchQuery}&fields=files(id,name)`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`Failed to search for folder: ${searchResponse.statusText}`);
    }

    const searchResult = await searchResponse.json();
    
    // Return existing folder
    if (searchResult.files && searchResult.files.length > 0) {
      return searchResult.files[0].id;
    }

    // Create new folder
    const createResponse = await fetch(`${DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create folder: ${createResponse.statusText}`);
    }

    const folder = await createResponse.json();
    return folder.id;
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(
    blob: Blob,
    fileName: string,
    options: DriveUploadOptions = {}
  ): Promise<DriveUploadResult> {
    const { folderName = FEEDBACKFLOW_FOLDER_NAME, description } = options;

    // Ensure we have access
    await this.requestDriveAccess();

    // Find or create the folder
    const folderId = await this.findOrCreateFolder(folderName);

    // Prepare metadata
    const metadata: Record<string, any> = {
      name: fileName,
      mimeType: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      parents: [folderId],
    };

    if (description) {
      metadata.description = description;
    }

    // Create multipart request body
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    // Convert blob to base64
    const fileContent = await this.blobToBase64(blob);

    const requestBody = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${metadata.mimeType}\r\n` +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      fileContent +
      closeDelimiter;

    // Upload the file
    const uploadResponse = await fetch(
      `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,webViewLink,webContentLink`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body: requestBody,
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Failed to upload file: ${uploadResponse.statusText} - ${error}`);
    }

    const result = await uploadResponse.json();

    return {
      fileId: result.id,
      webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
      webContentLink: result.webContentLink,
      fileName: result.name,
    };
  }

  /**
   * Convert Blob to base64 string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64Content = base64.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Check if we have a valid access token
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null && Date.now() < this.tokenExpiry;
  }

  /**
   * Clear the stored token (logout)
   */
  clearToken(): void {
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  /**
   * Revoke the access token
   */
  async revokeAccess(): Promise<void> {
    if (!this.accessToken) return;

    await this.loadGIS();
    
    window.google?.accounts.oauth2.revoke(this.accessToken, () => {
      this.clearToken();
    });
  }
}

// Export singleton instance
export const googleDriveService = new GoogleDriveService();

// Also export the class for testing
export { GoogleDriveService };

