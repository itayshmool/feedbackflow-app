import fs from 'fs';
import path from 'path';

export interface FileUpload {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
}

export interface FileUploadResult {
  filePath: string;
  fileName: string;
  fileSize: number;
}

export class FileStorageService {
  private uploadDir: string;

  constructor(uploadDir: string = './uploads') {
    this.uploadDir = uploadDir;
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload a file to the storage
   * Supports two signatures:
   * 1. uploadFile(file: FileUpload, fileName: string) - legacy
   * 2. uploadFile(buffer: Buffer, filePath: string, mimetype: string, metadata?: Record<string, string>) - new
   */
  async uploadFile(
    fileOrBuffer: FileUpload | Buffer,
    fileNameOrPath: string,
    mimetype?: string,
    metadata?: Record<string, string>
  ): Promise<FileUploadResult | { path: string; url: string; size: number }> {
    // Handle new signature (buffer, path, mimetype, metadata)
    if (Buffer.isBuffer(fileOrBuffer) && mimetype) {
      const buffer = fileOrBuffer;
      const filePath = fileNameOrPath;
      const fullPath = path.join(this.uploadDir, filePath);
      const dir = path.dirname(fullPath);
      
      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      try {
        fs.writeFileSync(fullPath, buffer);
        
        return {
          path: filePath,
          url: this.getFileUrl(filePath),
          size: buffer.length,
        };
      } catch (error) {
        throw new Error(`Failed to upload file: ${error}`);
      }
    }
    
    // Handle legacy signature (file, fileName)
    const file = fileOrBuffer as FileUpload;
    const fileName = fileNameOrPath;
    const filePath = path.join(this.uploadDir, fileName);
    
    try {
      fs.writeFileSync(filePath, file.buffer);
      
      return {
        filePath,
        fileName,
        fileSize: file.buffer.length
      };
    } catch (error) {
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  /**
   * Download a file from storage
   */
  async downloadFile(filePath: string): Promise<Buffer> {
    // Handle both absolute and relative paths
    const fullPath = filePath.startsWith(this.uploadDir) 
      ? filePath 
      : path.join(this.uploadDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found');
    }

    try {
      return fs.readFileSync(fullPath);
    } catch (error) {
      throw new Error(`Failed to download file: ${error}`);
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(filePath: string): Promise<void> {
    // Handle both absolute and relative paths
    const fullPath = filePath.startsWith(this.uploadDir) 
      ? filePath 
      : path.join(this.uploadDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found');
    }

    try {
      fs.unlinkSync(fullPath);
    } catch (error) {
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  /**
   * Get file URL (for local storage, returns file path)
   */
  getFileUrl(filePath: string): string {
    // For local storage, return the file path
    // In production with cloud storage, this would return a signed URL
    return filePath;
  }

  /**
   * Copy a file to a new location
   */
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    if (!fs.existsSync(sourcePath)) {
      throw new Error('Source file not found');
    }

    try {
      const fileContent = fs.readFileSync(sourcePath);
      fs.writeFileSync(destPath, fileContent);
    } catch (error) {
      throw new Error(`Failed to copy file: ${error}`);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    return fs.existsSync(filePath);
  }

  /**
   * Get file stats
   */
  async getFileStats(filePath: string): Promise<fs.Stats | null> {
    try {
      return fs.statSync(filePath);
    } catch (error) {
      return null;
    }
  }

}

// Export singleton instance
export const fileStorageService = new FileStorageService();