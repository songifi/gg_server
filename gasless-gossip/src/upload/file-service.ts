// src/modules/file/file.service.ts
import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { File, FileStatus } from './schemas/file.schema';
import { ConversationService } from '../conversation/conversation.service';

const pipelineAsync = promisify(pipeline);

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly uploadDir: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<File>,
    private readonly configService: ConfigService,
    private readonly conversationService: ConversationService,
  ) {
    // Initialize configuration
    this.uploadDir = this.configService.get<string>('FILE_UPLOAD_DIR', './uploads');
    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB default
    this.allowedMimeTypes = this.configService.get<string>('ALLOWED_MIME_TYPES', '')
      .split(',')
      .map(type => type.trim())
      .filter(Boolean);
    
    // Create upload directory if it doesn't exist
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload a file and save its metadata
   */
  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    conversationId: string,
    metadata: Record<string, any> = {},
  ): Promise<File> {
    // Validate file
    this.validateFile(file);

    // Verify user is part of conversation
    await this.verifyConversationAccess(userId, conversationId);

    // Generate secure filename
    const secureFilename = this.generateSecureFilename(file.originalname);
    const filePath = join(this.uploadDir, secureFilename);

    try {
      // Create file metadata entry
      const fileDoc = new this.fileModel({
        originalName: file.originalname,
        filename: secureFilename,
        mimetype: file.mimetype,
        size: file.size,
        uploadedBy: userId,
        conversation: conversationId,
        path: filePath,
        status: FileStatus.PENDING,
        metadata,
      });

      // Save file to disk
      await this.saveFileToDisk(file.buffer, filePath);

      // Update status to processed
      fileDoc.status = FileStatus.PROCESSED;
      await fileDoc.save();

      return fileDoc;
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`, error.stack);
      
      // Create file entry with error
      const fileDoc = new this.fileModel({
        originalName: file.originalname,
        filename: secureFilename,
        mimetype: file.mimetype,
        size: file.size,
        uploadedBy: userId,
        conversation: conversationId,
        path: filePath,
        status: FileStatus.FAILED,
        errorMessage: error.message,
        metadata,
      });
      
      await fileDoc.save();
      
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Stream a file for download
   */
  async getFileStream(fileId: string, userId: string): Promise<{ stream: NodeJS.ReadableStream; file: File }> {
    // Find file
    const file = await this.fileModel.findById(fileId);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Verify user access
    await this.verifyConversationAccess(userId, file.conversation.toString());

    // Check if file exists on disk
    if (!existsSync(file.path)) {
      throw new NotFoundException('File not found on disk');
    }

    // Create read stream
    const stream = createReadStream(file.path);

    return { stream, file };
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string, userId: string): Promise<File> {
    const file = await this.fileModel.findById(fileId);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Verify user access
    await this.verifyConversationAccess(userId, file.conversation.toString());

    return file;
  }

  /**
   * Get all files in a conversation
   */
  async getConversationFiles(conversationId: string, userId: string): Promise<File[]> {
    // Verify user access
    await this.verifyConversationAccess(userId, conversationId);

    return this.fileModel
      .find({ conversation: conversationId, status: FileStatus.PROCESSED })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await this.fileModel.findById(fileId);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Verify user is the uploader or has admin rights
    if (file.uploadedBy.toString() !== userId) {
      // Check if user is admin of the conversation
      const isAdmin = await this.conversationService.isConversationAdmin(
        file.conversation.toString(),
        userId
      );
      
      if (!isAdmin) {
        throw new ForbiddenException('You do not have permission to delete this file');
      }
    }

    // Delete file from disk if it exists
    if (existsSync(file.path)) {
      const fs = require('fs').promises;
      await fs.unlink(file.path);
    }

    // Delete metadata
    await this.fileModel.findByIdAndDelete(fileId);
  }

  /**
   * Validate file size and type
   */
  private validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds the limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check mime type if whitelist is specified
    if (this.allowedMimeTypes.length > 0 && !this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }

    // Additional security checks could be implemented here
    // For example, scanning for viruses or validating file content
  }

  /**
   * Generate a secure filename to prevent path traversal attacks
   */
  private generateSecureFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = extname(originalFilename);
    
    // Create hash from original filename + timestamp + random string
    const hash = createHash('sha256')
      .update(`${originalFilename}_${timestamp}_${randomString}`)
      .digest('hex');
    
    return `${hash}${fileExtension}`;
  }

  /**
   * Save file buffer to disk
   */
  private async saveFileToDisk(buffer: Buffer, filepath: string): Promise<void> {
    const writeStream = createWriteStream(filepath);
    const bufferStream = require('stream').Readable.from(buffer);
    
    try {
      await pipelineAsync(bufferStream, writeStream);
    } catch (error) {
      this.logger.error(`Error saving file to disk: ${error.message}`, error.stack);
      throw new Error('Failed to save file to disk');
    }
  }

  /**
   * Verify user has access to conversation
   */
  private async verifyConversationAccess(userId: string, conversationId: string): Promise<void> {
    const hasAccess = await this.conversationService.isUserInConversation(
      conversationId,
      userId
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this conversation');
    }
  }
}
