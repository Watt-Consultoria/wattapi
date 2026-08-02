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
import { ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { getRank, getVisibleSectors } from '../../common/guards/role-hierarchy';
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';
import { ActivityResponseDto } from './dto/activity.response.dto';
import type { ActivityResponse } from './dto/activity.response.dto';

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
  @ApiResponse({ status: 201, type: ActivityResponseDto })
  create(
    @Body() body: CreateActivityDto,
    @Req() req: AuthRequest,
  ): Promise<ActivityResponse> {
    return this.activitiesService.create(req.jwtData.sub, body);
  }

  @Get('me')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [ActivityResponseDto] })
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
      getVisibleSectors(req.user.sector, req.user.role),
      { date, from, to, userId: req.jwtData.sub },
    );
  }

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [ActivityResponseDto] })
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
      getVisibleSectors(req.user.sector, req.user.role),
      { date, from, to, userId },
    );
  }

  @Patch(':id')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: ActivityResponseDto })
  update(
    @Param('id') id: string,
    @Body() body: UpdateActivityDto,
    @Req() req: AuthRequest,
  ): Promise<ActivityResponse> {
    if (Object.keys(body).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }
    return this.activitiesService.update(id, req.jwtData.sub, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  remove(@Param('id') id: string, @Req() req: AuthRequest): Promise<void> {
    return this.activitiesService.remove(id, req.jwtData.sub);
  }
}
