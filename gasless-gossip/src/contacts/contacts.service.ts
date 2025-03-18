import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContactDocument } from './schemas/contact.schema';
import { ContactGroupDocument } from './schemas/contact-group.schema';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CreateContactGroupDto } from './dto/create-contact-group.dto';
import { UpdateContactGroupDto } from './dto/update-contact-group.dto';
import { ContactResponseDto } from './dto/contact-response.dto';
import { ContactGroupResponseDto } from './dto/contact-group-response.dto';
import { ContactStatus } from './enums/contact-status.enum';

@Injectable()
export class ContactsService {
  constructor(
    @InjectModel('Contact') private contactModel: Model<ContactDocument>,
    @InjectModel('ContactGroup') private contactGroupModel: Model<ContactGroupDocument>,
  ) {}

  /**
   * Create a new contact
   */
  async createContact(
    ownerId: string,
    createContactDto: CreateContactDto,
  ): Promise<ContactResponseDto> {
    // Prevent user from adding themselves as a contact
    if (ownerId === createContactDto.user) {
      throw new BadRequestException('You cannot add yourself as a contact');
    }

    // Check if the contact already exists
    const existingContact = await this.contactModel
      .findOne({
        owner: ownerId,
        user: createContactDto.user,
      })
      .exec();

    if (existingContact) {
      // If contact exists but was removed, reactivate it
      if (existingContact.status === ContactStatus.REMOVED) {
        existingContact.status = createContactDto.status || ContactStatus.ACTIVE;
        existingContact.nickname = createContactDto.nickname;
        existingContact.notes = createContactDto.notes;
        existingContact.groups = createContactDto.groups || [];
        existingContact.isFavorite = createContactDto.isFavorite || false;

        const updatedContact = await existingContact.save();
        return new ContactResponseDto(updatedContact.toObject());
      }

      throw new ConflictException('Contact already exists');
    }

    // Validate groups if provided
    if (createContactDto.groups && createContactDto.groups.length > 0) {
      await this.validateGroups(ownerId, createContactDto.groups);
    }

    // Create the contact
    const newContact = new this.contactModel({
      owner: ownerId,
      user: createContactDto.user,
      nickname: createContactDto.nickname,
      notes: createContactDto.notes,
      groups: createContactDto.groups || [],
      status: createContactDto.status || ContactStatus.ACTIVE,
      isFavorite: createContactDto.isFavorite || false,
    });

    const savedContact = await newContact.save();
    return new ContactResponseDto(savedContact.toObject());
  }

  /**
   * Get contact by ID
   */
  async getContact(ownerId: string, contactId: string): Promise<ContactResponseDto> {
    const contact = await this.contactModel
      .findOne({
        _id: contactId,
        owner: ownerId,
        status: { $ne: ContactStatus.REMOVED },
      })
      .exec();

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    return new ContactResponseDto(contact.toObject());
  }

