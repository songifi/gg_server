import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateTokenTransferDto {
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @IsNumber()
  amount: number;
}
