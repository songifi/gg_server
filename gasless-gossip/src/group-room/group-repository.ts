// src/group/repositories/group.repository.interface.ts

import { FilterQuery, QueryOptions } from 'mongoose';
import { BaseRepositoryInterface } from '../../common/repositories/base.repository.interface';
import { GroupDocument } from '../schemas/group.schema';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';

export interface GroupRepositoryInterface extends BaseRepositoryInterface<GroupDocument> {
  createGroup(createGroupDto: CreateGroupDto, userId: string): Promise<GroupDocument>;
  updateGroup(groupId: string, updateGroupDto: UpdateGroupDto): Promise<GroupDocument | null>;
  findGroups(filter?: FilterQuery<GroupDocument>, options?: QueryOptions): Promise<GroupDocument[]>;
  findPublicGroups(options?: QueryOptions): Promise<GroupDocument[]>;
  findGroupsByMember(userId: string, options?: QueryOptions): Promise<GroupDocument[]>;
  findGroupsByCreator(userId: string, options?: QueryOptions): Promise<GroupDocument[]>;
  findGroupsByTags(tags: string[], options?: QueryOptions): Promise<GroupDocument[]>;
  searchGroups(searchTerm: string, options?: QueryOptions): Promise<GroupDocument[]>;
  updateLastActivity(groupId: string): Promise<void>;
  archiveGroup(groupId: string): Promise<GroupDocument | null>;
  unarchiveGroup(groupId: string): Promise<GroupDocument | null>;
}

// src/group/repositories/group.repository.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, QueryOptions } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository';
import { GroupRepositoryInterface } from './group.repository.interface';
import { Group, GroupDocument } from '../schemas/group.schema';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';

@Injectable()
export class GroupRepository extends BaseRepository<GroupDocument> implements GroupRepositoryInterface {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>
  ) {
    super(groupModel);
  }

  async createGroup(createGroupDto: CreateGroupDto, userId: string): Promise<GroupDocument> {
    const group = new this.groupModel({
      ...createGroupDto,
      createdBy: userId,
      lastActivityAt: new Date()
    });
    return group.save();
  }

  async updateGroup(groupId: string, updateGroupDto: UpdateGroupDto): Promise<GroupDocument | null> {
    return this.findByIdAndUpdate(groupId, {
      ...updateGroupDto,
      lastActivityAt: new Date()
    });
  }

  async findGroups(filter?: FilterQuery<GroupDocument>, options?: QueryOptions): Promise<GroupDocument[]> {
    // Only return non-archived groups by default
    const mergedFilter = { isArchived: false, ...filter };
    return this.find(mergedFilter, options);
  }

  async findPublicGroups(options?: QueryOptions): Promise<GroupDocument[]> {
    return this.findGroups({ isPublic: true }, options);
  }

  async findGroupsByMember(userId: string, options?: QueryOptions): Promise<GroupDocument[]> {
    // This method will need to use the GroupMembershipRepository to first find all groups
    // the user is a member of, then fetch those groups
    // This will be implemented in the GroupService
    return [];
  }

  async findGroupsByCreator(userId: string, options?: QueryOptions): Promise<GroupDocument[]> {
    return this.findGroups({ createdBy: userId }, options);
  }

  async findGroupsByTags(tags: string[], options?: QueryOptions): Promise<GroupDocument[]> {
    return this.findGroups({ tags: { $in: tags } }, options);
  }

  async searchGroups(searchTerm: string, options?: QueryOptions): Promise<GroupDocument[]> {
    return this.findGroups(
      { $text: { $search: searchTerm } },
      { ...options, score: { $meta: 'textScore' } }
    );
  }

  async updateLastActivity(groupId: string): Promise<void> {
    await this.updateOne(
      { _id: groupId },
      { lastActivityAt: new Date() }
    );
  }

  async archiveGroup(groupId: string): Promise<GroupDocument | null> {
    return this.findByIdAndUpdate(groupId, { isArchived: true });
  }

  async unarchiveGroup(groupId: string): Promise<GroupDocument | null> {
    return this.findByIdAndUpdate(groupId, { isArchived: false });
  }
}
