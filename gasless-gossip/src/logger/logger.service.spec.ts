/* eslint-disable prettier/prettier */
import { Test, TestingModule } from '@nestjs/testing';
import { LoggingService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingService],
    }).compile();

    service = module.get<LoggingService>(LoggingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
