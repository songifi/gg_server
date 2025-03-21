import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    WebSocketServer,
    WsResponse,
    OnGatewayConnection,
    OnGatewayDisconnect,
  } from '@nestjs/websockets';
  import { UseGuards } from '@nestjs/common';
  import { Server, Socket } from 'socket.io';
  import { WsJwtGuard } from '../auths/guards/ws-jwt.guard';
  import { ReactionsService } from './reactions.service';
  import { CreateReactionDto } from './dto/create-reaction.dto';
  import { RemoveReactionDto } from './dto/remove-reaction.dto';
  import { OnEvent } from '@nestjs/event-emitter';
  
  @WebSocketGateway({
    namespace: 'reactions',
    cors: {
      origin: '*', // In production, restrict to your domain
    },
  })
  export class ReactionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    constructor(
      private readonly reactionsService: ReactionsService,
      // Inject conversation service to handle room subscriptions
      // private readonly conversationService: ConversationService,
    ) {}
  
    async handleConnection(client: Socket) {
      try {
        // Authenticate client (implementation depends on your auth system)
        // const user = await this.authService.verifyToken(client.handshake.auth.token);
        
        // Join user to their personal room
        // client.join(`user:${user.id}`);
        
        // Join user to conversation rooms they belong to
        // const conversations = await this.conversationService.getUserConversations(user.id);
        // for (const conversation of conversations) {
        //   client.join(`conversation:${conversation.id}`);
        // }
      } catch (error) {
        client.disconnect();
      }
    }
  
    handleDisconnect(client: Socket) {
      // Cleanup if needed
    }
  
    @UseGuards(WsJwtGuard)
    @SubscribeMessage('addReaction')
    async addReaction(
      @ConnectedSocket() client: Socket,
      @MessageBody() createReactionDto: CreateReactionDto,
    ): Promise<WsResponse<any>> {
      try {
        const userId = client['user'].id;
        await this.reactionsService.addReaction(userId, createReactionDto);
        
        // No need to emit anything here - the event listener will handle it
        
        return { event: 'reactionAdded', data: { success: true } };
      } catch (error) {
        return { event: 'error', data: { message: error.message } };
      }
    }
  
    @UseGuards(WsJwtGuard)
    @SubscribeMessage('removeReaction')
    async removeReaction(
      @ConnectedSocket() client: Socket,
      @MessageBody() removeReactionDto: RemoveReactionDto,
    ): Promise<WsResponse<any>> {
      try {
        const userId = client['user'].id;
        await this.reactionsService.removeReaction(userId, removeReactionDto);
        
        // No need to emit anything here - the event listener will handle it
        
        return { event: 'reactionRemoved', data: { success: true } };
      } catch (error) {
        return { event: 'error', data: { message: error.message } };
      }
    }
  
    @UseGuards(WsJwtGuard)
    @SubscribeMessage('getMessageReactions')
    async getMessageReactions(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { messageId: string },
    ): Promise<WsResponse<any>> {
      try {
        const reactions = await this.reactionsService.getMessageReactions(data.messageId);
        
        return { event: 'messageReactions', data: reactions };
      } catch (error) {
        return { event: 'error', data: { message: error.message } };
      }
    }
  
    /**
     * Event listeners for reaction events
     */
    
    @OnEvent('reaction.added')
    handleReactionAdded(payload: {
      reactionId: string;
      messageId: string;
      userId: string;
      conversationId: string;
      type: string;
      content: string;
    }) {
      // Emit to conversation room
      this.server.to(`conversation:${payload.conversationId}`).emit('reactionAdded', payload);
    }
    
    @OnEvent('reaction.removed')
    handleReactionRemoved(payload: {
      messageId: string;
      userId: string;
      conversationId: string;
      content: string;
    }) {
      // Emit to conversation room
      this.server.to(`conversation:${payload.conversationId}`).emit('reactionRemoved', payload);
    }
    
    @OnEvent('reaction.cleared')
    handleReactionsCleared(payload: {
      messageId: string;
      conversationId: string;
    }) {
      // Emit to conversation room
      this.server.to(`conversation:${payload.conversationId}`).emit('reactionsCleared', payload);
    }
  }
  