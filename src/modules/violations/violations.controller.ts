import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
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
import { ViolationsService } from './violations.service';
import { CreateViolationDto } from './dto/violation.dto';
import {
  MeViolationsResponseDto,
  MemberViolationsResponseDto,
  ViolationResponseWithAppliedByDto,
} from './dto/violation.response.dto';
import type {
  MeViolationsResponse,
  MemberViolationsResponse,
  ViolationResponseWithAppliedBy,
} from './dto/violation.response.dto';

type AuthRequest = Request & {
  jwtData: JwtData;
  user: UserResponse;
};

@Controller('violations')
@UseGuards(RoutePolicyGuard)
export class ViolationsController {
  constructor(private readonly violationsService: ViolationsService) {}

  @Get('me')
  @RoutePolicy({
    access: { mode: 'authenticated' },
  })
  @ApiResponse({ status: 200, type: MeViolationsResponseDto })
  findMine(@Req() req: AuthRequest): Promise<MeViolationsResponse> {
    return this.violationsService.findMine(req.jwtData.sub);
  }

  @Get()
  @RoutePolicy({
    access: { mode: 'authenticated' },
  })
  @ApiResponse({ status: 200, type: [MemberViolationsResponseDto] })
  findSubordinates(
    @Req() req: AuthRequest,
    @Query('user_id') userId?: string,
  ): Promise<MemberViolationsResponse[]> {
    return this.violationsService.findSubordinates(req.user, userId);
  }

  @Get(':id')
  @RoutePolicy({
    access: { mode: 'authenticated' },
  })
  @ApiResponse({ status: 200, type: ViolationResponseWithAppliedByDto })
  findOne(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ): Promise<ViolationResponseWithAppliedBy> {
    return this.violationsService.findOne(id, req.user);
  }

  @Post()
  @HttpCode(201)
  @RoutePolicy({
    access: {
      mode: 'authenticated',
    },
  })
  @ApiResponse({ status: 201, type: ViolationResponseWithAppliedByDto })
  create(
    @Body() body: CreateViolationDto,
    @Req() req: AuthRequest,
  ): Promise<ViolationResponseWithAppliedBy> {
    return this.violationsService.create(req.user, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RoutePolicy({
    access: { mode: 'authenticated' },
  })
  cancel(@Param('id') id: string, @Req() req: AuthRequest): Promise<void> {
    return this.violationsService.cancel(id, req.user);
  }
}
