export class FileValidator {
  private static readonly ALLOWED_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/pdf', // .pdf
    'application/msword' // .doc
  ];

  private static readonly ALLOWED_EXTENSIONS = ['.docx', '.pdf', '.doc'];

  /**
   * Validates if the file type is allowed for templates
   */
  static validateFileType(mimeType: string): boolean {
    return this.ALLOWED_MIME_TYPES.includes(mimeType);
  }

  /**
   * Validates if the file size is within limits
   */
  static validateFileSize(sizeInBytes: number, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return sizeInBytes <= maxSizeBytes;
  }

  /**
   * Sanitizes file name to prevent security issues
   */
  static sanitizeFileName(fileName: string): string {
    // Remove path traversal attempts
    let sanitized = fileName.replace(/\.\./g, '');
    
    // Remove script tags and other dangerous characters
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    sanitized = sanitized.replace(/[\x00-\x1f\x80-\x9f]/g, '');
    
    // Replace slashes and backslashes
    sanitized = sanitized.replace(/[\/\\]/g, '_');
    
    // Remove multiple spaces and replace with single underscore
    sanitized = sanitized.replace(/\s+/g, '_');
    
    // Remove special characters except dots, hyphens, underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');
    
    // Ensure it doesn't start or end with dots
    sanitized = sanitized.replace(/^\.+|\.+$/g, '');
    
    return sanitized || 'untitled';
  }

  /**
   * Generates a unique file name with timestamp
   */
  static generateUniqueFileName(originalName: string): string {
    const sanitized = this.sanitizeFileName(originalName);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    const lastDotIndex = sanitized.lastIndexOf('.');
    if (lastDotIndex > 0) {
      const name = sanitized.substring(0, lastDotIndex);
      const extension = sanitized.substring(lastDotIndex);
      return `${name}_${timestamp}_${random}${extension}`;
    }
    
    return `${sanitized}_${timestamp}_${random}`;
  }

  /**
   * Detects MIME type from file extension
   */
  static detectMimeType(fileName: string): string {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    switch (extension) {
      case '.docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.pdf':
        return 'application/pdf';
      case '.doc':
        return 'application/msword';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Validates a file with comprehensive checks
   */
  static validateFile(
    file: Express.Multer.File,
    options: {
      allowedTypes?: string[];
      allowedExtensions?: string[];
      maxSizeMB?: number;
      required?: boolean;
    } = {}
  ): { isValid: boolean; error: string | null } {
    const {
      allowedTypes = this.ALLOWED_MIME_TYPES,
      allowedExtensions = this.ALLOWED_EXTENSIONS,
      maxSizeMB = 10,
      required = false,
    } = options;

    if (!file && required) {
      return { isValid: false, error: 'File is required' };
    }

    if (!file) {
      return { isValid: true, error: null };
    }

    // Validate file type
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      };
    }

    // Validate file extension
    const extension = this.getFileExtension(file.originalname);
    if (!allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        error: `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`,
      };
    }

    // Validate file size
    if (!this.validateFileSize(file.size, maxSizeMB)) {
      return {
        isValid: false,
        error: `File size exceeds ${maxSizeMB}MB limit`,
      };
    }

    return { isValid: true, error: null };
  }

  /**
   * Gets file extension from filename
   */
  static getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex > 0 && lastDotIndex < fileName.length - 1) {
      return fileName.substring(lastDotIndex).toLowerCase();
    }
    return '';
  }

  /**
   * Creates validation middleware for file uploads
   */
  static createFileValidationMiddleware(maxSizeMB: number = 10) {
    return (req: any, res: any, next: any) => {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { mimetype, size, originalname } = req.file;

      // Validate file type
      if (!this.validateFileType(mimetype)) {
        return res.status(400).json({ 
          error: 'Invalid file type. Only .docx, .pdf, and .doc files are allowed' 
        });
      }

      // Validate file size
      if (!this.validateFileSize(size, maxSizeMB)) {
        return res.status(400).json({ 
          error: `File size exceeds ${maxSizeMB}MB limit` 
        });
      }

      // Sanitize file name
      req.file.originalname = this.sanitizeFileName(originalname);

      next();
    };
  }
}

// Export a wrapper function that accepts either a number or an options object
export function createFileValidationMiddleware(options?: number | {
  allowedTypes?: string[];
  allowedExtensions?: string[];
  maxSizeMB?: number;
  required?: boolean;
}) {
  // If called with a number or no args, use the simple static method
  if (typeof options === 'number' || options === undefined) {
    return FileValidator.createFileValidationMiddleware(options);
  }
  
  // Otherwise, use the full validateFile method
  const { allowedTypes, allowedExtensions, maxSizeMB = 10, required = false } = options;
  
  return (req: any, res: any, next: any) => {
    const validation = FileValidator.validateFile(req.file, {
      allowedTypes,
      allowedExtensions,
      maxSizeMB,
      required
    });
    
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }
    
    // Sanitize filename if file exists
    if (req.file) {
      req.file.originalname = FileValidator.sanitizeFileName(req.file.originalname);
    }
    
    next();
  };
}