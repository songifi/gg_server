import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';
import { ReactionsGateway } from './reactions.gateway';
import { MessageReactionSchema } from './schemas/message-reaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MessageReaction', schema: MessageReactionSchema },
    ]),
  ],
  controllers: [ReactionsController],
  providers: [ReactionsService, ReactionsGateway],
  exports: [ReactionsService],
})
export class ReactionsModule {}