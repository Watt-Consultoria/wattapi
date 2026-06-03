import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { StatusModule } from './modules/status/status.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { TimeTrackingModule } from './modules/time-tracking/time-tracking.module';
import { SettingsModule } from './modules/settings/settings.module';
import { DocsModule } from './modules/docs/docs.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RoutineModule } from './modules/routine/routine.module';
import { ReimbursementsModule } from './modules/reimbursements/reimbursements.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { LeadsModule } from './modules/leads/leads.module';
import { EmailModule } from './modules/email/email.module';
import { NormsModule } from './modules/norms/norms.module';
import { ViolationsModule } from './modules/violations/violations.module';
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
    DocsModule,
    ActivitiesModule,
    NotificationsModule,
    RoutineModule,
    ReimbursementsModule,
    PortfolioModule,
    LeadsModule,
    EmailModule,
    NormsModule,
    ViolationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
