import { CreateGroupConversationDto } from "./creategroup-conversation.dto";
import { CreateDirectConversationDto } from "./direct-conversation.dto";

// Validation Functions
export const validateDirectConversationDto = (dto: CreateDirectConversationDto): boolean => {
    if (!dto.participants || !Array.isArray(dto.participants)) return false;
    if (dto.participants.length !== 2) return false;
    if (dto.participants[0] === dto.participants[1]) return false;
    return true;
  };
  
  export const validateGroupConversationDto = (dto: CreateGroupConversationDto): boolean => {
    if (!dto.title || typeof dto.title !== 'string' || dto.title.trim().length === 0) return false;
    if (!dto.participants || !Array.isArray(dto.participants) || dto.participants.length < 2) return false;
    if (!dto.admin || typeof dto.admin !== 'string') return false;
    if (!dto.participants.includes(dto.admin)) return false;
    return true;
  };