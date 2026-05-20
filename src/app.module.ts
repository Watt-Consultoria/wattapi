import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { StatusModule } from './modules/status/status.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, StatusModule],
})
export class AppModule {}
