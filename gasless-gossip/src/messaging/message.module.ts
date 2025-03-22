import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageController } from './controllers/message.controller';
import { ConversationController } from './controllers/conversation.controller';
import { MessageService } from './services/message.service';
import { ConversationService } from './services/conversation.service';
import { Message, MessageSchema } from './schemas/message.schema';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
  ],
  controllers: [MessageController, ConversationController],
  providers: [MessageService, ConversationService],
  exports: [MessageService, ConversationService],
})
export class MessagingModule {}
