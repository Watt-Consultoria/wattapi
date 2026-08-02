import {
  Body,
  Controller,
  Delete,
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
import { PortfolioService } from './portfolio.service';
import {
  CreatePortfolioItemDto,
  UpdatePortfolioItemDto,
} from './dto/portfolio.dto';
import { PortfolioItemResponseDto } from './dto/portfolio.response.dto';
import type { PortfolioItemResponse } from './dto/portfolio.response.dto';

@Controller('portfolio')
@UseGuards(RoutePolicyGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [PortfolioItemResponseDto] })
  findAll(): Promise<PortfolioItemResponse[]> {
    return this.portfolioService.findAll();
  }

  @Post()
  @HttpCode(201)
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['diretor', 'assessor', 'presidente']]],
    },
  })
  @ApiResponse({ status: 201, type: PortfolioItemResponseDto })
  create(@Body() body: CreatePortfolioItemDto): Promise<PortfolioItemResponse> {
    return this.portfolioService.create(body);
  }

  @Patch(':id')
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['diretor', 'assessor', 'presidente']]],
    },
  })
  @ApiResponse({ status: 200, type: PortfolioItemResponseDto })
  update(
    @Param('id') id: string,
    @Body() body: UpdatePortfolioItemDto,
  ): Promise<PortfolioItemResponse> {
    return this.portfolioService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['diretor', 'assessor', 'presidente']]],
    },
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.portfolioService.remove(id);
  }
}
