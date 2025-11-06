/**
 * Configuration module
 * Loads and validates Zconfig.json using @zebra/shared
 */
import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ConfigController } from './config.controller';

export interface ConfigModuleOptions {
  configPath?: string;
}

@Global()
@Module({})
export class ConfigModule {
  static forRoot(options: ConfigModuleOptions = {}): DynamicModule {
    return {
      module: ConfigModule,
      controllers: [ConfigController],
      providers: [
        {
          provide: 'CONFIG_OPTIONS',
          useValue: options,
        },
        ConfigService,
      ],
      exports: [ConfigService],
    };
  }
}

