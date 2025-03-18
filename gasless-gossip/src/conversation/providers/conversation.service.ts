// import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { CreateDirectConversationDto } from '../dtos/direct-conversation.dto';
// import { ConversationResponseDto } from '../dtos/conversation-response.dto';
// import { CreateGroupConversationDto } from '../dtos/creategroup-conversation.dto';
// import { UpdateGroupConversationDto } from '../dtos/updategroup-conversation';
// import { CreateUserDto } from 'src/users/dto/create-user.dto';
// import { UsersService } from 'src/users/provider/users.service';
// import { Conversation, ConversationDocument } from '../schema/conversation.schema';
// import { ConversationType } from '../enums/conversation.enum';

// @Injectable()
// export class ConversationService {
//   constructor(
//     @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
//     private readonly usersService: UsersService,
//   ) {}

//   /**
//    * Create a direct conversation between two users
//    */
//   async createDirectConversation(
//     dto: CreateDirectConversationDto,
//   ): Promise<ConversationResponseDto> {
//     // Validate the participants are different
//     if (dto.participants[0] === dto.participants[1]) {
//       throw new BadRequestException('Participants must be different users');
//     }

//     // Check if users exist
//     await this.validateUsersExist(dto.participants);

//     // Check if conversation already exists
//     const existingConversation = await this.conversationModel.findOne({
//       type: ConversationType.DIRECT,
//       participants: { $all: dto.participants, $size: 2 },
//     });

//     if (existingConversation) {
//       return this.conversationToDto(existingConversation);
//     }

//     // Create new direct conversation
//     const conversation = new this.conversationModel({
//       type: ConversationType.DIRECT,
//       participants: dto.participants,
//     });

//     await conversation.save();
//     return this.conversationToDto(conversation);
//   }

//   /**
//    * Create a group conversation
//    */
//   async createGroupConversation(dto: CreateGroupConversationDto): Promise<ConversationResponseDto> {
//     // Check if admin is in participants
//     if (!dto.participants.includes(dto.admin)) {
//       throw new BadRequestException('Admin must be one of the participants');
//     }

//     // Check if all users exist
//     await this.validateUsersExist(dto.participants);

//     // Create new group conversation
//     const conversation = new this.conversationModel({
//       type: ConversationType.GROUP,
//       title: dto.title,
//       participants: dto.participants,
//       admin: dto.admin,
//     });

//     await conversation.save();
//     return this.conversationToDto(conversation);
//   }

//   /**
//    * Update a group conversation
//    */
//   async updateGroupConversation(
//     id: string,
//     dto: UpdateGroupConversationDto,
//   ): Promise<ConversationResponseDto> {
//     const conversation = await this.conversationModel.findById(id);

//     if (!conversation) {
//       throw new NotFoundException('Conversation not found');
//     }

//     if (conversation.type !== ConversationType.GROUP) {
//       throw new BadRequestException(
//         'Cannot update direct conversation with group conversation data',
//       );
//     }

//     // Update fields if provided
//     if (dto.title !== undefined) conversation.title = dto.title;
//     if (dto.admin !== undefined) conversation.admin = dto.admin;
//     if (dto.isActive !== undefined) conversation.isActive = dto.isActive;

//     // Handle participants update separately
//     if (dto.participants) {
//       // Check if all users exist
//       await this.validateUsersExist(dto.participants);

//       conversation.participants = dto.participants as any;

//       // Ensure admin is still in participants
//       const adminId = dto.admin || conversation.admin?.toString();
//       if (!dto.participants.includes(adminId)) {
//         throw new BadRequestException('Admin must be a participant');
//       }
//     }

//     await conversation.save();
//     return this.conversationToDto(conversation);
//   }

//   /**
//    * Get a conversation by ID
//    */
//   async getConversationById(id: string): Promise<ConversationResponseDto> {
//     const conversation = await this.conversationModel
//       .findById(id)
//       .populate('participants', 'username avatarUrl')
//       .populate('admin', 'username avatarUrl');

//     if (!conversation) {
//       throw new NotFoundException('Conversation not found');
//     }

