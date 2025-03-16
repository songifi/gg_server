
import {
    IsString,
    IsNotEmpty,
    IsNumber,
    IsEnum,
    IsOptional,
  } from "class-validator";
  
  export class CreateTokenTransferDto {
    @IsString()
    @IsNotEmpty()
    amount: string;
  
    @IsString()
    @IsNotEmpty()
    tokenAddress: string;
  
    @IsString()
    @IsNotEmpty()
    tokenSymbol: string;
  
    @IsNumber()
    @IsNotEmpty()
    tokenDecimals: number;
  
    @IsOptional()
    @IsString()
    transactionHash?: string;
  
    @IsEnum(["pending", "confirmed", "failed"])
    @IsNotEmpty()
    status: "pending" | "confirmed" | "failed";
  }