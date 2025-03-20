// src/modules/message/dto/create-message.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsMongoId, IsOptional, IsArray } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Hello, check out the attached file!',
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({
    description: 'ID of the conversation',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsNotEmpty()
  @IsMongoId()
  conversationId: string;

  @ApiProperty({
    description: 'IDs of files attached to this message',
    example: ['60d21b4667d0d8992e610c86', '60d21b4667d0d8992e610c87'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  attachments?: string[];
}

// src/modules/message/schemas/message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { Conversation } from '../../conversation/schemas/conversation.schema';
import { File } from '../../file/schemas/file.schema';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({
    type: String,
    required: true,
  })
  content: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  sender: User;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  })
  conversation: Conversation;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'File' }],
    default: [],
  })
  attachments: File[];

  @Prop({
    type: Date,
    default: Date.now,
  })
  createdAt: Date;

  @Prop({
    type: Object,
    default: {},
  })
  metadata: Record<string, any>;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Create indexes for common queries
MessageSchema.index({ conversation: 1, createdAt: 1 });
MessageSchema.index({ sender: 1, createdAt: -1 });

// src/modules/message/message.service.ts
// (Only showing the method that integrates with files)

/**
 * Create a new message with optional file attachments
 */
async createMessage(
  userId: string,
  createMessageDto: CreateMessageDto,
): Promise<Message> {
  const { content, conversationId, attachments } = createMessageDto;
  
  // Verify user is in conversation
  const isInConversation = await this.conversationService.isUserInConversation(
    conversationId,
    userId,
  );
  
  if (!isInConversation) {
    throw new ForbiddenException('You are not a member of this conversation');
  }

  // If attachments are provided, verify they exist and belong to this conversation
  if (attachments && attachments.length > 0) {
    const files = await this.fileModel.find({
      _id: { $in: attachments },
      conversation: conversationId,
      status: FileStatus.PROCESSED,
    });

    // Ensure all attachments were found
    if (files.length !== attachments.length) {
      throw new BadRequestException('One or more attachments are invalid');
    }
  }

  // Create and save the message
  const message = new this.messageModel({
    content,
    sender: userId,
    conversation: conversationId,
    attachments: attachments || [],
    createdAt: new Date(),
  });

  const savedMessage = await message.save();

  // Notify users in the conversation about the new message
  await this.notifyNewMessage(savedMessage);

  return savedMessage;
}
