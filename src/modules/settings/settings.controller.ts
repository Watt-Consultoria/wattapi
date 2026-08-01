import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';
import { AppSettingsDto } from './dto/settings.response.dto';
import type { AppSettings } from './dto/settings.response.dto';

@Controller('settings')
@UseGuards(RoutePolicyGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: AppSettingsDto })
  getSettings(): AppSettings {
    return this.settingsService.getAll();
  }

  @Patch()
  @HttpCode(200)
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['assessor', 'presidente']]],
    },
  })
  @ApiResponse({ status: 200, type: AppSettingsDto })
  async updateSettings(@Body() body: UpdateSettingsDto): Promise<AppSettings> {
    if (Object.keys(body).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }
    return this.settingsService.update(body);
  }
}
