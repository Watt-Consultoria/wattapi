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
import { AlmoxarifadoEmprestimoService } from './almoxarifado-emprestimo.service';
import {
  CreateAlmoxarifadoEmprestimoDto,
  ReturnAlmoxarifadoEmprestimoDto,
} from './dto/almoxarifado-emprestimo.dto';
import { AlmoxarifadoEmprestimoResponseDto } from './dto/almoxarifado-emprestimo.response.dto';
import type { AlmoxarifadoEmprestimoResponse } from './dto/almoxarifado-emprestimo.response.dto';

type AuthRequest = Request & {
  jwtData: JwtData;
  user: UserResponse;
};

@Controller('almoxarifado/emprestimos')
@UseGuards(RoutePolicyGuard)
export class AlmoxarifadoEmprestimoController {
  constructor(
    private readonly almoxarifadoEmprestimoService: AlmoxarifadoEmprestimoService,
  ) {}

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [AlmoxarifadoEmprestimoResponseDto] })
  findAll(): Promise<AlmoxarifadoEmprestimoResponse[]> {
    return this.almoxarifadoEmprestimoService.findAll();
  }

  @Post()
  @HttpCode(201)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 201, type: AlmoxarifadoEmprestimoResponseDto })
  create(
    @Body() body: CreateAlmoxarifadoEmprestimoDto,
    @Req() req: AuthRequest,
  ): Promise<AlmoxarifadoEmprestimoResponse> {
    return this.almoxarifadoEmprestimoService.create(req.jwtData.sub, body);
  }

  @Patch(':id')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: AlmoxarifadoEmprestimoResponseDto })
  returnLoan(
    @Param('id') id: string,
    @Body() body: ReturnAlmoxarifadoEmprestimoDto,
  ): Promise<AlmoxarifadoEmprestimoResponse> {
    return this.almoxarifadoEmprestimoService.returnLoan(id, body);
  }
}
