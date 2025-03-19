import { IsEnum, IsOptional, IsString, Length } from "class-validator";
import { GroupPrivacy, MemberRole } from "../enums/group.enum";
import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

/**
 * DTO for creating a new group.
 */
export class CreateGroupDto {
    @ApiProperty({ example: 'Gaming Club', description: 'The name of the group' })
    @Expose()
    name!: string;

    @ApiProperty({ example: 'A place for gamers to chat', description: 'Optional group description'})
    @Expose()
    description?: string;

    @ApiProperty({ example: 'https://example.com/avatar.png', description: 'URL of the group avatar'})
    @Expose()
    avatar?: string;

    @ApiProperty({ example: 'public', enum: GroupPrivacy, description: 'Group privacy setting'})
    @Expose()
    privacy?: GroupPrivacy;
}

/**
 * DTO for updating an existing group.
 */
export class UpdateGroupDto {
    @ApiProperty()
    @Expose()
    name?: string;

    @ApiProperty()
    @Expose()
    description?: string;

    @ApiProperty()
    @Expose()
    avatar?: string;

    @ApiProperty()
    @Expose()
    privacy?: GroupPrivacy;
}

/**
 * DTO for returning group information.
 */
export class GroupResponseDto {
    @Expose()
    id!: string;

    @Expose()
    name!: string;

    @Expose()
    description?: string;

    @Expose()
    avatar?: string;

    @Expose()
    privacy!: GroupPrivacy;

    @Expose()
    members!: { userId: string; role: MemberRole }[];

    @Expose()
    messages!: string[];
}

/**
* DTO for validating group properties.
*/
export class ValidateGroupDto {
    @ApiProperty()
    @IsString()
    @Length(3, 50)
    @Expose()
    name!: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    @Length(0, 200)
    @Expose()
    description?: string;

    @ApiProperty()
    @IsOptional()
    @IsEnum(GroupPrivacy)
    @Expose()
    privacy?: GroupPrivacy;
}
