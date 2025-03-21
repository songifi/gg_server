
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RoomDocument } from '../shema/room.schema';
import { Room } from '../shema/room.schema';
import { InvitationDocument } from '../shema/roomInvitation.schema';
import {  RoomInvitationSchema } from '../shema/roomInvitation.schema';
import { CreateRoomDto } from '../DTO/CreateRoomDto';
import { UpdateRoomDto } from '../DTO/UpdateRoomDto';
import { CreateRoomInvitationDto } from '../DTO/CreateRoomInvitationDto';

@Injectable()
export class RoomService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(RoomInvitationSchema.name) private invitationModel: Model<InvitationDocument>
  ) {}

  async createRoom(createRoomDto: CreateRoomDto, userId: string): Promise<Room> {
    const room = new this.roomModel({ ...createRoomDto, createdBy: userId });
    return await (room as RoomDocument).save();
  }

  async getAllRooms(): Promise<Room[]> {
    return this.roomModel.find().populate('members').exec();
  }

  async getRoomById(id: string): Promise<Room> {
    const room = await this.roomModel.findById(id).populate('members');
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async updateRoom(id: string, updateRoomDto: UpdateRoomDto): Promise<Room> {
    const updatedRoom = await this.roomModel.findByIdAndUpdate(id, updateRoomDto, { new: true });
    if (!updatedRoom) {
      throw new NotFoundException('Room not found');
    }
    return updatedRoom;
  }

  async deleteRoom(id: string): Promise<void> {
    await this.roomModel.findByIdAndDelete(id);
  }

  async addMember(roomId: string, userId: string): Promise<Room> {
    const room = await this.getRoomById(roomId) as RoomDocument;
    if (room.members.includes(new Types.ObjectId(userId))) {
      throw new BadRequestException('User is already a member');
    }
    room.members.push(new Types.ObjectId(userId));
    return await (room as RoomDocument).save();
  }

  async removeMember(roomId: string, userId: string): Promise<Room> {
    const room = await this.getRoomById(roomId);
    room.members = room.members.filter((id) => id.toString() !== userId);
    return await (room as RoomDocument).save();
  }

  async sendInvitation(createRoomInvitationDto: CreateRoomInvitationDto, invitedBy: string): Promise<RoomInvitationSchema> {
    const invitation = new this.invitationModel({ ...createRoomInvitationDto, invitedBy, status: 'pending' });
    return await invitation.save();
  }

  async acceptInvitation(id: string): Promise<Room> {
    const invitation = await this.invitationModel.findById(id);
    if (!invitation) throw new NotFoundException('Invitation not found');
    invitation.status = 'accepted';
    await invitation.save();
    return await this.addMember(invitation.get('roomId').toString(), invitation.get('invitedUser').toString());
  }

  async rejectInvitation(id: string): Promise<RoomInvitationSchema> {
    const invitation = await this.invitationModel.findById(id);
    if (!invitation) throw new NotFoundException('Invitation not found');
    invitation.status = 'rejected';
    return await invitation.save();
  }
}
