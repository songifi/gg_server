// src/room/schemas/room.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RoomDocument = HydratedDocument<Room>;

@Schema({ timestamps: true })
export class Room {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  members!: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;
}

export const RoomSchema = SchemaFactory.createForClass(Room);
