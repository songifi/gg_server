// src/group/group.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { Invitation } from './entities/invitation.entity';
import { GroupSettings } from './entities/group-settings.entity';
import { GroupNotificationsService } from './group-notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMember, Invitation, GroupSettings]),
    EventEmitterModule.forRoot()
  ],
  controllers: [GroupController],
  providers: [GroupService, GroupNotificationsService],
  exports: [GroupService]
})
export class GroupModule {}
