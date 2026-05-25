import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { isSuperuser } from '../../common/guards/role-hierarchy';
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { TimeTrackingService } from './time-tracking.service';
import {
  ClockInResponseSchema,
  ClockOutValidResponseSchema,
  ClockOutAnnulledResponseSchema,
  SummaryResponseSchema,
  TimeEntriesListResponseSchema,
} from './dto/time-tracking.dto';
import type {
  ClockInResponse,
  ClockOutResponse,
  SummaryResponse,
  TimeEntriesListResponse,
} from './dto/time-tracking.dto';

type PolicyRequest = Request & {
  jwtData: JwtData;
  user: UserResponse;
};

@ApiTags('Time Entries')
@ApiBearerAuth()
@Controller('time-entries')
@UseGuards(RoutePolicyGuard)
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Get('/summary')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiOperation({
    summary: 'Resumo semanal de toda a equipe',
    description:
      'Retorna o resumo de horas semanais de todos os membros ativos. ' +
      'Requer permissão de superusuário (assessor/presidente). ' +
      'Use o parâmetro `week` para consultar semanas anteriores (0 = semana atual, 1 = semana passada, etc.).',
  })
  @ApiQuery({
    name: 'week',
    required: false,
    description: 'Offset de semana (0 = atual, 1 = anterior, ...)',
    example: '0',
    schema: { type: 'string', default: '0' },
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo semanal da equipe',
    type: TimeEntriesListResponseSchema,
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({
    description: 'Requer superusuário (assessor/presidente)',
  })
  listWeeklySummary(
    @Req() req: PolicyRequest,
    @Query('week') week = '0',
  ): Promise<TimeEntriesListResponse> {
    if (!isSuperuser(req.user.role)) {
      throw new ForbiddenException(
        'Acesso negado: apenas superusuários podem acessar a listagem geral',
      );
    }

    const weekOffset = parseInt(week, 10);
    if (!Number.isInteger(weekOffset) || isNaN(weekOffset) || weekOffset < 0) {
      throw new BadRequestException(
        'O parâmetro week deve ser um inteiro >= 0',
      );
    }

    return this.timeTrackingService.getWeeklySummaryList(weekOffset);
  }

  @Post('clock-in')
  @HttpCode(201)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiOperation({
    summary: 'Registrar entrada (clock-in)',
    description:
      'Inicia uma nova sessão de trabalho para o usuário autenticado. ' +
      'Retorna erro 409 se já houver uma sessão aberta.',
  })
  @ApiResponse({
    status: 201,
    description: 'Sessão iniciada com sucesso',
    type: ClockInResponseSchema,
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiResponse({ status: 409, description: 'Já existe uma sessão aberta' })
  clockIn(@Req() req: PolicyRequest): Promise<ClockInResponse> {
    return this.timeTrackingService.clockIn(req.jwtData.sub);
  }

  @Post('clock-out')
  @HttpCode(200)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiOperation({
    summary: 'Registrar saída (clock-out)',
    description:
      'Encerra a sessão de trabalho aberta do usuário autenticado. ' +
      'Se a sessão exceder 480 minutos (8 horas), ela é marcada como `annulled` com `reason: exceeded_max_duration`. ' +
      'Retorna erro 409 se não houver sessão aberta.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sessão encerrada — válida',
    type: ClockOutValidResponseSchema,
  })
  @ApiResponse({
    status: 200,
    description: 'Sessão encerrada — anulada por exceder 8 horas',
    type: ClockOutAnnulledResponseSchema,
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiResponse({ status: 409, description: 'Nenhuma sessão aberta encontrada' })
  clockOut(@Req() req: PolicyRequest): Promise<ClockOutResponse> {
    return this.timeTrackingService.clockOut(req.jwtData.sub);
  }

  @Get('summary/me')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiOperation({
    summary: 'Resumo semanal do usuário autenticado',
    description:
      'Retorna o resumo de horas da semana atual do próprio usuário, incluindo sessões válidas e estado da sessão atual.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo semanal do usuário',
    type: SummaryResponseSchema,
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  summaryMe(@Req() req: PolicyRequest): Promise<SummaryResponse> {
    const requesterId = req.jwtData.sub;
    const requesterRole = req.user.role;
    return this.timeTrackingService.getSummary(
      requesterId,
      requesterRole,
      requesterId,
    );
  }

  @Get('summary/:userId')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiOperation({
    summary: 'Resumo semanal de um usuário específico',
    description:
      'Retorna o resumo semanal de um usuário pelo ID. ' +
      'Requer permissão de superusuário (assessor/presidente).',
  })
  @ApiParam({
    name: 'userId',
    description: 'UUID do usuário alvo',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo semanal do usuário',
    type: SummaryResponseSchema,
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  @ApiForbiddenResponse({
    description: 'Requer superusuário (assessor/presidente)',
  })
  summaryByUserId(
    @Req() req: PolicyRequest,
    @Param('userId') userId: string,
  ): Promise<SummaryResponse> {
    const requesterId = req.jwtData.sub;
    const requesterRole = req.user.role;

    if (!isSuperuser(requesterRole)) {
      throw new ForbiddenException(
        'Acesso negado: apenas superusuários podem ver o resumo de outros usuários',
      );
    }

    return this.timeTrackingService.getSummary(
      requesterId,
      requesterRole,
      userId,
    );
  }
}
