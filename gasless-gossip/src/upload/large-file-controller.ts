// src/modules/file/large-file.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  Param,
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
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LargeFileService } from './large-file.service';
import { InitChunkedUploadDto } from './dto/init-chunked-upload.dto';
import { UploadChunkDto } from './dto/upload-chunk.dto';

@ApiTags('large-files')
@Controller('large-files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LargeFileController {
  constructor(private readonly largeFileService: LargeFileService) {}

  @Post('init')
  @ApiOperation({ summary: 'Initialize a chunked file upload' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chunked upload initialized successfully',
  })
  async initializeChunkedUpload(
    @CurrentUser('sub') userId: string,
    @Body() initChunkedUploadDto: InitChunkedUploadDto,
  ) {
    const { filename, mimetype, totalSize, conversationId, metadata } = initChunkedUploadDto;
    
    const upload = await this.largeFileService.initializeChunkedUpload(
      filename,
      mimetype,
      totalSize,
      userId,
      conversationId,
      metadata,
    );

    return upload;
  }

  @Post(':uploadId/chunk/:chunkIndex')
  @ApiOperation({ summary: 'Upload a chunk of a large file' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'uploadId', description: 'ID of the initialized upload' })
  @ApiParam({ name: 'chunkIndex', description: 'Index of the chunk (starting from 0)' })
  @ApiBody({
    description: 'Chunk file upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        totalChunks: {
          type: 'number',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chunk uploaded successfully',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadChunk(
    @Param('uploadId') uploadId: string,
    @Param('chunkIndex') chunkIndex: number,
    @Body() uploadChunkDto: UploadChunkDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { totalChunks } = uploadChunkDto;
    
    const result = await this.largeFileService.uploadChunk(
      uploadId,
      chunkIndex,
      totalChunks,
      file.buffer,
    );

    return result;
  }
}

// src/modules/file/dto/init-chunked-upload.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsMongoId, IsOptional } from 'class-validator';

export class InitChunkedUploadDto {
  @ApiProperty({
    description: 'Original filename',
    example: 'large-video.mp4',
  })
  @IsNotEmpty()
  @IsString()
  filename: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'video/mp4',
  })
  @IsNotEmpty()
  @IsString()
  mimetype: string;

  @ApiProperty({
    description: 'Total size of the file in bytes',
    example: 104857600, // 100MB
  })
  @IsNotEmpty()
  @IsNumber()
  totalSize: number;

  @ApiProperty({
    description: 'ID of the conversation to attach the file to',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsNotEmpty()
  @IsMongoId()
  conversationId: string;

  @ApiProperty({
    description: 'Optional metadata for the file',
    required: false,
    example: { description: 'Project video presentation' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

// src/modules/file/dto/upload-chunk.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class UploadChunkDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Chunk of the file',
  })
  file: any;

  @ApiProperty({
    description: 'Total number of chunks in the file',
    example: 20,
  })
  @IsNotEmpty()
  @IsNumber()
  totalChunks: number;
}
