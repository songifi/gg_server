import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true })
export class Conversation {
  @ApiProperty({ description: 'Participants in the conversation' })
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], required: true })
  participants: MongooseSchema.Types.ObjectId[];

  @ApiProperty({ description: 'Optional conversation title' })
  @Prop()
  title?: string;

  @ApiProperty({ description: 'Last message in the conversation' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  lastMessage?: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export type ConversationDocument = Conversation & Document;
export const ConversationSchema = SchemaFactory.createForClass(Conversation);
