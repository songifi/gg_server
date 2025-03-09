import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './provider/chat.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
