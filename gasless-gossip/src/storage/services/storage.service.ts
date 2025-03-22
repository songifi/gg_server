// File: src/modules/storage/services/storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

@Injectable()
export class StorageService {
  private s3: AWS.S3;
  private readonly logger = new Logger(StorageService.name);
  private readonly bucketRegion: string;

  constructor(private readonly configService: ConfigService) {
    // Initialize S3 client
    this.bucketRegion = this.configService.get<string>('AWS_REGION', 'us-east-1');

    this.s3 = new AWS.S3({
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      region: this.bucketRegion,
    });
  }

  /**
   * Upload file to S3
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string,
    bucketName: string,
  ): Promise<string> {
    try {
      const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'public-read',
      };

      const result = await this.s3.upload(params).promise();
      this.logger.log(`File uploaded successfully to ${result.Location}`);
      
      return result.Location;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract bucket name and key from URL
      const parsedUrl = new URL(fileUrl);
      const pathname = parsedUrl.pathname;
      
      // URL format is /{bucket-name}/{key}
      const pathParts = pathname.split('/').filter(Boolean);
      const bucketName = pathParts[0];
      const key = pathParts.slice(1).join('/');

      const params = {
        Bucket: bucketName,
        Key: key,
      };

      await this.s3.deleteObject(params).promise();
      this.logger.log(`File deleted successfully: ${fileUrl}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}
