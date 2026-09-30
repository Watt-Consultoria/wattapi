import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { AlmoxarifadoMaterialService } from './almoxarifado-material.service';
import {
  CreateAlmoxarifadoMaterialDto,
  UpdateAlmoxarifadoMaterialDto,
} from './dto/almoxarifado-material.dto';
import { AlmoxarifadoMaterialResponseDto } from './dto/almoxarifado-material.response.dto';
import type { AlmoxarifadoMaterialResponse } from './dto/almoxarifado-material.response.dto';

const GERENTE_E_ACIMA = ['gerente', 'diretor', 'assessor', 'presidente'];

@Controller('almoxarifado/material')
@UseGuards(RoutePolicyGuard)
export class AlmoxarifadoMaterialController {
  constructor(
    private readonly almoxarifadoMaterialService: AlmoxarifadoMaterialService,
  ) {}

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [AlmoxarifadoMaterialResponseDto] })
  findAll(): Promise<AlmoxarifadoMaterialResponse[]> {
    return this.almoxarifadoMaterialService.findAll();
  }

  @Post()
  @HttpCode(201)
  @RoutePolicy({
    access: { mode: 'authenticated', rba: [['role', GERENTE_E_ACIMA]] },
  })
  @ApiResponse({ status: 201, type: AlmoxarifadoMaterialResponseDto })
  create(
    @Body() body: CreateAlmoxarifadoMaterialDto,
  ): Promise<AlmoxarifadoMaterialResponse> {
    return this.almoxarifadoMaterialService.create(body);
  }

  @Patch(':id')
  @RoutePolicy({
    access: { mode: 'authenticated', rba: [['role', GERENTE_E_ACIMA]] },
  })
  @ApiResponse({ status: 200, type: AlmoxarifadoMaterialResponseDto })
  update(
    @Param('id') id: string,
    @Body() body: UpdateAlmoxarifadoMaterialDto,
  ): Promise<AlmoxarifadoMaterialResponse> {
    return this.almoxarifadoMaterialService.update(id, body);
  }
}
