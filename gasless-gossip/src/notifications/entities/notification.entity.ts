// File: src/modules/notifications/entities/notification.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { NotificationType } from '../interfaces/notification-type.enum';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ 
    required: true, 
    type: String, 
    enum: NotificationType 
  })
  type: NotificationType;

  @Prop({ 
    required: true, 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'User',
    index: true
  })
  recipientId: MongooseSchema.Types.ObjectId;

  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'User' 
  })
  senderId?: MongooseSchema.Types.ObjectId;

  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'Conversation' 
  })
  conversationId?: MongooseSchema.Types.ObjectId;

  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'Message' 
  })
  messageId?: MongooseSchema.Types.ObjectId;

  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'Transaction' 
  })
  transactionId?: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, type: String })
  title: string;

  @Prop({ required: true, type: String })
  content: string;

  @Prop({ type: Object })
  data?: Record<string, any>;

  @Prop({ 
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  })
  priority: string;

  @Prop({ default: false })
  read: boolean;

  @Prop()
  readAt?: Date;

  @Prop({ default: false })
  deleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop()
  expiresAt?: Date;

  @Prop()
  clickAction?: string;

  @Prop()
  imageUrl?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Create indexes for efficient querying
NotificationSchema.index({ recipientId: 1, read: 1 });
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, type: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for expiring notifications