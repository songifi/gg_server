import { MemberRole } from "../enums/group.enum";

/**
 * Interface defining group membership structure.
 */
export interface GroupMembership {
    groupId: string;
    userId: string;
    role: MemberRole;
  }
  
  /**
   * Interface defining the structure for group invitations.
   */
  export interface GroupInvitation {
    groupId: string;
    userId: string;
    invitedBy: string;
    status: 'pending' | 'accepted' | 'declined';
  }
  