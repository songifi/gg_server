port { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';


@Schema({ timestamps: true })
export class Conversation {
  @Prop({
    type: String,
    enum: Object.values(ConversationType),
    required: true
  })
  type: ConversationType;

  @Prop({
    type: String,
    required: function(this: ConversationDocument) {
      return this.type === ConversationType.GROUP;
    },
    trim: true,
    maxlength: 100
  })
  title?: string;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    validate: [
      {
        validator: function(this: ConversationDocument, participants: string[]) {
          if (this.type === ConversationType.DIRECT) {
            return participants.length === 2;
          }
          return participants.length >= 2;
        },
        message: 'Direct conversations must have exactly 2 participants, group conversations must have at least 2'
      }
    ],
    required: true
  })
  participants: User[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: function(this: ConversationDocument) {
      return this.type === ConversationType.GROUP;
    }
  })
  admin?: User;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date, default: Date.now })
  lastMessageAt: Date;
}

export type ConversationDocument = Conversation & Document;
export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Add indexes
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ admin: 1 });
ConversationSchema.index({ lastMessageAt: -1 });