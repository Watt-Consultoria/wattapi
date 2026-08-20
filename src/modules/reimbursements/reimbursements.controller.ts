import {
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
import { ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { ReimbursementsService } from './reimbursements.service';
import {
  CreateReimbursementDto,
  UpdateReimbursementStatusDto,
} from './dto/reimbursement.dto';
import { ReimbursementResponseDto } from './dto/reimbursement.response.dto';
import type { ReimbursementResponse } from './dto/reimbursement.response.dto';

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
  @ApiResponse({ status: 201, type: ReimbursementResponseDto })
  create(
    @Body() body: CreateReimbursementDto,
    @Req() req: AuthRequest,
  ): Promise<ReimbursementResponse> {
    return this.reimbursementsService.create(req.jwtData.sub, body);
  }

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [ReimbursementResponseDto] })
  findAll(
    @Query('target') target = 'me',
    @Req() req: AuthRequest,
  ): Promise<ReimbursementResponse[]> {
    return this.reimbursementsService.findAll(req.user, target);
  }

  @Get(':user_id')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [ReimbursementResponseDto] })
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
  @ApiResponse({ status: 200, type: ReimbursementResponseDto })
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateReimbursementStatusDto,
    @Req() req: AuthRequest,
  ): Promise<ReimbursementResponse> {
    return this.reimbursementsService.updateStatus(id, req.jwtData.sub, body);
  }
}
