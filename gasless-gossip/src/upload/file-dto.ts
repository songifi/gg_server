// src/modules/file/dto/file-upload.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsMongoId, IsOptional, IsString } from 'class-validator';

export class FileUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File to upload',
  })
  file: any;

  @ApiProperty({
    description: 'ID of the conversation to attach the file to',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsNotEmpty()
  @IsMongoId()
  conversationId: string;

  @ApiProperty({
    description: 'Optional metadata for the file (JSON string)',
    required: false,
    example: '{"description": "Project documentation", "tags": ["docs", "project"]}',
  })
  @IsOptional()
  @IsString()
  metadata?: string;
}

// src/modules/file/dto/file-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class FileResponseDto {
  @ApiProperty({
    description: 'ID of the file',
    example: '60d21b4667d0d8992e610c85',
  })
  id: string;

  @ApiProperty({
    description: 'Original name of the file',
    example: 'document.pdf',
  })
  filename: string;

  @ApiProperty({
    description: 'Size of the file in bytes',
    example: 1024000,
  })
  size: number;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf',
  })
  mimetype: string;

  @ApiProperty({
    description: 'Timestamp when the file was uploaded',
    example: '2023-06-24T12:34:56.789Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'ID of the user who uploaded the file',
    example: '60d21b4667d0d8992e610c86',
  })
  uploadedBy: string;
}

// src/modules/file/dto/file-metadata.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class FileMetadataDto extends FileResponseDto {
  @ApiProperty({
    description: 'ID of the conversation the file belongs to',
    example: '60d21b4667d0d8992e610c87',
  })
  conversation: string;

  @ApiProperty({
    description: 'Additional metadata associated with the file',
    example: {
      description: 'Project documentation',
      tags: ['docs', 'project'],
    },
    required: false,
  })
  metadata: Record<string, any>;
}
