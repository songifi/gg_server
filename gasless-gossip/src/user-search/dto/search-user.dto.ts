import { IsString, IsOptional, IsEnum, IsArray, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum SearchField {
  USERNAME = 'username',
  DISPLAY_NAME = 'displayName',
  WALLET_ADDRESS = 'walletAddress',
  ALL = 'all'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export class SearchUserDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsEnum(SearchField, { each: true })
  @IsArray()
  @IsOptional()
  fields?: SearchField[] = [SearchField.ALL];

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsEnum(SearchField)
  @IsOptional()
  sortBy?: SearchField = SearchField.USERNAME;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.ASC;

  @IsOptional()
  @IsString()
  excludeUserId?: string;

  @IsOptional()
  @IsString()
  currentUserId?: string;
}