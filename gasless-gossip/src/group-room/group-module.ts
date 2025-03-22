// src/group/group.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Group, GroupSchema } from './schemas/group.schema';
import { GroupMembership, GroupMembershipSchema } from './schemas/group-membership.schema';
import { GroupRepository } from './repositories/group.repository';
import { GroupMembershipRepository } from './repositories/group-membership.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: GroupMembership.name, schema: GroupMembershipSchema },
    ]),
  ],
  providers: [
    GroupRepository,
    GroupMembershipRepository,
  ],
  exports: [
    GroupRepository,
    GroupMembershipRepository,
  ],
})
export class GroupModule {}