//     return this.conversationToDto(conversation);
//   }

//   /**
//    * Get all conversations for a user
//    */
//   async getUserConversations(userId: string): Promise<ConversationResponseDto[]> {
//     const conversations = await this.conversationModel
//       .find({
//         participants: userId,
//         isActive: true,
//       })
//       .sort({ lastMessageAt: -1 })
//       .populate('participants', 'username avatarUrl')
//       .populate('admin', 'username avatarUrl');

//     return conversations.map((conversation) => this.conversationToDto(conversation));
//   }

//   /**
//    * Add a user to a group conversation
//    */
//   async addUserToGroupConversation(
//     conversationId: string,
//     userId: string,
//   ): Promise<ConversationResponseDto> {
//     const conversation = await this.conversationModel.findById(conversationId);

//     if (!conversation) {
//       throw new NotFoundException('Conversation not found');
//     }

//     if (conversation.type !== ConversationType.GROUP) {
//       throw new BadRequestException('Cannot add users to direct conversations');
//     }

//     // Check if user exists
//     await this.validateUsersExist([userId]);

//     // Check if user is already in the conversation
//     if (conversation.participants.includes(userId as any)) {
//       throw new BadRequestException('User is already in this conversation');
//     }

//     // Add user to participants
//     conversation.participants.push(userId as any);
//     await conversation.save();

//     return this.conversationToDto(conversation);
//   }

//   /**
//    * Remove a user from a group conversation
//    */
//   async removeUserFromGroupConversation(
//     conversationId: string,
//     userId: string,
//   ): Promise<ConversationResponseDto> {
//     const conversation = await this.conversationModel.findById(conversationId);

//     if (!conversation) {
//       throw new NotFoundException('Conversation not found');
//     }

//     if (conversation.type !== ConversationType.GROUP) {
//       throw new BadRequestException('Cannot remove users from direct conversations');
//     }

//     // Check if user is admin
//     if (conversation.admin.toString() === userId) {
//       throw new BadRequestException('Cannot remove admin from conversation');
//     }

//     // Check if user is in the conversation
//     if (!conversation.participants.includes(userId as any)) {
//       throw new BadRequestException('User is not in this conversation');
//     }

//     // Remove user from participants
//     conversation.participants = conversation.participants.filter(
//       (participant) => participant.toString() !== userId,
//     ) as any;

//     // Ensure there are still at least 2 participants
//     if (conversation.participants.length < 2) {
//       throw new BadRequestException('Group conversation must have at least 2 participants');
//     }

//     await conversation.save();
//     return this.conversationToDto(conversation);
//   }

//   /**
//    * Helper method to validate users exist
//    */
//   private async validateUsersExist(userIds: string[]): Promise<void> {
//     const userCount = 5;
//     //  await this.usersService.countUsersByIds(userIds);

//     if (userCount !== userIds.length) {
//       throw new BadRequestException('One or more users do not exist');
//     }
//   }

//   /**
//    * Helper method to convert MongoDB document to DTO
//    */
//   private conversationToDto(conversation: ConversationDocument): ConversationResponseDto {
//     const Participants: CreateUserDto[] = (
//       conversation.populated('participants') ? conversation.participants : []
//     ).map((participant) => ({
//       id: participant._id.toString(),
//       username: participant.username,
//       avatarUrl: participant.avatarUrl,
//     }));

//     let admin: CreateUserDto | undefined = undefined;
//     if (conversation.type === ConversationType.GROUP && conversation.populated('admin')) {
//       admin = {
//         id: conversation.admin.id.toString(),
//         username: conversation.admin.username,
//         avatarUrl: conversation.admin.avatarUrl,
//       };
//     }

//     return {
//       id: conversation._id.toString(),
//       type: conversation.type,
//       title: conversation.title,
//       participants,
//       admin,
//       createdAt: conversation.createdAt,
//       updatedAt: conversation.updatedAt,
//       lastMessageAt: conversation.lastMessageAt,
//       isActive: conversation.isActive,
//     };
//   }
// }
