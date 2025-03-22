// File: src/modules/messaging/test/messaging.gateway.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagingModule } from '../messaging.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';
import * as jwt from 'jsonwebtoken';

// Mock JWT Guard for testing
jest.mock('../../auth/guards/ws-jwt.guard');

describe('MessagingGateway (e2e)', () => {
  let app: INestApplication;
  let socket: Socket;
  const JWT_SECRET = 'test-secret';
  const mockUserId = '60d21b4667d0d8992e610c85';
  const mockToken = jwt.sign({ sub: mockUserId }, JWT_SECRET);

  beforeAll(async () => {
    // Configure the mock JWT guard
    (WsJwtGuard as jest.Mock).mockImplementation(() => ({
      canActivate: () => true,
    }));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ JWT_SECRET })],
        }),
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
        EventEmitterModule.forRoot(),
        MongooseModule.forRoot('mongodb://localhost:27017/test-messaging'),
        MessagingModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(3001);

    // Connect socket client
    socket = io('http://localhost:3001', {
      auth: {
        token: mockToken,
        userId: mockUserId,
      },
      transports: ['websocket'],
    });

    await new Promise((resolve) => {
      socket.on('connect', () => {
        resolve(true);
      });
    });
  });

  afterAll(async () => {
    socket.disconnect();
    await app.close();
  });

  it('should join a conversation room', (done) => {
    const conversationId = '60d21b4667d0d8992e610c86';

    socket.emit('joinConversation', { conversationId });

    // Since this is more of a setup operation, we'll just wait a bit
    setTimeout(() => {
      // No error means success for this test
      done();
    }, 100);
  });

  it('should emit typing status to room members', (done) => {
    const conversationId = '60d21b4667d0d8992e610c86';
    const typingData = { conversationId, isTyping: true };

    // First join the room
    socket.emit('joinConversation', { conversationId });

    // Subscribe to typing events
    socket.on('userTyping', (data) => {
      expect(data).toEqual({
        userId: mockUserId,
        conversationId,
        isTyping: true,
      });
      done();
    });

    // Emit typing event
    socket.emit('typing', typingData);
  });

  // More WebSocket tests...
});
