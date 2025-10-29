import { FileValidator } from '../../../src/shared/utils/file-validator';
import { jest } from '@jest/globals';

describe('FileValidator', () => {
  describe('validateFileType', () => {
    it('should validate correct file types', () => {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf',
        'application/msword'
      ];

      validTypes.forEach(type => {
        expect(FileValidator.validateFileType(type)).toBe(true);
      });
    });

    it('should reject invalid file types', () => {
      const invalidTypes = [
        'application/x-executable',
        'text/plain',
        'image/jpeg',
        'video/mp4'
      ];

      invalidTypes.forEach(type => {
        expect(FileValidator.validateFileType(type)).toBe(false);
      });
    });
  });

  describe('validateFileSize', () => {
    it('should validate files within size limit', () => {
      const maxSizeMB = 10;
      const validSizes = [
        1024, // 1KB
        1024 * 1024, // 1MB
        5 * 1024 * 1024, // 5MB
        10 * 1024 * 1024 // 10MB
      ];

      validSizes.forEach(size => {
        expect(FileValidator.validateFileSize(size, maxSizeMB)).toBe(true);
      });
    });

    it('should reject files exceeding size limit', () => {
      const maxSizeMB = 10;
      const invalidSizes = [
        11 * 1024 * 1024, // 11MB
        50 * 1024 * 1024, // 50MB
        100 * 1024 * 1024 // 100MB
      ];

      invalidSizes.forEach(size => {
        expect(FileValidator.validateFileSize(size, maxSizeMB)).toBe(false);
      });
    });
  });

  describe('sanitizeFileName', () => {
    it('should sanitize dangerous file names', () => {
      const dangerousNames = [
        '../../../etc/passwd',
        'file with spaces.docx',
        'file<script>alert("xss")</script>.pdf',
        'file\x00null.pdf',
        'file/with/slashes.docx'
      ];

      dangerousNames.forEach(name => {
        const sanitized = FileValidator.sanitizeFileName(name);
        expect(sanitized).not.toContain('../');
        expect(sanitized).not.toContain('<');
        expect(sanitized).not.toContain('>');
        expect(sanitized).not.toContain('\x00');
        expect(sanitized).not.toContain('/');
      });
    });

    it('should preserve valid file names', () => {
      const validNames = [
        'template.docx',
        'peer-feedback-template.pdf',
        'manager_review_2024.doc',
        'template-v1.2.docx'
      ];

      validNames.forEach(name => {
        const sanitized = FileValidator.sanitizeFileName(name);
        expect(sanitized).toBe(name);
      });
    });
  });

  describe('generateUniqueFileName', () => {
    it('should generate unique file names', () => {
      const baseName = 'template.docx';
      const unique1 = FileValidator.generateUniqueFileName(baseName);
      const unique2 = FileValidator.generateUniqueFileName(baseName);

      expect(unique1).toContain('template');
      expect(unique1).toContain('.docx');
      expect(unique1).not.toBe(unique2);
    });

    it('should preserve file extension', () => {
      const baseName = 'document.pdf';
      const unique = FileValidator.generateUniqueFileName(baseName);

      expect(unique).toMatch(/\.pdf$/);
    });
  });
});