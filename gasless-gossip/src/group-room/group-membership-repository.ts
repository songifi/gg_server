// src/group/repositories/group-membership.repository.interface.ts

import { FilterQuery, QueryOptions } from 'mongoose';
import { BaseRepositoryInterface } from '../../common/repositories/base.repository.interface';
import { GroupMembershipDocument, GroupRole } from '../schemas/group-membership.schema';

export interface GroupMembershipRepositoryInterface extends BaseRepositoryInterface<GroupMembershipDocument> {
  addMember(groupId: string, userId: string, role?: GroupRole): Promise<GroupMembershipDocument>;
  removeMember(groupId: string, userId: string): Promise<boolean>;
  updateMemberRole(groupId: string, userId: string, role: GroupRole): Promise<GroupMembershipDocument | null>;
  findGroupMembers(groupId: string, options?: QueryOptions): Promise<GroupMembershipDocument[]>;
  findUserGroups(userId: string, options?: QueryOptions): Promise<GroupMembershipDocument[]>;
  findMembership(groupId: string, userId: string): Promise<GroupMembershipDocument | null>;
  findGroupMembersByRole(groupId: string, role: GroupRole, options?: QueryOptions): Promise<GroupMembershipDocument[]>;
  countGroupMembers(groupId: string): Promise<number>;
  toggleMute(groupId: string, userId: string, isMuted: boolean): Promise<GroupMembershipDocument | null>;
  toggleNotifications(groupId: string, userId: string, notifications: boolean): Promise<GroupMembershipDocument | null>;
  updateLastReadMessage(groupId: string, userId: string, timestamp: Date): Promise<GroupMembershipDocument | null>;
  isGroupMember(groupId: string, userId: string): Promise<boolean>;
  hasRole(groupId: string, userId: string, roles: GroupRole[]): Promise<boolean>;
}

// src/group/repositories/group-membership.repository.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, QueryOptions } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository';
import { GroupMembershipRepositoryInterface } from './group-membership.repository.interface';
import { GroupMembership, GroupMembershipDocument, GroupRole } from '../schemas/group-membership.schema';

@Injectable()
export class GroupMembershipRepository extends BaseRepository<GroupMembershipDocument> implements GroupMembershipRepositoryInterface {
  constructor(
    @InjectModel(GroupMembership.name) private membershipModel: Model<GroupMembershipDocument>
  ) {
    super(membershipModel);
  }

  async addMember(groupId: string, userId: string, role: GroupRole = GroupRole.MEMBER): Promise<GroupMembershipDocument> {
    const membership = new this.membershipModel({
      group: groupId,
      user: userId,
      role,
      joinedAt: new Date()
    });
    
    return membership.save();
  }

  async removeMember(groupId: string, userId: string): Promise<boolean> {
    return this.deleteOne({ group: groupId, user: userId });
  }

  async updateMemberRole(groupId: string, userId: string, role: GroupRole): Promise<GroupMembershipDocument | null> {
    return this.findOneAndUpdate(
      { group: groupId, user: userId },
      { role }
    );
  }

  async findGroupMembers(groupId: string, options?: QueryOptions): Promise<GroupMembershipDocument[]> {
    return this.find({ group: groupId }, options);
  }

  async findUserGroups(userId: string, options?: QueryOptions): Promise<GroupMembershipDocument[]> {
    return this.find({ user: userId }, options);
  }

  async findMembership(groupId: string, userId: string): Promise<GroupMembershipDocument | null> {
    return this.findOne({ group: groupId, user: userId });
  }

  async findGroupMembersByRole(groupId: string, role: GroupRole, options?: QueryOptions): Promise<GroupMembershipDocument[]> {
    return this.find({ group: groupId, role }, options);
  }

  async countGroupMembers(groupId: string): Promise<number> {
    return this.count({ group: groupId });
  }

  async toggleMute(groupId: string, userId: string, isMuted: boolean): Promise<GroupMembershipDocument | null> {
    return this.findOneAndUpdate(
      { group: groupId, user: userId },
      { isMuted }
    );
  }

  async toggleNotifications(groupId: string, userId: string, notifications: boolean): Promise<GroupMembershipDocument | null> {
    return this.findOneAndUpdate(
      { group: groupId, user: userId },
      { notifications }
    );
  }

  async updateLastReadMessage(groupId: string, userId: string, timestamp: Date): Promise<GroupMembershipDocument | null> {
    return this.findOneAndUpdate(
      { group: groupId, user: userId },
      { lastReadMessageAt: timestamp }
    );
  }

  async isGroupMember(groupId: string, userId: string): Promise<boolean> {
    const count = await this.count({ group: groupId, user: userId });
    return count > 0;
  }

  async hasRole(groupId: string, userId: string, roles: GroupRole[]): Promise<boolean> {
    const count = await this.count({ 
      group: groupId, 
      user: userId,
      role: { $in: roles }
    });
    return count > 0;
  }

  // Helper method to find and update in one operation
  private async findOneAndUpdate(filter: FilterQuery<GroupMembershipDocument>, update: any): Promise<GroupMembershipDocument | null> {
    return this.membershipModel.findOneAndUpdate(
      filter,
      update,
      { new: true }
    ).exec();
  }
}
