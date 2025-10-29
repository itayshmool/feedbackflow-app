import { FileStorageService } from '../../../src/services/FileStorageService';
import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('FileStorageService', () => {
  let fileStorageService: FileStorageService;
  const testUploadDir = '/test/uploads';
  const testFile = {
    originalname: 'test.docx',
    buffer: Buffer.from('test content'),
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };

  beforeEach(() => {
    fileStorageService = new FileStorageService(testUploadDir);
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFilePath = path.join(testUploadDir, 'test.docx');
      mockedFs.writeFileSync.mockImplementation(() => {});

      const result = await fileStorageService.uploadFile(testFile, 'test.docx');

      expect(result).toEqual({
        filePath: mockFilePath,
        fileName: 'test.docx',
        fileSize: testFile.buffer.length
      });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(mockFilePath, testFile.buffer);
    });

    it('should handle file upload errors', async () => {
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      await expect(fileStorageService.uploadFile(testFile, 'test.docx'))
        .rejects.toThrow('Write failed');
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const mockFilePath = path.join(testUploadDir, 'test.docx');
      const mockContent = Buffer.from('file content');
      
      mockedFs.readFileSync.mockReturnValue(mockContent);
      mockedFs.existsSync.mockReturnValue(true);

      const result = await fileStorageService.downloadFile(mockFilePath);

      expect(result).toEqual(mockContent);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(mockFilePath);
    });

    it('should throw error for non-existent file', async () => {
      const mockFilePath = path.join(testUploadDir, 'nonexistent.docx');
      mockedFs.existsSync.mockReturnValue(false);

      await expect(fileStorageService.downloadFile(mockFilePath))
        .rejects.toThrow('File not found');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const mockFilePath = path.join(testUploadDir, 'test.docx');
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.unlinkSync.mockImplementation(() => {});

      await fileStorageService.deleteFile(mockFilePath);

      expect(mockedFs.unlinkSync).toHaveBeenCalledWith(mockFilePath);
    });

    it('should handle non-existent file deletion', async () => {
      const mockFilePath = path.join(testUploadDir, 'nonexistent.docx');
      mockedFs.existsSync.mockReturnValue(false);

      await expect(fileStorageService.deleteFile(mockFilePath))
        .rejects.toThrow('File not found');
    });
  });

  describe('getFileUrl', () => {
    it('should generate file URL', () => {
      const mockFilePath = path.join(testUploadDir, 'test.docx');
      const url = fileStorageService.getFileUrl(mockFilePath);

      expect(url).toContain('test.docx');
    });
  });

  describe('copyFile', () => {
    it('should copy file successfully', async () => {
      const sourcePath = path.join(testUploadDir, 'source.docx');
      const destPath = path.join(testUploadDir, 'dest.docx');
      const mockContent = Buffer.from('file content');

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(mockContent);
      mockedFs.writeFileSync.mockImplementation(() => {});

      await fileStorageService.copyFile(sourcePath, destPath);

      expect(mockedFs.readFileSync).toHaveBeenCalledWith(sourcePath);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(destPath, mockContent);
    });
  });
});