  /**
   * Get all contacts for a user with pagination and filtering
   */
  async getContacts(
    ownerId: string,
    page = 1,
    limit = 20,
    group?: string,
    status?: ContactStatus,
    isFavorite?: boolean,
    search?: string,
  ): Promise<{ contacts: ContactResponseDto[]; total: number; page: number; pages: number }> {
    const skip = (page - 1) * limit;

    // Build the query
    const query: any = {
      owner: ownerId,
      status: { $ne: ContactStatus.REMOVED }, // Don't show removed contacts by default
    };

    // Add filters if provided
    if (group) {
      query.groups = group;
    }

    if (status) {
      query.status = status;
    }

    if (isFavorite !== undefined) {
      query.isFavorite = isFavorite;
    }

    if (search) {
      // Search by nickname or notes
      query.$or = [
        { nickname: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    // Execute the query with pagination
    const [contacts, total] = await Promise.all([
      this.contactModel
        .find(query)
        .sort({ isFavorite: -1, updatedAt: -1 }) // Sort favorites first, then by last updated
        .skip(skip)
        .limit(limit)
        .exec(),
      this.contactModel.countDocuments(query).exec(),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      contacts: contacts.map((contact) => new ContactResponseDto(contact.toObject())),
      total,
      page,
      pages,
    };
  }

  /**
   * Update a contact
   */
  async updateContact(
    ownerId: string,
    contactId: string,
    updateContactDto: UpdateContactDto,
  ): Promise<ContactResponseDto> {
    // Validate groups if provided
    if (updateContactDto.groups && updateContactDto.groups.length > 0) {
      await this.validateGroups(ownerId, updateContactDto.groups);
    }

    const contact = await this.contactModel
      .findOne({
        _id: contactId,
        owner: ownerId,
        status: { $ne: ContactStatus.REMOVED },
      })
      .exec();

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    // Update fields if provided
    if (updateContactDto.nickname !== undefined) contact.nickname = updateContactDto.nickname;
    if (updateContactDto.notes !== undefined) contact.notes = updateContactDto.notes;
    if (updateContactDto.groups !== undefined) contact.groups = updateContactDto.groups;
    if (updateContactDto.status !== undefined) contact.status = updateContactDto.status;
    if (updateContactDto.isFavorite !== undefined) contact.isFavorite = updateContactDto.isFavorite;

    const updatedContact = await contact.save();
    return new ContactResponseDto(updatedContact.toObject());
  }

  /**
   * Delete a contact (soft delete by setting status to REMOVED)
   */
  async deleteContact(ownerId: string, contactId: string): Promise<void> {
    const contact = await this.contactModel
      .findOne({
        _id: contactId,
        owner: ownerId,
      })
      .exec();

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    contact.status = ContactStatus.REMOVED;
    await contact.save();
  }

  /**
   * Block a contact
   */
  async blockContact(ownerId: string, contactId: string): Promise<ContactResponseDto> {
    const contact = await this.contactModel
      .findOne({
        _id: contactId,
        owner: ownerId,
        status: { $ne: ContactStatus.REMOVED },
      })
      .exec();

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    contact.status = ContactStatus.BLOCKED;
    const updatedContact = await contact.save();

    return new ContactResponseDto(updatedContact.toObject());
  }

  /**
   * Unblock a contact
   */
  async unblockContact(ownerId: string, contactId: string): Promise<ContactResponseDto> {
    const contact = await this.contactModel
      .findOne({
        _id: contactId,
        owner: ownerId,
        status: ContactStatus.BLOCKED,
      })
      .exec();

    if (!contact) {
      throw new NotFoundException(`Blocked contact with ID ${contactId} not found`);
    }

    contact.status = ContactStatus.ACTIVE;
    const updatedContact = await contact.save();

    return new ContactResponseDto(updatedContact.toObject());
  }

  /**
   * Get all blocked contacts
   */
  async getBlockedContacts(
    ownerId: string,
    page = 1,
    limit = 20,
  ): Promise<{ contacts: ContactResponseDto[]; total: number; page: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [contacts, total] = await Promise.all([
      this.contactModel
        .find({
          owner: ownerId,
          status: ContactStatus.BLOCKED,
        })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.contactModel
        .countDocuments({
          owner: ownerId,
          status: ContactStatus.BLOCKED,
        })
        .exec(),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      contacts: contacts.map((contact) => new ContactResponseDto(contact.toObject())),
      total,
      page,
      pages,
    };
  }

  /**
   * Check if a user is blocked
   */
  async isUserBlocked(ownerId: string, userId: string): Promise<boolean> {
    const blockedContact = await this.contactModel
      .findOne({
        owner: ownerId,
        user: userId,
        status: ContactStatus.BLOCKED,
      })
      .exec();

    return !!blockedContact;
  }

  /**
   * Create a contact group
   */
  async createContactGroup(
    ownerId: string,
    createContactGroupDto: CreateContactGroupDto,
  ): Promise<ContactGroupResponseDto> {
    // Check if the group already exists for this user
    const existingGroup = await this.contactGroupModel
      .findOne({
        owner: ownerId,
        name: createContactGroupDto.name,
      })
      .exec();

    if (existingGroup) {
      throw new ConflictException(`Group "${createContactGroupDto.name}" already exists`);
    }

    // Create the group
    const newGroup = new this.contactGroupModel({
      owner: ownerId,
      name: createContactGroupDto.name,
      description: createContactGroupDto.description,
      color: createContactGroupDto.color,
    });

    const savedGroup = await newGroup.save();
    return new ContactGroupResponseDto(savedGroup.toObject());
  }

  /**
   * Get all contact groups
   */
  async getContactGroups(ownerId: string): Promise<ContactGroupResponseDto[]> {
    const groups = await this.contactGroupModel
      .find({
        owner: ownerId,
      })
      .sort({ name: 1 })
      .exec();

    return groups.map((group) => new ContactGroupResponseDto(group.toObject()));
  }

  /**
   * Get a contact group by ID
   */
  async getContactGroup(ownerId: string, groupId: string): Promise<ContactGroupResponseDto> {
    const group = await this.contactGroupModel
      .findOne({
        _id: groupId,
        owner: ownerId,
      })
      .exec();

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    return new ContactGroupResponseDto(group.toObject());
  }

  /**
   * Update a contact group
   */
  async updateContactGroup(
    ownerId: string,
    groupId: string,
    updateContactGroupDto: UpdateContactGroupDto,
  ): Promise<ContactGroupResponseDto> {
    const group = await this.contactGroupModel
      .findOne({
        _id: groupId,
        owner: ownerId,
      })
      .exec();

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    // Check for name uniqueness if updating name
    if (updateContactGroupDto.name && updateContactGroupDto.name !== group.name) {
      const existingGroup = await this.contactGroupModel
        .findOne({
          owner: ownerId,
          name: updateContactGroupDto.name,
        })
        .exec();

      if (existingGroup) {
        throw new ConflictException(`Group "${updateContactGroupDto.name}" already exists`);
      }

      group.name = updateContactGroupDto.name;
    }

    // Update other fields if provided
    if (updateContactGroupDto.description !== undefined) {
      group.description = updateContactGroupDto.description;
    }

    if (updateContactGroupDto.color !== undefined) {
      group.color = updateContactGroupDto.color;
    }

    const updatedGroup = await group.save();
    return new ContactGroupResponseDto(updatedGroup.toObject());
  }

  /**
   * Delete a contact group
   */
  async deleteContactGroup(ownerId: string, groupId: string): Promise<void> {
    const group = await this.contactGroupModel
      .findOne({
        _id: groupId,
        owner: ownerId,
      })
      .exec();

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    // Remove the group from all contacts
    await this.contactModel
      .updateMany({ owner: ownerId, groups: groupId }, { $pull: { groups: groupId } })
      .exec();

    // Delete the group
    await this.contactGroupModel.deleteOne({ _id: groupId }).exec();
  }

  /**
   * Add a contact to a group
   */
  async addContactToGroup(
    ownerId: string,
    contactId: string,
    groupId: string,
  ): Promise<ContactResponseDto> {
    // Validate that the group exists
    const group = await this.contactGroupModel
      .findOne({
        _id: groupId,
        owner: ownerId,
      })
      .exec();

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    // Find the contact
    const contact = await this.contactModel
      .findOne({
        _id: contactId,
        owner: ownerId,
        status: { $ne: ContactStatus.REMOVED },
      })
      .exec();

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    // Add to group if not already in it
    if (!contact.groups.includes(groupId)) {
      contact.groups.push(groupId);
      const updatedContact = await contact.save();
      return new ContactResponseDto(updatedContact.toObject());
    }

    return new ContactResponseDto(contact.toObject());
  }

  /**
   * Remove a contact from a group
   */
  async removeContactFromGroup(
    ownerId: string,
    contactId: string,
    groupId: string,
  ): Promise<ContactResponseDto> {
    // Find the contact
    const contact = await this.contactModel
      .findOne({
        _id: contactId,
        owner: ownerId,
        status: { $ne: ContactStatus.REMOVED },
      })
      .exec();

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    // Remove from group if in it
    const groupIndex = contact.groups.indexOf(groupId);
    if (groupIndex !== -1) {
      contact.groups.splice(groupIndex, 1);
      const updatedContact = await contact.save();
      return new ContactResponseDto(updatedContact.toObject());
    }

    return new ContactResponseDto(contact.toObject());
  }

  /**
   * Helper method to validate that groups exist
   */
  private async validateGroups(ownerId: string, groupIds: string[]): Promise<void> {
    const groups = await this.contactGroupModel
      .find({
        _id: { $in: groupIds },
        owner: ownerId,
      })
      .exec();

    if (groups.length !== groupIds.length) {
      const foundIds = groups.map((group) => group.id.toString());
      const missingIds = groupIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(`Groups with IDs ${missingIds.join(', ')} not found`);
    }
  }
}
