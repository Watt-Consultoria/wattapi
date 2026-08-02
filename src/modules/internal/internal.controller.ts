import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { InternalSecretGuard } from './internal-secret.guard';
import { InternalService } from './internal.service';
import type { WeeklyJobResult, DailyJobResult } from './internal.service';
import {
  WeeklyJobResultDto,
  DailyJobResultDto,
} from './dto/internal.response.dto';

@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Post('weekly-job')
  @HttpCode(200)
  @UseGuards(InternalSecretGuard)
  @ApiResponse({ status: 200, type: WeeklyJobResultDto })
  weeklyJob(): Promise<WeeklyJobResult> {
    return this.internalService.checkWeeklyAbsence();
  }

  @Post('daily-job')
  @HttpCode(200)
  @UseGuards(InternalSecretGuard)
  @ApiResponse({ status: 200, type: DailyJobResultDto })
  dailyJob(): Promise<DailyJobResult> {
    return this.internalService.checkDailyActivitiesAndSendNotifications();
  }
}
