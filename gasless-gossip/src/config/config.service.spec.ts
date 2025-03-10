import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { ConfigModule } from './config.module';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('app config', () => {
    it('should have valid app configuration', () => {
      const appConfig = service.app;
      expect(appConfig.port).toBeDefined();
      expect(typeof appConfig.port).toBe('number');
      expect(appConfig.nodeEnv).toBeDefined();
      expect(['development', 'production', 'test']).toContain(appConfig.nodeEnv);
    });
  });

  describe('environment helpers', () => {
    it('should correctly identify environment', () => {
      const nodeEnv = service.app.nodeEnv;
      if (nodeEnv === 'development') {
        expect(service.isDevelopment).toBe(true);
        expect(service.isProduction).toBe(false);
        expect(service.isTest).toBe(false);
      } else if (nodeEnv === 'production') {
        expect(service.isDevelopment).toBe(false);
        expect(service.isProduction).toBe(true);
        expect(service.isTest).toBe(false);
      } else if (nodeEnv === 'test') {
        expect(service.isDevelopment).toBe(false);
        expect(service.isProduction).toBe(false);
        expect(service.isTest).toBe(true);
      }
    });
  });

  describe('database config', () => {
    it('should have valid database configuration', () => {
      const dbConfig = service.database;
      expect(dbConfig.uri).toBeDefined();
      expect(typeof dbConfig.uri).toBe('string');
      expect(dbConfig.name).toBeDefined();
      expect(typeof dbConfig.name).toBe('string');
    });
  });

  describe('jwt config', () => {
    it('should have valid JWT configuration', () => {
      const jwtConfig = service.jwt;
      expect(jwtConfig.secret).toBeDefined();
      expect(typeof jwtConfig.secret).toBe('string');
      expect(jwtConfig.expiresIn).toBeDefined();
      expect(typeof jwtConfig.expiresIn).toBe('string');
    });
  });

  describe('starknet config', () => {
    it('should have valid StarkNet configuration', () => {
      const starknetConfig = service.starknet;
      expect(starknetConfig.providerUrl).toBeDefined();
      expect(typeof starknetConfig.providerUrl).toBe('string');
      expect(starknetConfig.network).toBeDefined();
      expect(['mainnet', 'testnet']).toContain(starknetConfig.network);
    });
  });
});
