import { Controller, Get } from '@nestjs/common';
import { StatusResponse, StatusService } from './status.service';

@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  getStatus(): Promise<StatusResponse> {
    return this.statusService.getStatus();
  }
}
