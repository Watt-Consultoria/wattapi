import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { WalletAccountsService } from './wallet-accounts.service';
import {
  CreateWalletAccountDto,
  UpdateWalletAccountDto,
} from './dto/account.dto';
import {
  WalletAccountResponseDto,
  type WalletAccountResponse,
} from './dto/account.response.dto';
import {
  PRESIDENTE_ACCESS,
  DIRECTOR_UP_ACCESS,
} from './wallet-access.constants';

type AuthRequest = Request & {
  jwtData: JwtData;
  user: UserResponse;
};

@Controller('wallet/accounts')
@UseGuards(RoutePolicyGuard)
export class WalletAccountsController {
  constructor(private readonly service: WalletAccountsService) {}

  @Post()
  @HttpCode(201)
  @RoutePolicy({ access: PRESIDENTE_ACCESS })
  @ApiResponse({ status: 201, type: WalletAccountResponseDto })
  create(
    @Body() body: CreateWalletAccountDto,
    @Req() req: AuthRequest,
  ): Promise<WalletAccountResponse> {
    return this.service.create(req.jwtData.sub, body);
  }

  @Patch(':id')
  @RoutePolicy({ access: PRESIDENTE_ACCESS })
  @ApiResponse({ status: 200, type: WalletAccountResponseDto })
  update(
    @Param('id') id: string,
    @Body() body: UpdateWalletAccountDto,
  ): Promise<WalletAccountResponse> {
    return this.service.update(id, body);
  }

  @Get()
  @RoutePolicy({ access: DIRECTOR_UP_ACCESS })
  @ApiResponse({ status: 200, type: [WalletAccountResponseDto] })
  findAll(): Promise<WalletAccountResponse[]> {
    return this.service.findAll();
  }

  @Get(':id')
  @RoutePolicy({ access: DIRECTOR_UP_ACCESS })
  @ApiResponse({ status: 200, type: WalletAccountResponseDto })
  findById(@Param('id') id: string): Promise<WalletAccountResponse> {
    return this.service.findById(id);
  }
}
