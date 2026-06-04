import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SettingsModule } from '../settings/settings.module';
import { EmailModule } from '../email/email.module';
import { AppConfigModule } from '../../config/config.module';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';
import { InternalSecretGuard } from './internal-secret.guard';

@Module({
  imports: [AppConfigModule, DatabaseModule, SettingsModule, EmailModule],
  controllers: [InternalController],
  providers: [InternalService, InternalSecretGuard],
})
export class InternalModule {}
