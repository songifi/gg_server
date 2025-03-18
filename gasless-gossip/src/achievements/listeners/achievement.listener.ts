// src/modules/achievements/listeners/achievement.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';

@Injectable()
export class AchievementListener {
  private readonly logger = new Logger(AchievementListener.name);

  @OnEvent('achievement.completed')
  handleAchievementCompletedEvent(payload: { userId: string; achievementId: string }) {
    this.logger.log(`Achievement completed: ${payload.achievementId} by user ${payload.userId}`);
    
    // In a real implementation, you might:
    // 1. Update user profile with achievement badges
    // 2. Send push notifications
    // 3. Update leaderboards
    // 4. Trigger social sharing options
  }

  // Other achievement-related event handlers...
}