import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { HousesService } from './houses.service';
import { AssignHouseDto } from './dto/house.dto';
import {
  HouseResponseDto,
  HouseMemberResponseDto,
  AssignHouseResponseDto,
} from './dto/house.response.dto';
import type {
  HouseResponse,
  HouseMemberResponse,
  AssignHouseResponse,
} from './dto/house.response.dto';

@Controller('houses')
@UseGuards(RoutePolicyGuard)
export class HousesController {
  constructor(private readonly housesService: HousesService) {}

  @Get()
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [HouseResponseDto] })
  findAll(): Promise<HouseResponse[]> {
    return this.housesService.findAll();
  }

  @Get(':id/members')
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiResponse({ status: 200, type: [HouseMemberResponseDto] })
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
  @ApiResponse({ status: 200, type: AssignHouseResponseDto })
  assignHouse(
    @Param('user_id') userId: string,
    @Body() body: AssignHouseDto,
  ): Promise<AssignHouseResponse> {
    return this.housesService.assignHouse(userId, body.house_id);
  }
}
