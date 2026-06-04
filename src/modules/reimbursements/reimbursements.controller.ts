import {
  BadRequestException,
  Body,
  Controller,
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
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { ReimbursementsService } from './reimbursements.service';
import {
  createReimbursementSchema,
  updateReimbursementStatusSchema,
} from './dto/reimbursement.dto';
import type { ReimbursementResponse } from './dto/reimbursement.dto';

type AuthRequest = Request & {
  jwtData: JwtData;
  user: UserResponse;
};

@Controller('reimbursements')
@UseGuards(RoutePolicyGuard)
export class ReimbursementsController {
  constructor(private readonly reimbursementsService: ReimbursementsService) {}

  @Post()
  @HttpCode(201)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  create(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<ReimbursementResponse> {
    const result = createReimbursementSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.reimbursementsService.create(req.jwtData.sub, result.data);
  }

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  findAll(
    @Query('target') target = 'me',
    @Req() req: AuthRequest,
  ): Promise<ReimbursementResponse[]> {
    return this.reimbursementsService.findAll(req.user, target);
  }

  @Get(':user_id')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  findByUser(
    @Param('user_id') userId: string,
    @Req() req: AuthRequest,
  ): Promise<ReimbursementResponse[]> {
    return this.reimbursementsService.findByUser(req.user, userId);
  }

  @Patch(':id/status')
  @RoutePolicy({
    access: { mode: 'authenticated', rba: [['role', ['presidente']]] },
  })
  updateStatus(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ReimbursementResponse> {
    const result = updateReimbursementStatusSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.reimbursementsService.updateStatus(id, result.data);
  }
}
