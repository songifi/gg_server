// src/modules/file/file.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Body,
  Res,
  HttpStatus,
  Query,
  ParseFilePipeBuilder,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { 
  ApiTags, 
  ApiConsumes, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FileService } from './file.service';
import { FileUploadDto } from './dto/file-upload.dto';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FileController {
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(
    private readonly fileService: FileService,
    private readonly configService: ConfigService,
  ) {
    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE', 10 * 1024 * 1024);
    this.allowedMimeTypes = this.configService.get<string>('ALLOWED_MIME_TYPES', '')
      .split(',')
      .map(type => type.trim())
      .filter(Boolean);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file to a conversation' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload with conversation ID',
    type: FileUploadDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'File uploaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file or conversation',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentUser('sub') userId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })) // 10MB
        .build({
          fileIsRequired: true,
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        }),
    )
    file: Express.Multer.File,
    @Body() fileUploadDto: FileUploadDto,
  ) {
    const { conversationId, metadata } = fileUploadDto;
    const uploadedFile = await this.fileService.uploadFile(
      file,
      userId,
      conversationId,
      metadata ? JSON.parse(metadata) : {},
    );

    return {
      id: uploadedFile._id,
      filename: uploadedFile.originalName,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype,
      createdAt: uploadedFile.createdAt,
    };
  }

  @Get('conversation/:conversationId')
  @ApiOperation({ summary: 'Get all files in a conversation' })
  @ApiParam({ name: 'conversationId', description: 'ID of the conversation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved conversation files successfully',
  })
  async getConversationFiles(
    @CurrentUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    const files = await this.fileService.getConversationFiles(conversationId, userId);
    
    return files.map(file => ({
      id: file._id,
      filename: file.originalName,
      size: file.size,
      mimetype: file.mimetype,
      createdAt: file.createdAt,
      uploadedBy: file.uploadedBy,
    }));
  }

  @Get(':fileId')
  @ApiOperation({ summary: 'Get file metadata' })
  @ApiParam({ name: 'fileId', description: 'ID of the file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Retrieved file metadata successfully',
  })
  async getFileMetadata(
    @CurrentUser('sub') userId: string,
    @Param('fileId') fileId: string,
  ) {
    const file = await this.fileService.getFileMetadata(fileId, userId);
    
    return {
      id: file._id,
      filename: file.originalName,
      size: file.size,
      mimetype: file.mimetype,
      createdAt: file.createdAt,
      uploadedBy: file.uploadedBy,
      conversation: file.conversation,
      metadata: file.metadata,
    };
  }

  @Get(':fileId/download')
  @ApiOperation({ summary: 'Download a file' })
  @ApiParam({ name: 'fileId', description: 'ID of the file to download' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File stream',
  })
  async downloadFile(
    @CurrentUser('sub') userId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const { stream, file } = await this.fileService.getFileStream(fileId, userId);
    
    // Set headers
    res.setHeader('Content-Type', file.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    
    // Stream file to response
    stream.pipe(res);
  }

  @Delete(':fileId')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiParam({ name: 'fileId', description: 'ID of the file to delete' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'File deleted successfully',
  })
  async deleteFile(
    @CurrentUser('sub') userId: string,
    @Param('fileId') fileId: string,
  ) {
    await this.fileService.deleteFile(fileId, userId);
    return { success: true };
  }
}
