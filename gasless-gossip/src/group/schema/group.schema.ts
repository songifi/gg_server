import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { GroupPrivacy, MemberRole } from "../enums/group.enum";
import { Types } from "mongoose";

/**
 * Mongoose schema representing a Group in the Gasless Gossip application.
 */
@Schema({ timestamps: true })
export class Group extends Document {
  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop()
  avatar?: string;

  @Prop({ type: String, enum: GroupPrivacy, default: GroupPrivacy.PUBLIC })
  privacy!: GroupPrivacy;

  @Prop({ type: [{ userId: Types.ObjectId, role: { type: String, enum: MemberRole } }], default: [] })
  members!: { userId: Types.ObjectId; role: MemberRole }[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Message' }], default: [] })
  messages!: Types.ObjectId[];
}

export const GroupSchema = SchemaFactory.createForClass(Group);
