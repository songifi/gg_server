// src/group/repositories/group.repository.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Connection, connect } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { GroupRepository } from './group.repository';
import { Group, GroupDocument } from '../schemas/group.schema';
import { CreateGroupDto } from '../dto/create-group.dto';

describe('GroupRepository', () => {
  let repository: GroupRepository;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let groupModel: Model<GroupDocument>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    groupModel = mongoConnection.model(Group.name, mongoConnection.createSchema({
      name: { type: String, required: true },
      description: String,
      createdBy: { type: String, required: true },
      isPublic: { type: Boolean, default: false },
      joinRequiresApproval: { type: Boolean, default: true },
      maxMembers: { type: Number, default: 50 },
      isEncrypted: { type: Boolean, default: false },
      encryptionKey: String,
      tags: [String],
      isArchived: { type: Boolean, default: false },
      lastActivityAt: { type: Date, default: Date.now }
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupRepository,
        {
          provide: getModelToken(Group.name),
          useValue: groupModel,
        },
      ],
    }).compile();

    repository = module.get<GroupRepository>(GroupRepository);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await groupModel.deleteMany({});
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createGroup', () => {
    it('should create a new group', async () => {
      const createGroupDto: CreateGroupDto = {
        name: 'Test Group',
        description: 'Test Description',
        isPublic: true,
      };
      const userId = '60d21b4667d0d8992e610c85';

      const result = await repository.createGroup(createGroupDto, userId);

      expect(result).toBeDefined();
      expect(result.name).toBe(createGroupDto.name);
      expect(result.description).toBe(createGroupDto.description);
      expect(result.isPublic).toBe(createGroupDto.isPublic);
      expect(result.createdBy.toString()).toBe(userId);
      expect(result.lastActivityAt).toBeDefined();
    });
  });

  describe('findGroups', () => {
    it('should return only non-archived groups by default', async () => {
      // Create an active group
      await groupModel.create({
        name: 'Active Group',
        createdBy: '60d21b4667d0d8992e610c85',
        isArchived: false,
      });

      // Create an archived group
      await groupModel.create({
        name: 'Archived Group',
        createdBy: '60d21b4667d0d8992e610c85',
        isArchived: true,
      });

      const results = await repository.findGroups();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Active Group');
    });

    it('should apply additional filters', async () => {
      // Create a public group
      await groupModel.create({
        name: 'Public Group',
        createdBy: '60d21b4667d0d8992e610c85',
        isPublic: true,
      });

      // Create a private group
      await groupModel.create({
        name: 'Private Group',
        createdBy: '60d21b4667d0d8992e610c85',
        isPublic: false,
      });

      const results = await repository.findGroups({ isPublic: true });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Public Group');
    });
  });

  describe('findPublicGroups', () => {
    it('should return only public groups', async () => {
      // Create a public group
      await groupModel.create({
        name: 'Public Group',
        createdBy: '60d21b4667d0d8992e610c85',
        isPublic: true,
      });

      // Create a private group
      await groupModel.create({
        name: 'Private Group',
        createdBy: '60d21b4667d0d8992e610c85',
        is