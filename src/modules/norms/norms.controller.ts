import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { NormsService } from './norms.service';
import { CreateNormDto, UpdateNormDto } from './dto/norm.dto';
import { NormResponseDto } from './dto/norm.response.dto';
import type { NormResponse } from './dto/norm.response.dto';

@Controller('norms')
@UseGuards(RoutePolicyGuard)
export class NormsController {
  constructor(private readonly normsService: NormsService) {}

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [NormResponseDto] })
  findAll(): Promise<NormResponse[]> {
    return this.normsService.findAll();
  }

  @Post()
  @HttpCode(201)
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['assessor', 'presidente']]],
    },
  })
  @ApiResponse({ status: 201, type: NormResponseDto })
  create(@Body() body: CreateNormDto): Promise<NormResponse> {
    return this.normsService.create(body);
  }

  @Put(':id')
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['assessor', 'presidente']]],
    },
  })
  @ApiResponse({ status: 200, type: NormResponseDto })
  update(
    @Param('id') id: string,
    @Body() body: UpdateNormDto,
  ): Promise<NormResponse> {
    return this.normsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['assessor', 'presidente']]],
    },
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.normsService.delete(id);
  }
}
