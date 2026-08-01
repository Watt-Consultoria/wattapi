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
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import type { JwtData } from '../../common/guards/jwt.guard';
import { PushSubscriptionsService } from './push-subscriptions.service';
import { CreatePushSubscriptionDto } from './dto/push-subscription.dto';

type AuthRequest = Request & { jwtData: JwtData };

@Controller('push-subscriptions')
@UseGuards(RoutePolicyGuard)
export class PushSubscriptionsController {
  constructor(
    private readonly pushSubscriptionsService: PushSubscriptionsService,
  ) {}

  @Get('vapid-public-key')
  @RoutePolicy({ access: { mode: 'unauthenticated' } })
  getVapidPublicKey(): { vapid_public_key: string } {
    return this.pushSubscriptionsService.getVapidPublicKey();
  }

  @Post()
  @HttpCode(201)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  register(
    @Body() body: CreatePushSubscriptionDto,
    @Req() req: AuthRequest,
  ): Promise<{ id: string }> {
    return this.pushSubscriptionsService.register(req.jwtData.sub, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  unregister(@Param('id') id: string, @Req() req: AuthRequest): Promise<void> {
    return this.pushSubscriptionsService.unregister(id, req.jwtData.sub);
  }
}
