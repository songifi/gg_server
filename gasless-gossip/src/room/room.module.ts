import { Module } from '@nestjs/common';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { RoomService } from './provider/room.service';

@Module({
  controllers: [RoomController],
  providers: [RoomService]
})
export class RoomModule {}
