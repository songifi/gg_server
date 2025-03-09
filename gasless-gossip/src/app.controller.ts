import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from './config/config.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('config-check')
  getConfigStatus() {
    return {
      environment: this.configService.app.nodeEnv,
      isDevelopment: this.configService.isDevelopment,
      isProduction: this.configService.isProduction,
      isTest: this.configService.isTest,
      port: this.configService.app.port,
      databaseConnected: !!this.configService.database.uri,
      starknetNetwork: this.configService.starknet.network,
    };
  }
}
