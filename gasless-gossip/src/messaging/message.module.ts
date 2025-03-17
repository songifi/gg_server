import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageRepository } from './messageRepository/message.Respository';
import { MessageDocument } from './schemas/message.schema';
import { MessageSchema } from './schemas/message.schema';
import { MessageService } from './providers/message.Service';
import { MessageController } from './message.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: MessageDocument.name, schema: MessageSchema }])],
  controllers: [MessageController],
  providers: [MessageService, MessageRepository],
})
export class MessageModule {}
