// File: src/modules/users/entities/user.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Schema({
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      delete ret.__v;
      ret.id = ret._id;
      return ret;
    },
  },
})
export class User extends Document {
  @Prop({ required: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true, minlength: 3, maxlength: 30, unique: true })
  username: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  bio?: string;

  @Prop()
  avatarUrl?: string;

  @Prop()
  coverImageUrl?: string;

  @Prop({ type: String, enum: ['male', 'female', 'non-binary', 'prefer-not-to-say'], default: 'prefer-not-to-say' })
  gender?: string;

  @Prop()
  location?: string;

  @Prop()
  website?: string;

  @Prop()
  birthday?: Date;

  @Prop({ type: [String], default: [] })
  interests?: string[];

  @Prop({ type: String, enum: ['light', 'dark', 'system'], default: 'system' })
  theme?: string;

  @Prop({ type: String })
  walletAddress?: string;

  @Prop({ type: Boolean, default: false })
  isVerified: boolean;

  @Prop({ type: Date })
  lastActive?: Date;

  @Prop({ type: Object, default: {} })
  preferences?: Record<string, any>;

  @Prop({ type: Object, default: {} })
  socialLinks?: Record<string, string>;

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ walletAddress: 1 }, { sparse: true, unique: true });

// Pre-save hook to hash password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});