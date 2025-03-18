import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ContactGroupResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description?: string;

  @Expose()
  color?: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  constructor(partial: Partial<ContactGroupResponseDto>) {
    Object.assign(this, partial);
  }
}
