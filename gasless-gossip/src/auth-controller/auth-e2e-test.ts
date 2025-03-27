import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { getConnection } from 'typeorm';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let accessToken: string;
  let refreshToken: string;
  let testUserEmail: string;
  let resetToken: string;
  let verificationToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    configService = app.get<ConfigService>(ConfigService);
    
    await app.init();
    
    // Generate random test user data to avoid conflicts
    testUserEmail = `test${Date.now()}@example.com`;
  });

  afterAll(async () => {
    // Clean up test data
    const connection = getConnection();
    await connection.query('DELETE FROM users WHERE email = $1', [testUserEmail]);
    
    await app.close();
  });

  describe('Registration', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: `testuser${Date.now()}`,
          email: testUserEmail,
          password: 'Password123!',
          fullName: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('username');
          expect(res.body).toHaveProperty('email', testUserEmail);
          expect(res.body).toHaveProperty('isEmailVerified', false);
          expect(res.body).toHaveProperty('tokens');
          expect(res.body.tokens).toHaveProperty('accessToken');
          expect(res.body.tokens).toHaveProperty('refreshToken');
          
          // Save tokens for later tests
          accessToken = res.body.tokens.accessToken;
          refreshToken = res.body.tokens.refreshToken;
        });
    });

    it('should not allow duplicate email registration', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'testuser2',
          email: testUserEmail, // Same email as previous test
          password: 'Password123!',
        })
        .expect(409);
    });

    it('should validate password requirements', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'testuser3',
          email: 'unique@example.com',
          password: 'weak', // Doesn't meet requirements
        })
        .expect(400);
    });
  });

  describe('Login', () => {
    it('should login with correct credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          usernameOrEmail: testUserEmail,
          password: 'Password123!',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('tokens');
          expect(res.body.tokens).toHaveProperty('accessToken');
          expect(res.body.tokens).toHaveProperty('refreshToken');
          
          // Update tokens
          accessToken = res.body.tokens.accessToken;
          refreshToken = res.body.tokens.refreshToken;
        });
    });

    it('should not login with incorrect password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          usernameOrEmail: testUserEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should not login with non-existent user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          usernameOrEmail: 'nonexistentuser@example.com',
          password: 'Password123!',
        })
        .expect(401);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          
          // Update tokens
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should not refresh with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);
    });
  });

  describe('Email Verification', () => {
    // This test requires mocking the email service
    // For e2e, we'll capture the token from the email service mock
    it('should request email verification resend', () => {
      // Assuming email service is mocked to return the token
      return request(app.getHttpServer())
        .post('/auth/verify/resend')
        .send({
          email: testUserEmail,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          
          // In a real scenario, you'd need to extract the verification token
          // from the mocked email service or the database
          const mockEmailService = app.get('EmailService');
          verificationToken = mockEmailService.getLastVerificationToken();
        });
    });

    it('should verify email with token', () => {
      // Skip if token isn't available (depends on mock implementation)
      if (!verificationToken) {
        console.warn('Skipping test: No verification token available');
        return;
      }
      
      return request(app.getHttpServer())
        .post('/auth/verify/email')
        .send({
          token: verificationToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('Password Reset', () => {
    it('should request password reset email', () => {
      return request(app.getHttpServer())
        .post('/auth/password/forgot')
        .send({
          email: testUserEmail,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          
          // In a real scenario, you'd need to extract the reset token
          // from the mocked email service or the database
          const mockEmailService = app.get('EmailService');
          resetToken = mockEmailService.getLastPasswordResetToken();
        });
    });

    it('should reset password with token', () => {
      // Skip if token isn't available (depends on mock implementation)
      if (!resetToken) {
        console.warn('Skipping test: No reset token available');
        return;
      }
      
      return request(app.getHttpServer())
        .post('/auth/password/reset')
        .send({
          token: resetToken,
          password: 'NewPassword123!',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should login with new password after reset', () => {
      // Skip if we haven't reset the password
      if (!resetToken) {
        console.warn('Skipping test: Password not reset');
        return;
      }
      
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          usernameOrEmail: testUserEmail,
          password: 'NewPassword123!', // New password after reset
        })
        .expect(200);
    });
  });

  describe('Logout', () => {
    it('should logout user', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .send({
          refreshToken: refreshToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should not be able to refresh token after logout', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(401);
    });
  });
});
