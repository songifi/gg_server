import {Controller,
        Get, Post, 
        Put, Delete, 
        Body, Param, 
        Req, UseGuards 
  } from '@nestjs/common';
import { Request } from 'express';

interface CustomUser {
  id: string;
}

interface CustomRequest extends Request {
  user?: CustomUser;
}
  import { ApiTags, ApiOperation } from '@nestjs/swagger';
  import { RoomService } from './provider/room.service';
  import { CreateRoomInvitationDto } from './DTO/CreateRoomInvitationDto';
  import { UpdateRoomDto } from './DTO/UpdateRoomDto';
  import { CreateRoomDto } from './DTO/CreateRoomDto';
  import { AuthGuard } from '../auth/auth.guard';
  
  @ApiTags('Rooms')
  @Controller('rooms')
  @UseGuards(AuthGuard)
  export class RoomController {
    constructor(
    private readonly roomService: RoomService,
    ) {}
    
    @ApiOperation({ summary: 'Create a new room' })
    @Post()
    async createRoom(@Body() createRoomDto: CreateRoomDto, @Req() req: Request) {
      const user = req.user as { id: string }; 
      if (!user || !user.id) {
        throw new Error('User information is missing in the request');
      }
      return this.roomService.createRoom(createRoomDto, user.id);
    }
  
    @ApiOperation({ summary: 'Get all rooms' })
    @Get()
    async getAllRooms() {
      return this.roomService.getAllRooms();
    }
  
    @ApiOperation({ summary: 'Get room by ID' })
    @Get(':id')
    async getRoomById(@Param('id') id: string) {
      return this.roomService.getRoomById(id);
    }
  
    @ApiOperation({ summary: 'Update room details' })
    @Put(':id')
    async updateRoom(@Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
      return this.roomService.updateRoom(id, updateRoomDto);
    }
  
    @ApiOperation({ summary: 'Delete a room' })
    @Delete(':id')
    async deleteRoom(@Param('id') id: string) {
      return this.roomService.deleteRoom(id);
    }
  
    @ApiOperation({ summary: 'Add member to room' })
    @Post(':roomId/members/:userId')
    async addMember(@Param('roomId') roomId: string, @Param('userId') userId: string) {
      return this.roomService.addMember(roomId, userId);
    }
  
    @ApiOperation({ summary: 'Remove member from room' })
    @Delete(':roomId/members/:userId')
    async removeMember(@Param('roomId') roomId: string, @Param('userId') userId: string) {
      return this.roomService.removeMember(roomId, userId);
    }
  
    // Invitation Endpoints
    @ApiOperation({ summary: 'Send room invitation' })
    @Post(':roomId/invite')
    async sendInvitation(
      @Param('roomId') roomId: string,
      @Body() createRoomInvitationDto: CreateRoomInvitationDto,
      @Req() req: Request
    ) {
      const user = req.user as CustomUser;
      if (!user || !user.id) {
        throw new Error('User information is missing in the request');
      }
      return this.roomService.sendInvitation({ ...createRoomInvitationDto, roomId }, user.id);
    }
  
    @ApiOperation({ summary: 'Accept room invitation' })
    @Post('invitations/:id/accept')
    async acceptInvitation(@Param('id') id: string) {
      const invitation = await this.roomService.acceptInvitation(id) as unknown as { roomId: string; userId: string };
      if (!invitation.userId) {
        throw new Error('Invitation does not contain userId');
      }
      return this.roomService.addMember(invitation.roomId.toString(), invitation.userId.toString());
    }
  
    @ApiOperation({ summary: 'Reject room invitation' })
    @Post('invitations/:id/reject')
    async rejectInvitation(@Param('id') id: string) {
      return this.roomService.rejectInvitation(id);
    }
  }
  