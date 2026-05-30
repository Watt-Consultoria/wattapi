import {
  BadRequestException,
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
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { getRank } from '../../common/guards/role-hierarchy';
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { NotificationsService } from './notifications.service';
import { createNotificationSchema } from './dto/notification.dto';
import type { NotificationResponse } from './dto/notification.dto';

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
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<{ count: number }> {
    const result = createNotificationSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    const rank = getRank(req.user.role);
    return this.notificationsService.createDirected(
      req.jwtData.sub,
      rank,
      result.data,
    );
  }
}
