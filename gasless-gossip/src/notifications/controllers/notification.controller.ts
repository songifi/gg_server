// File: src/modules/notifications/controllers/notification.controller.ts
import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBearerAuth,
    ApiBody,
    ApiQuery,
  } from '@nestjs/swagger';
  import { NotificationService } from '../services/notification.service';
  import { NotificationQueryDto } from '../dto/pagination.dto';
  import { BatchUpdateNotificationsDto } from '../dto/batch-update.dto';
  import { NotificationResponseDto } from '../dto/notification.dto';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { CurrentUser } from '../../auth/decorators/current-user.decorator';
  
  @ApiTags('notifications')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Controller('notifications')
  export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}
  
    @Get()
    @ApiOperation({ summary: 'Get user notifications' })
    @ApiQuery({ type: NotificationQueryDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'User notifications retrieved successfully',
      type: [NotificationResponseDto],
    })
    async getUserNotifications(
      @CurrentUser() userId: string,
      @Query() queryParams: NotificationQueryDto,
    ) {
      const result = await this.notificationService.getUserNotifications(userId, queryParams);
      
      return {
        notifications: result.notifications.map(notification => this.mapToNotificationResponse(notification)),
        unreadCount: result.unreadCount,
        total: result.total,
        page: result.page,
        limit: result.limit
      };
    }
  
    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark a notification as read' })
    @ApiParam({ name: 'id', description: 'Notification ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Notification marked as read',
      type: NotificationResponseDto,
    })
    async markAsRead(
      @CurrentUser() userId: string,
      @Param('id') notificationId: string,
    ) {
      const notification = await this.notificationService.markAsRead(notificationId, userId);
      return this.mapToNotificationResponse(notification);
    }
  
    @Patch('read-all')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'All notifications marked as read',
    })
    async markAllAsRead(@CurrentUser() userId: string) {
      return this.notificationService.markAllAsRead(userId);
    }
  
    @Post('batch-update')
    @ApiOperation({ summary: 'Batch update multiple notifications' })
    @ApiBody({ type: BatchUpdateNotificationsDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Notifications updated successfully',
    })
    async batchUpdate(
      @CurrentUser() userId: string,
      @Body() updateDto: BatchUpdateNotificationsDto,
    ) {
      return this.notificationService.batchUpdate(userId, updateDto);
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a notification' })
    @ApiParam({ name: 'id', description: 'Notification ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Notification deleted successfully',
      type: NotificationResponseDto,
    })
    async deleteNotification(
      @CurrentUser() userId: string,
      @Param('id') notificationId: string,
    ) {
      const notification = await this.notificationService.delete(notificationId, userId);
      return this.mapToNotificationResponse(notification);
    }
  
    /**
     * Map notification entity to response DTO
     */
    private mapToNotificationResponse(notification: any): NotificationResponseDto {
      const response: NotificationResponseDto = {
        id: notification._id.toString(),
        type: notification.type,
        title: notification.title,
        content: notification.content,
        data: notification.data,
        priority: notification.priority,
        read: notification.read,
        readAt: notification.readAt,
        clickAction: notification.clickAction,
        imageUrl: notification.imageUrl,
        createdAt: notification.createdAt,
      };
      
      // Add sender information if available
      if (notification.senderId) {
        response.senderId = notification.senderId._id 
          ? notification.senderId._id.toString() 
          : notification.senderId.toString();
        
        if (notification.senderId.name) {
          response.senderName = notification.senderId.name;
        }
        
        if (notification.senderId.avatar) {
          response.senderAvatar = notification.senderId.avatar;
        }
      }
      
      // Add related IDs if available
      if (notification.conversationId) {
        response.conversationId = notification.conversationId.toString();
      }
      
      if (notification.messageId) {
        response.messageId = notification.messageId.toString();
      }
      
      if (notification.transactionId) {
        response.transactionId = notification.transactionId.toString();
      }
      
      return response;
    }
  }