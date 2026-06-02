import {
  BadRequestException,
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
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { PortfolioService } from './portfolio.service';
import {
  createPortfolioItemSchema,
  updatePortfolioItemSchema,
} from './dto/portfolio.dto';
import type { PortfolioItemResponse } from './dto/portfolio.dto';

@Controller('portfolio')
@UseGuards(RoutePolicyGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  findAll(): Promise<PortfolioItemResponse[]> {
    return this.portfolioService.findAll();
  }

  @Post()
  @HttpCode(201)
  @RoutePolicy({ access: { mode: 'authenticated', rba: [['minRank', 2]] } })
  create(@Body() body: unknown): Promise<PortfolioItemResponse> {
    const result = createPortfolioItemSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.portfolioService.create(result.data);
  }

  @Patch(':id')
  @RoutePolicy({ access: { mode: 'authenticated', rba: [['minRank', 2]] } })
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<PortfolioItemResponse> {
    const result = updatePortfolioItemSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.portfolioService.update(id, result.data);
  }

  @Delete(':id')
  @HttpCode(204)
  @RoutePolicy({ access: { mode: 'authenticated', rba: [['minRank', 2]] } })
  async remove(@Param('id') id: string): Promise<void> {
    return this.portfolioService.remove(id);
  }
}
