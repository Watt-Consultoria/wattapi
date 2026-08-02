import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { StatusResponse, StatusService } from './status.service';
import { StatusResponseDto } from './dto/status.response.dto';

@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  @ApiResponse({ status: 200, type: StatusResponseDto })
  getStatus(): Promise<StatusResponse> {
    return this.statusService.getStatus();
  }
}
