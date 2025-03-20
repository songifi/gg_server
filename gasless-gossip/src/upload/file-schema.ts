// src/modules/file/schemas/file.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { Conversation } from '../../conversation/schemas/conversation.schema';

export enum FileStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class File extends Document {
  @Prop({
    type: String,
    required: true,
  })
  originalName: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
  })
  filename: string;

  @Prop({
    type: String,
    required: true,
  })
  mimetype: string;

  @Prop({
    type: Number,
    required: true,
  })
  size: number;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  uploadedBy: User;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  })
  conversation: Conversation;

  @Prop({
    type: String,
    required: true,
  })
  path: string;

  @Prop({
    type: String,
    enum: Object.values(FileStatus),
    default: FileStatus.PENDING,
  })
  status: FileStatus;

  @Prop({
    type: String,
    default: null,
  })
  errorMessage: string;

  @Prop({
    type: Date,
    default: Date.now,
  })
  createdAt: Date;

  @Prop({
    type: Date,
    default: Date.now,
  })
  updatedAt: Date;

  @Prop({
    type: Object,
    default: {},
  })
  metadata: Record<string, any>;
}

export const FileSchema = SchemaFactory.createForClass(File);

// Create indexes for common queries
FileSchema.index({ conversation: 1, createdAt: -1 });
FileSchema.index({ uploadedBy: 1, createdAt: -1 });
