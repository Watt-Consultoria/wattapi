import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { getRank } from '../../common/guards/role-hierarchy';
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/notification.dto';
import { NotificationResponseDto } from './dto/notification.response.dto';
import type { NotificationResponse } from './dto/notification.response.dto';

type AuthRequest = Request & {
  jwtData: JwtData;
  user: UserResponse;
};

@Controller('notifications')
@UseGuards(RoutePolicyGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [NotificationResponseDto] })
  findAll(@Req() req: AuthRequest): Promise<NotificationResponse[]> {
    return this.notificationsService.findAll(req.jwtData.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  remove(@Param('id') id: string, @Req() req: AuthRequest): Promise<void> {
    return this.notificationsService.softDelete(id, req.jwtData.sub);
  }

  @Post()
  @HttpCode(201)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  create(
    @Body() body: CreateNotificationDto,
    @Req() req: AuthRequest,
  ): Promise<{ count: number }> {
    const rank = getRank(req.user.role);
    return this.notificationsService.createDirected(
      req.jwtData.sub,
      rank,
      body,
    );
  }
}
