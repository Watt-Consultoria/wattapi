import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import { WalletTransactionsService } from './wallet-transactions.service';
import { CreateWalletTransactionDto } from './dto/transaction.dto';
import {
  WalletTransactionResponseDto,
  type WalletTransactionResponse,
} from './dto/transaction.response.dto';
import {
  PRESIDENTE_ACCESS,
  DIRECTOR_UP_ACCESS,
} from './wallet-access.constants';

type AuthRequest = Request & {
  jwtData: JwtData;
  user: UserResponse;
};

@Controller('wallet/transactions')
@UseGuards(RoutePolicyGuard)
export class WalletTransactionsController {
  constructor(private readonly service: WalletTransactionsService) {}

  @Post()
  @HttpCode(201)
  @RoutePolicy({ access: PRESIDENTE_ACCESS })
  @ApiResponse({ status: 201, type: WalletTransactionResponseDto })
  create(
    @Body() body: CreateWalletTransactionDto,
    @Req() req: AuthRequest,
  ): Promise<WalletTransactionResponse> {
    return this.service.create(req.jwtData.sub, body);
  }

  @Get()
  @RoutePolicy({ access: DIRECTOR_UP_ACCESS })
  @ApiResponse({ status: 200, type: [WalletTransactionResponseDto] })
  findAll(
    @Query('account_id') accountId?: string,
  ): Promise<WalletTransactionResponse[]> {
    return this.service.findAll({ account_id: accountId });
  }
}
