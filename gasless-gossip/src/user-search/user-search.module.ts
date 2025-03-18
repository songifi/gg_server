import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserSchema } from '../user/schemas/user.schema';
import { ContactSchema } from '../contacts/schemas/contact.schema';
import { UserSearchController } from './user-search.controller';
import { UserSearchService } from './user-search.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Contact', schema: ContactSchema },
    ]),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
  ],
  controllers: [UserSearchController],
  providers: [UserSearchService],
  exports: [UserSearchService],
})
export class UserSearchModule {}