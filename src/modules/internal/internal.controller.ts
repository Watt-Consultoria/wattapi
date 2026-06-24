import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { InternalSecretGuard } from './internal-secret.guard';
import { InternalService } from './internal.service';
import type { WeeklyJobResult, DailyJobResult } from './internal.service';

@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Post('weekly-job')
  @HttpCode(200)
  @UseGuards(InternalSecretGuard)
  weeklyJob(): Promise<WeeklyJobResult> {
    return this.internalService.checkWeeklyAbsence();
  }

  @Post('daily-job')
  @HttpCode(200)
  @UseGuards(InternalSecretGuard)
  dailyJob(): Promise<DailyJobResult> {
    return this.internalService.checkDailyActivitiesAndSendNotifications();
  }
}
