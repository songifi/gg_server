// src/group/group.service.ts

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { Invitation } from './entities/invitation.entity';
import { GroupSettings } from './entities/group-settings.entity';
import { User } from '../user/entities/user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupRole } from './enums/group-role.enum';
import { GroupEvent } from './enums/group-event.enum';
import { UpdateGroupSettingsDto } from './dto/update-group-settings.dto';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @InjectRepository(GroupSettings)
    private groupSettingsRepository: Repository<GroupSettings>,
    private eventEmitter: EventEmitter2,
  ) {}

  // CRUD Operations
  
  async create(createGroupDto: CreateGroupDto, creator: User): Promise<Group> {
    // Create the group
    const group = this.groupRepository.create({
      ...createGroupDto,
      createdBy: creator,
    });
    
    await this.groupRepository.save(group);
    
    // Create default group settings
    const settings = this.groupSettingsRepository.create({
      group,
      isPublic: createGroupDto.isPublic || false,
      joinRequiresApproval: true,
      maxMembers: 50,
    });
    
    await this.groupSettingsRepository.save(settings);
    
    // Add creator as admin
    await this.groupMemberRepository.save({
      group,
      user: creator,
      role: GroupRole.ADMIN,
    });
    
    // Emit group created event
    this.eventEmitter.emit(GroupEvent.CREATED, {
      groupId: group.id,
      createdBy: creator.id,
      timestamp: new Date(),
    });
    
    return group;
  }
  
  async findAll(user: User): Promise<Group[]> {
    // Find all groups the user is a member of
    const memberGroups = await this.groupMemberRepository.find({
      where: { user: { id: user.id } },
      relations: ['group'],
    });
    
    // Find all public groups
    const publicGroups = await this.groupRepository.createQueryBuilder('group')
      .innerJoin('group.settings', 'settings')
      .where('settings.isPublic = :isPublic', { isPublic: true })
      .getMany();
    
    // Combine and remove duplicates
    const memberGroupIds = memberGroups.map(membership => membership.group.id);
    const allGroups = [
      ...memberGroups.map(membership => membership.group),
      ...publicGroups.filter(group => !memberGroupIds.includes(group.id)),
    ];
    
    return allGroups;
  }
  
  async findOne(id: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['settings', 'members', 'members.user'],
    });
    
    if (!group) {
      throw new NotFoundException(`Group with ID "${id}" not found`);
    }
    
    return group;
  }
  
  async update(id: string, updateGroupDto: UpdateGroupDto, user: User): Promise<Group> {
    // Check permissions
    await this.checkPermission(id, user, [GroupRole.ADMIN]);
    
    const group = await this.findOne(id);
    
    // Update group properties
    Object.assign(group, updateGroupDto);
    
    await this.groupRepository.save(group);
    
    // Emit group updated event
    this.eventEmitter.emit(GroupEvent.UPDATED, {
      groupId: group.id,
      updatedBy: user.id,
      timestamp: new Date(),
    });
    
    return group;
  }
  
  async remove(id: string, user: User): Promise<void> {
    // Check permissions
    await this.checkPermission(id, user, [GroupRole.ADMIN]);
    
    const group = await this.findOne(id);
    
    // Delete all related entities (cascade should handle this but being explicit)
    await this.groupMemberRepository.delete({ group: { id } });
    await this.invitationRepository.delete({ group: { id } });
    await this.groupSettingsRepository.delete({ group: { id } });
    
    // Delete the group
    await this.groupRepository.remove(group);
    
    // Emit group deleted event
    this.eventEmitter.emit(GroupEvent.DELETED, {
      groupId: id,
      deletedBy: user.id,
      timestamp: new Date(),
    });
  }
  
  // Member Management
  
  async addMember(groupId: string, userId: string, role: GroupRole, addedBy: User): Promise<GroupMember> {
    // Check permissions (only admins can add members directly)
    await this.checkPermission(groupId, addedBy, [GroupRole.ADMIN]);
    
    const group = await this.findOne(groupId);
    
    // Check if member already exists
    const existingMember = await this.groupMemberRepository.findOne({
      where: {
        group: { id: groupId },
        user: { id: userId },
      },
    });
    
    if (existingMember) {
      throw new ForbiddenException('User is already a member of this group');
    }
    
    // Check max members limit
    const memberCount = await this.groupMemberRepository.count({
      where: { group: { id: groupId } },
    });
    
    const settings = await this.groupSettingsRepository.findOne({
      where: { group: { id: groupId } },
    });
    
    if (memberCount >= settings.maxMembers) {
      throw new ForbiddenException('Group has reached maximum member limit');
    }
    
    // Add the member
    const member = this.groupMemberRepository.create({
      group,
      user: { id: userId } as User,
      role,
    });
    
    await this.groupMemberRepository.save(member);
    
    // Emit member added event
    this.eventEmitter.emit(GroupEvent.MEMBER_ADDED, {
      groupId,
      userId,
      role,
      addedBy: addedBy.id,
      timestamp: new Date(),
    });
    
    return member;
  }
  
  async removeMember(groupId: string, userId: string, removedBy: User): Promise<void> {
    const group = await this.findOne(groupId);
    
    // User can remove themselves or admins can remove others
    const isSelfRemoval = userId === removedBy.id;
    
    if (!isSelfRemoval) {
      await this.checkPermission(groupId, removedBy, [GroupRole.ADMIN]);
    }
    
    // Prevent removing the last admin
    if (!isSelfRemoval) {
      const memberToRemove = await this.groupMemberRepository.findOne({
        where: {
          group: { id: groupId },
          user: { id: userId },
        },
      });
      
      if (memberToRemove?.role === GroupRole.ADMIN) {
        const adminCount = await this.groupMemberRepository.count({
          where: {
            group: { id: groupId },
            role: GroupRole.ADMIN,
          },
        });
        
        if (adminCount <= 1) {
          throw new ForbiddenException('Cannot remove the last admin from the group');
        }
      }
    }
    
    // Remove the member
    await this.groupMemberRepository.delete({
      group: { id: groupId },
      user: { id: userId },
    });
    
    // Emit member removed event
    this.eventEmitter.emit(GroupEvent.MEMBER_REMOVED, {
      groupId,
      userId,
      removedBy: removedBy.id,
      timestamp: new Date(),
    });
  }
  
  async updateMemberRole(groupId: string, userId: string, newRole: GroupRole, updatedBy: User): Promise<GroupMember> {
    // Check permissions
    await this.checkPermission(groupId, updatedBy, [GroupRole.ADMIN]);
    
    const group = await this.findOne(groupId);
    
    // Find the member
    const member = await this.groupMemberRepository.findOne({
      where: {
        group: { id: groupId },
        user: { id: userId },
      },
    });
    
    if (!member) {
      throw new NotFoundException(`User with ID "${userId}" is not a member of this group`);
    }
    
    // Prevent removing the last admin
    if (member.role === GroupRole.ADMIN && newRole !== GroupRole.ADMIN) {
      const adminCount = await this.groupMemberRepository.count({
        where: {
          group: { id: groupId },
          role: GroupRole.ADMIN,
        },
      });
      
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot remove the last admin from the group');
      }
    }
    
    // Update the role
    member.role = newRole;
    await this.groupMemberRepository.save(member);
    
    // Emit role updated event
    this.eventEmitter.emit(GroupEvent.ROLE_UPDATED, {
      groupId,
      userId,
      newRole,
      updatedBy: updatedBy.id,
      timestamp: new Date(),
    });
    
    return member;
  }
  
  // Invitation System
  
  async createInvitation(groupId: string, targetEmail: string, invitedBy: User): Promise<Invitation> {
    // Check permissions
    await this.checkPermission(groupId, invitedBy, [GroupRole.ADMIN, GroupRole.MODERATOR]);
    
    const group = await this.findOne(groupId);
    
    // Check if invitation already exists
    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        group: { id: groupId },
        email: targetEmail,
        expired: false,
      },
    });
    
    if (existingInvitation) {
      throw new ForbiddenException('Invitation already exists for this email');
    }
    
    // Create invitation with expiration date (48 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);
    
    const invitation = this.invitationRepository.create({
      group,
      email: targetEmail,
      invitedBy: invitedBy,
      token: this.generateToken(),
      expiresAt,
    });
    
    await this.invitationRepository.save(invitation);
    
    // Emit invitation created event
    this.eventEmitter.emit(GroupEvent.INVITATION_CREATED, {
      groupId,
      email: targetEmail,
      invitedBy: invitedBy.id,
      timestamp: new Date(),
    });
    
    return invitation;
  }
  
  async acceptInvitation(token: string, user: User): Promise<GroupMember> {
    // Find the invitation
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['group'],
    });
    
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    
    // Check if invitation is expired
    if (invitation.expired || invitation.expiresAt < new Date()) {
      invitation.expired = true;
      await this.invitationRepository.save(invitation);
      throw new ForbiddenException('Invitation has expired');
    }
    
    // Check if email matches
    if (invitation.email !== user.email) {
      throw new ForbiddenException('Invitation was sent to a different email address');
    }
    
    // Check if user is already a member
    const existingMember = await this.groupMemberRepository.findOne({
      where: {
        group: { id: invitation.group.id },
        user: { id: user.id },
      },
    });
    
    if (existingMember) {
      throw new ForbiddenException('You are already a member of this group');
    }
    
    // Add user to group with default role
    const member = await this.groupMemberRepository.save({
      group: invitation.group,
      user,
      role: GroupRole.MEMBER,
    });
    
    // Mark invitation as expired
    invitation.expired = true;
    await this.invitationRepository.save(invitation);
    
    // Emit invitation accepted event
    this.eventEmitter.emit(GroupEvent.INVITATION_ACCEPTED, {
      groupId: invitation.group.id,
      userId: user.id,
      timestamp: new Date(),
    });
    
    return member;
  }
  
  async cancelInvitation(invitationId: string, canceledBy: User): Promise<void> {
    // Find the invitation
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['group'],
    });
    
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    
    // Check permissions
    await this.checkPermission(invitation.group.id, canceledBy, [GroupRole.ADMIN, GroupRole.MODERATOR]);
    
    // Delete the invitation
    await this.invitationRepository.remove(invitation);
    
    // Emit invitation canceled event
    this.eventEmitter.emit(GroupEvent.INVITATION_CANCELED, {
      groupId: invitation.group.id,
      invitationId,
      canceledBy: canceledBy.id,
      timestamp: new Date(),
    });
  }
  
  // Group Settings
  
  async updateSettings(groupId: string, settingsDto: UpdateGroupSettingsDto, user: User): Promise<GroupSettings> {
    // Check permissions
    await this.checkPermission(groupId, user, [GroupRole.ADMIN]);
    
    const group = await this.findOne(groupId);
    
    // Find settings
    const settings = await this.groupSettingsRepository.findOne({
      where: { group: { id: groupId } },
    });
    
    if (!settings) {
      throw new NotFoundException('Group settings not found');
    }
    
    // Update settings
    Object.assign(settings, settingsDto);
    await this.groupSettingsRepository.save(settings);
    
    // Emit settings updated event
    this.eventEmitter.emit(GroupEvent.SETTINGS_UPDATED, {
      groupId,
      updatedBy: user.id,
      timestamp: new Date(),
    });
    
    return settings;
  }
  
  // Permission Checking
  
  async checkPermission(groupId: string, user: User, allowedRoles: GroupRole[]): Promise<boolean> {
    const membership = await this.groupMemberRepository.findOne({
      where: {
        group: { id: groupId },
        user: { id: user.id },
      },
    });
    
    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }
    
    return true;
  }
  
  async getMemberRole(groupId: string, userId: string): Promise<GroupRole | null> {
    const membership = await this.groupMemberRepository.findOne({
      where: {
        group: { id: groupId },
        user: { id: userId },
      },
    });
    
    return membership ? membership.role : null;
  }
  
  // Helper Methods
  
  private generateToken(): string {
    // Generate a random token
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}
