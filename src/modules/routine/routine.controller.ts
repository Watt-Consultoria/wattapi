import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { RoutineService } from './routine.service';
import { UpsertRoutineDto } from './dto/routine.dto';
import type { SlotsGrid, SummaryResponse } from './dto/routine.dto';
import {
  RoutineSlotsResponseDto,
  SummaryResponseDto,
} from './dto/routine.response.dto';

type AuthRequest = Request & {
  jwtData: JwtData;
  user: UserResponse;
};

@Controller('routine')
@UseGuards(RoutePolicyGuard)
export class RoutineController {
  constructor(private readonly routineService: RoutineService) {}

  @Put()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  upsert(
    @Body() body: UpsertRoutineDto,
    @Req() req: AuthRequest,
  ): Promise<void> {
    return this.routineService.upsertRoutine(req.jwtData.sub, body.slots);
  }

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: RoutineSlotsResponseDto })
  getOwn(@Req() req: AuthRequest): Promise<{ slots: SlotsGrid | null }> {
    return this.routineService.getOwnRoutine(req.jwtData.sub);
  }

  @Get('summary')
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['gerente', 'diretor', 'assessor', 'presidente']]],
    },
  })
  @ApiResponse({ status: 200, type: SummaryResponseDto })
  getSummary(@Req() req: AuthRequest): Promise<SummaryResponse> {
    return this.routineService.getSummary(req.user);
  }

  @Get(':userId')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: RoutineSlotsResponseDto })
  getByUser(
    @Param('userId') userId: string,
    @Req() req: AuthRequest,
  ): Promise<{ slots: SlotsGrid | null }> {
    return this.routineService.getRoutineByUserId(req.user, userId);
  }
}
