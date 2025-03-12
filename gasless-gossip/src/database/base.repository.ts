import { Document, FilterQuery, Model, UpdateQuery } from 'mongoose';
import { NotFoundException } from '@nestjs/common';

export abstract class BaseRepository<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  async create(data: Partial<T>): Promise<T> {
    const entity = new this.model(data);
    return entity.save();
  }

  async findById(id: string): Promise<T> {
    const entity = await this.model.findById(id).exec();
    if (!entity) {
      throw new NotFoundException(`Entity with id ${id} not found`);
    }
    return entity;
  }

  async findOne(filterQuery: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne(filterQuery).exec();
  }

  async findAll(filterQuery: FilterQuery<T> = {}): Promise<T[]> {
    return this.model.find(filterQuery).exec();
  }

  async update(id: string, updateData: UpdateQuery<T>): Promise<T> {
    const updated = await this.model.findByIdAndUpdate(id, updateData, { new: true }).exec();

    if (!updated) {
      throw new NotFoundException(`Entity with id ${id} not found`);
    }

    return updated;
  }

  async delete(id: string): Promise<T> {
    const deleted = await this.model.findByIdAndDelete(id).exec();

    if (!deleted) {
      throw new NotFoundException(`Entity with id ${id} not found`);
    }

    return deleted;
  }

  async count(filterQuery: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filterQuery).exec();
  }

  async exists(filterQuery: FilterQuery<T>): Promise<boolean> {
    const count = await this.model.countDocuments(filterQuery).limit(1).exec();
    return count > 0;
  }
}
