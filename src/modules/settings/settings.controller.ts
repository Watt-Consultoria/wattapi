import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { SettingsService } from './settings.service';
import { updateSettingsSchema } from './dto/settings.dto';
import type { AppSettings } from './dto/settings.dto';

@Controller('settings')
@UseGuards(RoutePolicyGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  getSettings(): AppSettings {
    return this.settingsService.getAll();
  }

  @Patch()
  @HttpCode(200)
  @RoutePolicy({ access: { mode: 'authenticated', rba: [['minRank', 3]] } })
  async updateSettings(@Body() body: unknown): Promise<AppSettings> {
    const result = updateSettingsSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    if (Object.keys(result.data).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }
    return this.settingsService.update(result.data);
  }
}
