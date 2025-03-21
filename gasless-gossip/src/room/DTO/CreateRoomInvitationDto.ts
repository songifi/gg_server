import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRoomInvitationDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @IsString()
  @IsNotEmpty()
  invitedUserId!: string;
}