/**
 * Config service tests
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { LoggerService } from '../logger/logger.service';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'CONFIG_OPTIONS',
          useValue: {},
        },
        ConfigService,
        LoggerService,
      ],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests as needed
});


