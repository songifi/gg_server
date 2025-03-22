import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

@Schema({ timestamps: true })
export class Message {
  @ApiProperty({ description: 'The sender user ID' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  sender: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'The recipient user ID' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  recipient: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'The conversation this message belongs to' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', required: true })
  conversation: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Message content' })
  @Prop({ required: true })
  content: string;

  @ApiProperty({ enum: MessageStatus, description: 'Current status of the message' })
  @Prop({ type: String, enum: MessageStatus, default: MessageStatus.SENT })
  status: MessageStatus;

  @ApiProperty({ description: 'When the message was delivered' })
  @Prop()
  deliveredAt?: Date;

  @ApiProperty({ description: 'When the message was read' })
  @Prop()
  readAt?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export type MessageDocument = Message & Document;
export const MessageSchema = SchemaFactory.createForClass(Message);
