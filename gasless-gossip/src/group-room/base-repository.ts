// src/common/repositories/base.repository.interface.ts

import { Document, Model, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';

export interface BaseRepositoryInterface<T extends Document> {
  create(createDto: any): Promise<T>;
  findById(id: string): Promise<T | null>;
  findOne(filter: FilterQuery<T>): Promise<T | null>;
  find(filter?: FilterQuery<T>, options?: QueryOptions): Promise<T[]>;
  findByIdAndUpdate(id: string, updateDto: UpdateQuery<T>): Promise<T | null>;
  updateOne(filter: FilterQuery<T>, updateDto: UpdateQuery<T>): Promise<boolean>;
  updateMany(filter: FilterQuery<T>, updateDto: UpdateQuery<T>): Promise<boolean>;
  deleteById(id: string): Promise<boolean>;
  deleteOne(filter: FilterQuery<T>): Promise<boolean>;
  deleteMany(filter: FilterQuery<T>): Promise<boolean>;
  count(filter: FilterQuery<T>): Promise<number>;
}

// src/common/repositories/base.repository.ts

import { Document, Model, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';
import { BaseRepositoryInterface } from './base.repository.interface';
import { NotFoundException } from '@nestjs/common';

export abstract class BaseRepository<T extends Document> implements BaseRepositoryInterface<T> {
  constructor(protected readonly model: Model<T>) {}

  async create(createDto: any): Promise<T> {
    const entity = new this.model(createDto);
    return entity.save();
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne(filter).exec();
  }

  async find(filter?: FilterQuery<T>, options?: QueryOptions): Promise<T[]> {
    const query = this.model.find(filter || {});
    
    if (options?.sort) {
      query.sort(options.sort);
    }
    
    if (options?.skip) {
      query.skip(options.skip);
    }
    
    if (options?.limit) {
      query.limit(options.limit);
    }
    
    return query.exec();
  }

  async findByIdAndUpdate(id: string, updateDto: UpdateQuery<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, updateDto, { new: true }).exec();
  }

  async updateOne(filter: FilterQuery<T>, updateDto: UpdateQuery<T>): Promise<boolean> {
    const result = await this.model.updateOne(filter, updateDto).exec();
    return result.modifiedCount > 0;
  }

  async updateMany(filter: FilterQuery<T>, updateDto: UpdateQuery<T>): Promise<boolean> {
    const result = await this.model.updateMany(filter, updateDto).exec();
    return result.modifiedCount > 0;
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id } as FilterQuery<T>).exec();
    return result.deletedCount > 0;
  }

  async deleteOne(filter: FilterQuery<T>): Promise<boolean> {
    const result = await this.model.deleteOne(filter).exec();
    return result.deletedCount > 0;
  }

  async deleteMany(filter: FilterQuery<T>): Promise<boolean> {
    const result = await this.model.deleteMany(filter).exec();
    return result.deletedCount > 0;
  }

  async count(filter: FilterQuery<T>): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
