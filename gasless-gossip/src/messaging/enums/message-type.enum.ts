export enum MessageType {
    TEXT = "text", // Regular text message
    IMAGE = "image", // Image attachment
    FILE = "file", // File attachment
    AUDIO = "audio", // Audio/voice message
    VIDEO = "video", // Video attachment
    TOKEN_TRANSFER = "token_transfer", // StarkNet token transfer
    SYSTEM = "system", // System notification/message
  }