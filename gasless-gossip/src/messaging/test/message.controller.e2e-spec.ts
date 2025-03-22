import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import * as request from 'supertest';
import { MessagingModule } from '../messaging.module';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

// Mock JwtAuthGuard to allow testing without actual JWT
class MockJwtAuthGuard {
  canActivate() {
    return true;
  }
}

describe('MessageController (e2e)', () => {
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
        MessagingModule,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .overrideProvider(CurrentUser)
      .useValue(() => mockUserId)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/messages (POST) - should create a new message', () => {
    return request(app.getHttpServer())
      .post('/messages')
      .send({
        recipientId: '60d21b4667d0d8992e610c86',
        content: 'Hello from e2e test',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('content', 'Hello from e2e test');
      });
  });

  // Add more e2e tests for other endpoints
});
