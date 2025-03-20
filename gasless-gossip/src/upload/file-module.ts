// src/modules/file/file.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { FileService } from './file.service';
import { FileController } from './file.controller';
import { File, FileSchema } from './schemas/file.schema';
import { ConversationModule } from '../conversation/conversation.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: File.name, schema: FileSchema },
    ]),
    MulterModule.register({
      storage: memoryStorage(), // Use memory storage for security and processing
    }),
    ConfigModule,
    ConversationModule,
  ],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
