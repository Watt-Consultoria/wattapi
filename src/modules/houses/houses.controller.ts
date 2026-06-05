import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { HousesService } from './houses.service';
import { assignHouseSchema } from './dto/house.dto';
import type { HouseResponse, HouseMemberResponse } from './dto/house.dto';

@Controller('houses')
@UseGuards(RoutePolicyGuard)
export class HousesController {
  constructor(private readonly housesService: HousesService) {}

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  findAll(): Promise<HouseResponse[]> {
    return this.housesService.findAll();
  }

  @Get(':id/members')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  findMembers(@Param('id') id: string): Promise<HouseMemberResponse[]> {
    return this.housesService.findMembers(id);
  }

  @Patch('members/:user_id')
  @RoutePolicy({
    access: {
      mode: 'authenticated',
      rba: [['role', ['assessor', 'presidente']]],
    },
  })
  assignHouse(
    @Param('user_id') userId: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const result = assignHouseSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.housesService.assignHouse(userId, result.data.house_id);
  }
}
