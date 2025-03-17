import { Document } from 'mongoose';
import { ContactStatus } from '../enums/contact-status.enum';

export interface Contact extends Document {
  owner: string;               // User ID who owns this contact
  user: string;                // User ID of the contact
  nickname?: string;           // Optional custom name for the contact
  notes?: string;              // Private notes about the contact
  groups: string[];            // Array of group IDs/names this contact belongs to
  status: ContactStatus;       // Status of the contact relationship
  isFavorite: boolean;         // Whether this contact is marked as favorite
  createdAt: Date;             // When the contact was added
  updatedAt: Date;             // When the contact was last updated
}