import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { getRank } from '../../common/guards/role-hierarchy';
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { ActivitiesService } from './activities.service';
import { createActivitySchema, updateActivitySchema } from './dto/activity.dto';
import type { ActivityResponse } from './dto/activity.dto';

type AuthRequest = Request & {
  jwtData: JwtData;
  user: UserResponse;
};

@Controller('activities')
@UseGuards(RoutePolicyGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @HttpCode(201)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  create(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<ActivityResponse> {
    const result = createActivitySchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.activitiesService.create(req.jwtData.sub, result.data);
  }

  @Get('me')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  findOwn(
    @Req() req: AuthRequest,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<ActivityResponse[]> {
    const rank = getRank(req.user.role);
    return this.activitiesService.findAll(
      req.jwtData.sub,
      rank,
      req.user.sector,
      { date, from, to, userId: req.jwtData.sub },
    );
  }

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  findAll(
    @Req() req: AuthRequest,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('id') userId?: string,
  ): Promise<ActivityResponse[]> {
    const rank = getRank(req.user.role);
    return this.activitiesService.findAll(
      req.jwtData.sub,
      rank,
      req.user.sector,
      { date, from, to, userId },
    );
  }

  @Patch(':id')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<ActivityResponse> {
    const result = updateActivitySchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    if (Object.keys(result.data).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }
    return this.activitiesService.update(id, req.jwtData.sub, result.data);
  }

  @Delete(':id')
  @HttpCode(204)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  remove(@Param('id') id: string, @Req() req: AuthRequest): Promise<void> {
    return this.activitiesService.remove(id, req.jwtData.sub);
  }
}
