import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { StatusModule } from './modules/status/status.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { TimeTrackingModule } from './modules/time-tracking/time-tracking.module';
import { SettingsModule } from './modules/settings/settings.module';
import { JwtGuard } from './common/guards/jwt.guard';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    SettingsModule,
    StatusModule,
    UsersModule,
    AuthModule,
    TimeTrackingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
  ],
})
export class AppModule {}
