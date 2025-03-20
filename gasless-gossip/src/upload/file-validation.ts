// src/modules/file/file-validation.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as FileType from 'file-type';
import * as path from 'path';

@Injectable()
export class FileValidationService {
  private readonly logger = new Logger(FileValidationService.name);
  private readonly allowedMimeTypes: string[];
  private readonly allowedExtensions: string[];
  private readonly maxFileSize: number;
  private readonly dangerousExtensions: string[] = [
    // Executable files
    'exe', 'dll', 'bat', 'cmd', 'sh', 'app',
    // Script files that could be malicious
    'js', 'vbs', 'ps1', 'py', 'rb', 'pl',
    // Archives that might contain malicious files
    'zip', 'rar', '7z', 'gz', 'tar',
    // Other potentially dangerous formats
    'msi', 'jar', 'jnlp',
  ];

  constructor(private readonly configService: ConfigService) {
    this.allowedMimeTypes = this.configService
      .get<string>('ALLOWED_MIME_TYPES', '')
      .split(',')
      .map(type => type.trim())
      .filter(Boolean);

    this.allowedExtensions = this.configService
      .get<string>('ALLOWED_FILE_EXTENSIONS', '')
      .split(',')
      .map(ext => ext.trim().toLowerCase())
      .filter(Boolean);

    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB default
  }

  /**
   * Comprehensive file validation
   */
  async validateFile(file: Express.Multer.File): Promise<void> {
    // Check file size
    this.validateFileSize(file);

    // Check file extension
    this.validateFileExtension(file);

    // Check MIME type based on file signature
    await this.validateFileSignature(file);

    // Additional validation could be added here, like virus scanning
  }

  /**
   * Validate file size
   */
  private validateFileSize(file: Express.Multer.File): void {
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds the limit of ${this.maxFileSize / (1024 * 1024)}MB`
      );
    }
  }

  /**
   * Validate file extension
   */
  private validateFileExtension(file: Express.Multer.File): void {
    const extension = path.extname(file.originalname).substring(1).toLowerCase();

    // Check if extension is in dangerous list
    if (this.dangerousExtensions.includes(extension)) {
      throw new BadRequestException(`File extension '${extension}' is not allowed`);
    }

    // If we have a whitelist of extensions, check against it
    if (this.allowedExtensions.length > 0 && !this.allowedExtensions.includes(extension)) {
      throw new BadRequestException(`File extension '${extension}' is not allowed`);
    }
  }

  /**
   * Validate file signature (magic number)
   */
  private async validateFileSignature(file: Express.Multer.File): Promise<void> {
    // Use file-type library to determine file type from binary signature
    const fileTypeResult = await FileType.fromBuffer(file.buffer);

    // If file type couldn't be determined and we're enforcing mime types, reject
    if (!fileTypeResult && this.allowedMimeTypes.length > 0) {
      throw new BadRequestException('Could not determine file type');
    }

    // If file type was determined, check if the mime type is allowed
    if (fileTypeResult) {
      const detectedMimeType = fileTypeResult.mime;
      
      // If detected MIME type doesn't match the claimed type, that's suspicious
      if (detectedMimeType !== file.mimetype) {
        this.logger.warn(
          `MIME type mismatch: claimed ${file.mimetype}, detected ${detectedMimeType}`
        );
        throw new BadRequestException('File type mismatch');
      }

      // If we have a whitelist, check against it
      if (this.allowedMimeTypes.length > 0 && !this.allowedMimeTypes.includes(detectedMimeType)) {
        throw new BadRequestException(`File type '${detectedMimeType}' is not allowed`);
      }
    }
  }

  /**
   * Sanitize filename to prevent path traversal and other issues
   */
  sanitizeFilename(filename: string): string {
    // Remove any path components
    const basename = path.basename(filename);
    
    // Replace potentially problematic characters
    return basename
      .replace(/[/\\?%*:|"<>]/g, '_')  // Replace forbidden characters with underscore
      .replace(/\s+/g, '_');          // Replace spaces with underscore
  }
}
