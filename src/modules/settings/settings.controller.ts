import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { SettingsService } from './settings.service';
import { updateSettingsSchema } from './dto/settings.dto';
import type { AppSettings } from './dto/settings.dto';
import { AppSettingsSchema, UpdateSettingsBody } from './dto/settings.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(RoutePolicyGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiOperation({
    summary: 'Consultar configurações da aplicação',
    description:
      'Retorna as configurações globais da aplicação, como o mínimo de horas semanais exigidas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Configurações atuais',
    type: AppSettingsSchema,
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  getSettings(): AppSettings {
    return this.settingsService.getAll();
  }

  @Patch()
  @HttpCode(200)
  @RoutePolicy({ access: { mode: 'authenticated', rba: [['minRank', 3]] } })
  @ApiOperation({
    summary: 'Atualizar configurações da aplicação',
    description:
      'Atualiza as configurações globais. ' +
      'Requer permissão de superusuário (assessor ou presidente). ' +
      'Pelo menos um campo deve ser informado.',
  })
  @ApiBody({ type: UpdateSettingsBody })
  @ApiResponse({
    status: 200,
    description: 'Configurações atualizadas',
    type: AppSettingsSchema,
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({
    description: 'Requer rank >= 3 (assessor/presidente)',
  })
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
