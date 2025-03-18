import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ReputationSettingsDocument extends Document {
  @Prop({
    type: {
      messageActivity: { type: Number, default: 20 },
      tokenTransfers: { type: Number, default: 20 },
      challengeCompletion: { type: Number, default: 15 },
      peerRatings: { type: Number, default: 20 },
      accountAge: { type: Number, default: 5 },
      contentQuality: { type: Number, default: 10 },
      achievementPoints: { type: Number, default: 10 }
    }
  })
  factorWeights: {
    messageActivity: number;
    tokenTransfers: number;
    challengeCompletion: number;
    peerRatings: number;
    accountAge: number;
    contentQuality: number;
    achievementPoints: number;
  };

  @Prop({
    type: {
      newcomer: { type: Number, default: 0 },
      regular: { type: Number, default: 100 },
      established: { type: Number, default: 300 },
      trusted: { type: Number, default: 600 },
      veteran: { type: Number, default: 1000 },
      elite: { type: Number, default: 2000 }
    }
  })
  levelThresholds: {
    newcomer: number;
    regular: number;
    established: number;
    trusted: number;
    veteran: number;
    elite: number;
  };

  @Prop({ default: true })
  decayEnabled: boolean;

  @Prop({ default: 1 })
  decayRate: number;

  @Prop({ default: 5000 })
  maxScore: number;

  @Prop({ default: 0 })
  minScore: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const ReputationSettingsSchema = SchemaFactory.createForClass(ReputationSettingsDocument);
