// src/group/entities/group.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { GroupMember } from './group-member.entity';
import { Invitation } from './invitation.entity';
import { GroupSettings } from './group-settings.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => User)
  createdBy: User;

  @OneToMany(() => GroupMember, member => member.group)
  members: GroupMember[];

  @OneToMany(() => Invitation, invitation => invitation.group)
  invitations: Invitation[];

  @OneToOne(() => GroupSettings, settings => settings.group)
  settings: GroupSettings;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// src/group/entities/group-member.entity.ts

import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Group } from './group.entity';
import { GroupRole } from '../enums/group-role.enum';

@Entity('group_members')
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Group, group => group.members, { onDelete: 'CASCADE' })
  group: Group;

  @ManyToOne(() => User)
  user: User;

  @Column({
    type: 'enum',
    enum: GroupRole,
    default: GroupRole.MEMBER,
  })
  role: GroupRole;

  @CreateDateColumn()
  joinedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// src/group/entities/invitation.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Group } from './group.entity';
import { User } from '../../user/entities/user.entity';

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Group, group => group.invitations, { onDelete: 'CASCADE' })
  group: Group;

  @Column()
  email: string;

  @ManyToOne(() => User)
  invitedBy: User;

  @Column({ unique: true })
  token: string;

  @Column({ default: false })
  expired: boolean;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

// src/group/entities/group-settings.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Group } from './group.entity';

@Entity('group_settings')
export class GroupSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Group, group => group.settings, { onDelete: 'CASCADE' })
  @JoinColumn()
  group: Group;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ default: true })
  joinRequiresApproval: boolean;

  @Column({ default: 50 })
  maxMembers: number;

  @Column({ default: true })
  membersCanInvite: boolean;

  @Column({ default: false })
  onlyAdminsCanPost: boolean;

  @Column({ default: false })
  requireModerationForPosts: boolean;
}
