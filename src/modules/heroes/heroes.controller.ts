import {
  BadRequestException,
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
import { HeroesService } from './heroes.service';
import { CreateHeroDto, UpdateHeroDto } from './dto/hero.dto';
import { HeroResponseDto } from './dto/hero.response.dto';
import type { HeroResponse } from './dto/hero.response.dto';

@Controller('heroes')
@UseGuards(RoutePolicyGuard)
export class HeroesController {
  constructor(private readonly heroesService: HeroesService) {}

  @Post()
  @HttpCode(201)
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['assessor', 'presidente']]],
    },
  })
  @ApiResponse({ status: 201, type: HeroResponseDto })
  create(@Body() body: CreateHeroDto): Promise<HeroResponse> {
    return this.heroesService.create(body);
  }

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [HeroResponseDto] })
  findAll(): Promise<HeroResponse[]> {
    return this.heroesService.findAll();
  }

  @Get(':id')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: HeroResponseDto })
  findOne(@Param('id') id: string): Promise<HeroResponse> {
    return this.heroesService.findOne(id);
  }

  @Patch(':id')
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['assessor', 'presidente']]],
    },
  })
  @ApiResponse({ status: 200, type: HeroResponseDto })
  update(
    @Param('id') id: string,
    @Body() body: UpdateHeroDto,
  ): Promise<HeroResponse> {
    if (Object.keys(body).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }
    return this.heroesService.update(id, body);
  }
}
