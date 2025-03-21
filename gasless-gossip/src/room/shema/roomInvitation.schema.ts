

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { User } from 'src/user-reg/user-schema';
import { Room } from './room.schema';

export type InvitationDocument = RoomInvitationSchema & Document;

@Schema({ timestamps: true })
export class RoomInvitationSchema {
  @Prop({ type: String, ref: 'User', required: true })
  sender!: string;

  @Prop({ type: String, ref: 'User', required: true })
  recipient!: string;

  @Prop({ type: String, ref: 'Room', required: true })
  room!: string;

  @Prop({ default: 'pending' }) 
  status!: string;
}

export const InvitationSchema = SchemaFactory.createForClass(RoomInvitationSchema);