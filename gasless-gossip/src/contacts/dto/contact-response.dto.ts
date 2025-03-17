import { Exclude, Expose, Type } from 'class-transformer';
import { ContactStatus } from '../enums/contact-status.enum';

@Exclude()
export class ContactResponseDto {
  @Expose()
  id: string;

  @Expose()
  user: string;

  @Expose()
  nickname?: string;

  @Expose()
  notes?: string;

  @Expose()
  groups: string[];

  @Expose()
  status: ContactStatus;

  @Expose()
  isFavorite: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<ContactResponseDto>) {
    Object.assign(this, partial);
  }
}