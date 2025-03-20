// src/modules/file/large-file.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { createReadStream, createWriteStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { join } from 'path';
import { File, FileStatus } from './schemas/file.schema';

const pipelineAsync = promisify(pipeline);

@Injectable()
export class LargeFileService {
  private readonly logger = new Logger(LargeFileService.name);
  private readonly chunkSize: number;
  private readonly tempDir: string;

  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<File>,
    private readonly configService: ConfigService,
  ) {
    this.chunkSize = this.configService.get<number>('UPLOAD_CHUNK_SIZE', 5 * 1024 * 1024); // 5MB default
    this.tempDir = this.configService.get<string>('TEMP_UPLOAD_DIR', './uploads/temp');
  }

  /**
   * Initialize a chunked upload
   */
  async initializeChunkedUpload(
    filename: string,
    mimetype: string,
    totalSize: number,
    userId: string,
    conversationId: string,
    metadata: Record<string, any> = {},
  ): Promise<{ uploadId: string; chunkSize: number }> {
    // Create file entry for tracking
    const fileDoc = new this.fileModel({
      originalName: filename,
      filename: `${Date.now()}_${filename}`, // Temporary name, will be replaced
      mimetype,
      size: totalSize,
      uploadedBy: userId,
      conversation: conversationId,
      path: join(this.tempDir, `${Date.now()}_${filename}.part`),
      status: FileStatus.PENDING,
      metadata: {
        ...metadata,
        chunkedUpload: true,
        chunksReceived: 0,
        totalChunks: Math.ceil(totalSize / this.chunkSize),
      },
    });

    await fileDoc.save();

    return {
      uploadId: fileDoc._id.toString(),
      chunkSize: this.chunkSize,
    };
  }

  /**
   * Upload a chunk of a large file
   */
  async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    totalChunks: number,
    chunkBuffer: Buffer,
  ): Promise<{ completed: boolean; progress: number }> {
    // Find the file upload record
    const fileDoc = await this.fileModel.findById(uploadId);
    if (!fileDoc) {
      throw new Error('Upload not found');
    }

    // Verify this is a chunked upload
    if (!fileDoc.metadata.chunkedUpload) {
      throw new Error('This is not a chunked upload');
    }

    // Calculate chunk position and append to file
    const position = chunkIndex * this.chunkSize;

    try {
      // Append chunk to file
      await this.appendChunkToFile(fileDoc.path, chunkBuffer, position);

      // Update metadata
      fileDoc.metadata.chunksReceived = (fileDoc.metadata.chunksReceived || 0) + 1;
      await fileDoc.save();

      const progress = (fileDoc.metadata.chunksReceived / totalChunks) * 100;
      const completed = fileDoc.metadata.chunksReceived >= totalChunks;

      // If upload is complete, finalize it
      if (completed) {
        await this.finalizeChunkedUpload(uploadId);
      }

      return {
        completed,
        progress,
      };
    } catch (error) {
      this.logger.error(`Error uploading chunk: ${error.message}`, error.stack);
      throw new Error(`Chunk upload failed: ${error.message}`);
    }
  }

  /**
   * Finalize a chunked upload
   */
  private async finalizeChunkedUpload(uploadId: string): Promise<void> {
    const fileDoc = await this.fileModel.findById(uploadId);
    if (!fileDoc) {
      throw new Error('Upload not found');
    }

    // Rename temporary file to final name
    const finalPath = join(
      this.configService.get<string>('FILE_UPLOAD_DIR', './uploads'),
      fileDoc.filename,
    );

    const fs = require('fs').promises;
    await fs.rename(fileDoc.path, finalPath);

    // Update file record
    fileDoc.path = finalPath;
    fileDoc.status = FileStatus.PROCESSED;
    await fileDoc.save();
  }

  /**
   * Append a chunk to a file at a specific position
   */
  private async appendChunkToFile(
    filePath: string,
    chunkBuffer: Buffer,
    position: number,
  ): Promise<void> {
    const fs = require('fs');
    
    // Create file if it doesn't exist
    if (!fs.existsSync(filePath)) {
      await fs.promises.writeFile(filePath, Buffer.alloc(0));
    }
    
    // Open file descriptor
    const fd = await fs.promises.open(filePath, 'r+');
    
    try {
      // Write chunk at position
      await fd.write(chunkBuffer, 0, chunkBuffer.length, position);
    } finally {
      // Close file descriptor
      await fd.close();
    }
  }
}
