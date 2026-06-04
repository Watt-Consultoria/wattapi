import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { InternalSecretGuard } from './internal-secret.guard';
import { InternalService } from './internal.service';
import type { WeeklyAbsenceCheckResult } from './internal.service';

@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Post('weekly-absence-check')
  @HttpCode(200)
  @UseGuards(InternalSecretGuard)
  weeklyAbsenceCheck(): Promise<WeeklyAbsenceCheckResult> {
    return this.internalService.weeklyAbsenceCheck();
  }
}
