import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { RoutineService } from './routine.service';
import { upsertRoutineSchema } from './dto/routine.dto';
import type { SlotsGrid, SummaryResponse } from './dto/routine.dto';

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
  upsert(@Body() body: unknown, @Req() req: AuthRequest): Promise<void> {
    const result = upsertRoutineSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.routineService.upsertRoutine(
      req.jwtData.sub,
      result.data.slots,
    );
  }

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
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
  getSummary(@Req() req: AuthRequest): Promise<SummaryResponse> {
    return this.routineService.getSummary(req.user);
  }

  @Get(':userId')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  getByUser(
    @Param('userId') userId: string,
    @Req() req: AuthRequest,
  ): Promise<{ slots: SlotsGrid | null }> {
    return this.routineService.getRoutineByUserId(req.user, userId);
  }
}
