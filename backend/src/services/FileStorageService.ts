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
   */
  async uploadFile(file: FileUpload, fileName: string): Promise<FileUploadResult> {
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
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    try {
      return fs.readFileSync(filePath);
    } catch (error) {
      throw new Error(`Failed to download file: ${error}`);
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    try {
      fs.unlinkSync(filePath);
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