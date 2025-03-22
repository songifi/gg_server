// src/group/group-notifications.service.ts

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GroupEvent } from './enums/group-event.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { User } from '../user/entities/user.entity';
// We're assuming you have a notification service, if not create one
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class GroupNotificationsService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
    private notificationService: NotificationService
  ) {}

  @OnEvent(GroupEvent.CREATED)
  async handleGroupCreated(payload: { groupId: string; createdBy: string; timestamp: Date }) {
    const group = await this.groupRepository.findOne({
      where: { id: payload.groupId },
      relations: ['createdBy'],
    });

    if (!group) return;

    // Nothing to notify here since creator already knows they created the group
    // But you might want to add analytics or logging
    console.log(`Group ${group.name} created by ${group.createdBy.email}`);
  }

  @OnEvent(GroupEvent.UPDATED)
  async handleGroupUpdated(payload: { groupId: string; updatedBy: string; timestamp: Date }) {
    const group = await this.groupRepository.findOne({
      where: { id: payload.groupId },
    });

    if (!group) return;

    // Notify all members about the group update
    const members = await this.groupMemberRepository.find({
      where: { group: { id: payload.groupId } },
      relations: ['user'],
    });

    for (const member of members) {
      if (member.user.id !== payload.updatedBy) {
        await this.notificationService.createNotification({
          userId: member.user.id,
          type: 'GROUP_UPDATED',
          title: 'Group Updated',
          message: `The group "${group.name}" has been updated`,
          data: { groupId: group.id }
        });
      }
    }
  }

  @OnEvent(GroupEvent.DELETED)
  async handleGroupDeleted(payload: { groupId: string; deletedBy: string; timestamp: Date }) {
    // We need to retrieve members before the group is deleted
    const members = await this.groupMemberRepository.find({
      where: { group: { id: payload.groupId } },
      relations: ['user', 'group'],
    });

    if (!members.length) return;

    const groupName = members[0].group.name;

    // Notify all members about the group deletion
    for (const member of members) {
      if (member.user.id !== payload.deletedBy) {
        await this.notificationService.createNotification({
          userId: member.user.id,
          type: 'GROUP_DELETED',
          title: 'Group Deleted',
          message: `The group "${groupName}" has been deleted`,
          data: { groupId: payload.groupId }
        });
      }
    }
  }

  @OnEvent(GroupEvent.MEMBER_ADDED)
  async handleMemberAdded(payload: { groupId: string; userId: string; role: string; addedBy: string; timestamp: Date }) {
    const group = await this.groupRepository.findOne({
      where: { id: payload.groupId },
    });

    if (!group) return;

    // Notify the new member
    await this.notificationService.createNotification({
      userId: payload.userId,
      type: 'GROUP_JOINED',
      title: 'Added to Group',
      message: `You have been added to the group "${group.name}"`,
      data: { groupId: group.id }
    });

    // Notify admins and moderators
    const adminMembers = await this.groupMemberRepository.find({
      where: [
        { group: { id: payload.groupId }, role: 'admin' },
        { group: { id: payload.groupId }, role: 'moderator' }
      ],
      relations: ['user'],
    });

    for (const admin of adminMembers) {
      if (admin.user.id !== payload.addedBy) {
        await this.notificationService.createNotification({
          userId: admin.user.id,
          type: 'GROUP_MEMBER_ADDED',
          title: 'New Group Member',
          message: `A new member has been added to the group "${group.name}"`,
          data: { groupId: group.id, userId: payload.userId }
        });
      }
    }
  }

  @OnEvent(GroupEvent.MEMBER_REMOVED)
  async handleMemberRemoved(payload: { groupId: string; userId: string; removedBy: string; timestamp: Date }) {
    const group = await this.groupRepository.findOne({
      where: { id: payload.groupId },
    });

    if (!group) return;

    // If member removed themselves, no need to notify them
    if (payload.userId !== payload.removedBy) {
      // Notify the removed member
      await this.notificationService.createNotification({
        userId: payloa