import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { SelectionProcessService } from './selection-process.service';
import {
  createProcessSchema,
  updateProcessSchema,
  createApplicationSchema,
  updateApplicationStatusSchema,
  createStageSchema,
  updateStageSchema,
  updateCandidateStatusSchema,
} from './dto/selection-process.dto';
import type {
  SelectionProcessResponse,
  ApplicationResponse,
  ApplicationCreatedResponse,
  StageResponse,
  CandidateResponse,
} from './dto/selection-process.dto';

const ADMIN_ACCESS = {
  mode: 'authenticated' as const,
  rba: [['role', ['assessor', 'presidente']] as ['role', string[]]],
};

const ANY_AUTH = { mode: 'authenticated' as const };

@Controller('selection-process')
@UseGuards(RoutePolicyGuard)
export class SelectionProcessController {
  constructor(private readonly service: SelectionProcessService) {}

  @Post()
  @HttpCode(201)
  @RoutePolicy({ access: ADMIN_ACCESS })
  createProcess(@Body() body: unknown): Promise<SelectionProcessResponse> {
    const result = createProcessSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.service.createProcess(result.data);
  }

  @Get()
  @RoutePolicy({ access: ANY_AUTH })
  findAll(): Promise<SelectionProcessResponse[]> {
    return this.service.findAll();
  }

  @Patch(':processId')
  @RoutePolicy({ access: ADMIN_ACCESS })
  updateProcess(
    @Param('processId') processId: string,
    @Body() body: unknown,
  ): Promise<SelectionProcessResponse> {
    const result = updateProcessSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.service.updateProcess(processId, result.data);
  }

  @Post('applications')
  @HttpCode(201)
  @RoutePolicy({ access: { mode: 'unauthenticated' } })
  createApplication(
    @Body() body: unknown,
  ): Promise<ApplicationCreatedResponse> {
    const result = createApplicationSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.service.createApplication(result.data);
  }

  @Get('applications')
  @RoutePolicy({ access: ANY_AUTH })
  findApplications(
    @Query('selection_process_id') selectionProcessId?: string,
  ): Promise<ApplicationResponse[]> {
    return this.service.findApplications(selectionProcessId);
  }

  @Patch('applications/:applicationId')
  @RoutePolicy({ access: ADMIN_ACCESS })
  updateApplicationStatus(
    @Param('applicationId') applicationId: string,
    @Body() body: unknown,
  ): Promise<ApplicationResponse> {
    const result = updateApplicationStatusSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.service.updateApplicationStatus(applicationId, result.data);
  }

  @Post('stages')
  @HttpCode(201)
  @RoutePolicy({ access: ADMIN_ACCESS })
  createStage(@Body() body: unknown): Promise<StageResponse> {
    const result = createStageSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.service.createStage(result.data);
  }

  @Get('stages')
  @RoutePolicy({ access: ANY_AUTH })
  findStages(
    @Query('selection_process_id') selectionProcessId?: string,
  ): Promise<StageResponse[]> {
    return this.service.findStages(selectionProcessId);
  }

  @Put('stages/:stageId')
  @RoutePolicy({ access: ADMIN_ACCESS })
  updateStage(
    @Param('stageId') stageId: string,
    @Body() body: unknown,
  ): Promise<StageResponse> {
    const result = updateStageSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.service.updateStage(stageId, result.data);
  }

  @Get('candidates')
  @RoutePolicy({ access: ANY_AUTH })
  findCandidates(
    @Query('selection_process_id') selectionProcessId?: string,
    @Query('stage_id') stageId?: string,
  ): Promise<CandidateResponse[]> {
    return this.service.findCandidates({ selectionProcessId, stageId });
  }

  @Patch('candidates/:candidateId')
  @RoutePolicy({ access: ADMIN_ACCESS })
  updateCandidateStatus(
    @Param('candidateId') candidateId: string,
    @Body() body: unknown,
  ): Promise<CandidateResponse> {
    const result = updateCandidateStatusSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.service.updateCandidateStatus(candidateId, result.data);
  }
}
