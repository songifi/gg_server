export enum MessageStatus {
    SENT = 'sent',        // Message has been sent to the server
    DELIVERED = 'delivered', // Message has been delivered to recipient's device
    READ = 'read',        // Message has been read by the recipient
    FAILED = 'failed'     // Message delivery failed
  }
  