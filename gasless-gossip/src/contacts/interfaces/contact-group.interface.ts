import { Document } from 'mongoose';

export interface ContactGroup extends Document {
  owner: string;               // User ID who owns this group
  name: string;                // Group name
  description?: string;        // Optional group description
  color?: string;              // Optional color (hex) for UI display
  createdAt: Date;             // When the group was created
  updatedAt: Date;             // When the group was last updated
}