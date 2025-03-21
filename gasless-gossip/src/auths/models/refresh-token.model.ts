import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from 'src/modules/user/interfaces/user.interface';


export type RefreshTokenDocument = RefreshToken & Document;

@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ required: true })
  token!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId!: User;

  @Prop({ default: false })
  revoked!: boolean;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);