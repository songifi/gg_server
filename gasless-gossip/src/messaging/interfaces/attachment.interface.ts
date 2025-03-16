export interface Attachment {
    type: "image" | "video" | "audio" | "file"; // Type of attachment
    url: string; // URL to the attachment
    filename: string; // Original filename
    mimeType: string; // MIME type of the file
    size: number; // File size in bytes
    dimensions?: {
      // For images/videos (optional)
      width: number;
      height: number;
    };
    duration?: number; // For audio/video in seconds (optional)
    thumbnailUrl?: string; // Thumbnail for images/videos (optional)
  }