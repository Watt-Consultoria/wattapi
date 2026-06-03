import {
  BadRequestException,
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
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { NormsService } from './norms.service';
import { createNormSchema, updateNormSchema } from './dto/norm.dto';
import type { NormResponse } from './dto/norm.dto';

@Controller('norms')
@UseGuards(RoutePolicyGuard)
export class NormsController {
  constructor(private readonly normsService: NormsService) {}

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  findAll(): Promise<NormResponse[]> {
    return this.normsService.findAll();
  }

  @Post()
  @HttpCode(201)
  @RoutePolicy({ access: { mode: 'authenticated', rba: [['minRank', 3]] } })
  create(@Body() body: unknown): Promise<NormResponse> {
    const result = createNormSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.normsService.create(result.data);
  }

  @Put(':id')
  @RoutePolicy({ access: { mode: 'authenticated', rba: [['minRank', 3]] } })
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<NormResponse> {
    const result = updateNormSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.normsService.update(id, result.data);
  }

  @Delete(':id')
  @HttpCode(204)
  @RoutePolicy({ access: { mode: 'authenticated', rba: [['minRank', 3]] } })
  remove(@Param('id') id: string): Promise<void> {
    return this.normsService.delete(id);
  }
}
