import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import * as request from 'supertest';
import { ConversationModule } from '../conversation.module';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

// Mock JwtAuthGuard to allow testing without actual JWT
class MockJwtAuthGuard {
  canActivate() {
    return true;
  }
}

describe('ConversationController (e2e)', () => {
  let app: INestApplication;
  const mockUserId = '60d21b4667d0d8992e610c85';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Use an in-memory MongoDB for testing
        MongooseModule.forRoot('mongodb://localhost/test-db', {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        }),
        ConversationModule,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .overrideProvider(CurrentUser)
      .useValue(() => mockUserId)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/conversations (POST) - should create a new conversation', () => {
    return request(app.getHttpServer())
      .post('/conversations')
      .send({
        title: 'E2E Test Group',
        isGroup: true,
        participantIds: ['60d21b4667d0d8992e610c86'],
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.title).toBe('E2E Test Group');
      });
  });

  // Add more e2e tests for other endpoints
});
