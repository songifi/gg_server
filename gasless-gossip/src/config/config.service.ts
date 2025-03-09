import { Injectable, Logger } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import {
  Config,
  AppConfig,
  StarkNetConfig,
  DatabaseConfig,
  JwtConfig,
} from './interfaces/config.interface';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(private configService: NestConfigService) {
    // Validate all required configurations on startup
    this.validateConfigurations();
  }

  private validateConfigurations() {
    try {
      // Check all required configurations
      this.app;
      this.database;
      this.jwt;
      this.starknet;
      this.logger.log('All configurations validated successfully');
    } catch (error: any) {
      this.logger.error('Configuration validation failed', error?.stack);
      throw error;
    }
  }

  private getValue<T>(key: string, throwOnMissing = true): T {
    const value = this.configService.get<T>(key);

    if (!value && throwOnMissing) {
      const error = new Error(`Configuration error - missing required key "${key}"`);
      this.logger.error(error.message);
      throw error;
    }

    return value as T;
  }

  get app(): AppConfig {
    return {
      port: this.getValue<number>('PORT'),
      nodeEnv: this.getValue<string>('NODE_ENV'),
    };
  }

  get starknet(): StarkNetConfig {
    return {
      providerUrl: this.getValue<string>('STARKNET_PROVIDER_URL'),
      network: this.getValue<string>('STARKNET_NETWORK'),
    };
  }

  get database(): DatabaseConfig {
    return {
      uri: this.getValue<string>('MONGODB_URI'),
      name: this.getValue<string>('MONGODB_NAME'),
    };
  }

  get jwt(): JwtConfig {
    const secret = this.getValue<string>('JWT_SECRET');
    // Log warning if JWT secret is too short in non-production
    if (secret.length < 32 && this.app.nodeEnv !== 'production') {
      this.logger.warn('JWT_SECRET is shorter than recommended length of 32 characters');
    }
    return {
      secret,
      expiresIn: this.getValue<string>('JWT_EXPIRES_IN'),
    };
  }

  get isDevelopment(): boolean {
    return this.app.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.app.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.app.nodeEnv === 'test';
  }
}
