// import  { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { ConversationController } from './conversation.controller';

// import { UsersModule } from '../users/users.module';
// import { ConversationService } from './providers/conversation.service';
// import { Conversation, ConversationSchema } from './schema/conversation.schema';

// @Module({
//   imports: [
//     MongooseModule.forFeature([
//       { name: Conversation.name, schema: ConversationSchema }
//     ]),
//     UsersModule,
//   ],
//   controllers: [ConversationController],
//   providers: [ConversationService],
//   exports: [ConversationService]
// })
// export class ConversationModule {}
