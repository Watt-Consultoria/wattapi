import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { SelectionProcessService } from './selection-process.service';
import {
  CreateProcessDto,
  UpdateProcessDto,
  CreateApplicationDto,
  UpdateApplicationStatusDto,
  CreateStageDto,
  UpdateStageDto,
  UpdateCandidateStatusDto,
  CreateInterviewSlotsDto,
  BookInterviewSlotDto,
  SendInterviewLinksDto,
  SendMeetLinkDto,
  CreateInterviewEvaluationDto,
  SendEmailToCandidatesDto,
} from './dto/selection-process.dto';
import {
  SelectionProcessResponseDto,
  type SelectionProcessResponse,
} from './dto/selection-process.response.dto';
import {
  ApplicationResponseDto,
  ApplicationCreatedResponseDto,
  type ApplicationResponse,
  type ApplicationCreatedResponse,
} from './dto/application.response.dto';
import { StageResponseDto, type StageResponse } from './dto/stage.response.dto';
import {
  CandidateResponseDto,
  type CandidateResponse,
} from './dto/candidate.response.dto';
import {
  InterviewSlotResponseDto,
  AvailableTimeSlotResponseDto,
  InterviewBookingResponseDto,
  MySlotResponseDto,
  SendLinksResultDto,
  SendEmailResultDto,
  type InterviewSlotResponse,
  type AvailableTimeSlotResponse,
  type InterviewBookingResponse,
  type MySlotResponse,
  type SendLinksResult,
  type SendEmailResult,
} from './dto/interview.response.dto';
import {
  InterviewEvaluationResponseDto,
  InterviewEvaluationWithCandidateResponseDto,
  type InterviewEvaluationResponse,
  type InterviewEvaluationWithCandidateResponse,
} from './dto/interview-evaluation.response.dto';

type AuthRequest = Request & {
  jwtData: JwtData;
  user: UserResponse;
};

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
  @ApiResponse({ status: 201, type: SelectionProcessResponseDto })
  createProcess(
    @Body() body: CreateProcessDto,
  ): Promise<SelectionProcessResponse> {
    return this.service.createProcess(body);
  }

  @Get()
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 200, type: [SelectionProcessResponseDto] })
  findAll(): Promise<SelectionProcessResponse[]> {
    return this.service.findAll();
  }

  // ─── Interviews ───────────────────────────────────────────────────────────

  @Post('interviews')
  @HttpCode(201)
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 201, type: [InterviewSlotResponseDto] })
  createInterviewSlots(
    @Body() body: CreateInterviewSlotsDto,
    @Req() req: AuthRequest,
  ): Promise<InterviewSlotResponse[]> {
    return this.service.createInterviewSlots(req.jwtData.sub, body);
  }

  @Get('interviews/slots')
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 200, type: [MySlotResponseDto] })
  getMySlots(@Req() req: AuthRequest): Promise<MySlotResponse[]> {
    return this.service.getSlots(req.jwtData.sub, req.user.role);
  }

  @Post('interviews/send-link')
  @HttpCode(200)
  @RoutePolicy({ access: ADMIN_ACCESS })
  @ApiResponse({ status: 200, type: [SendLinksResultDto] })
  sendInterviewLinks(
    @Body() body: SendInterviewLinksDto,
  ): Promise<SendLinksResult[]> {
    return this.service.sendInterviewLinks(body);
  }

  @Post('interviews/meet-link')
  @HttpCode(200)
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 200, type: InterviewBookingResponseDto })
  sendMeetLink(
    @Body() body: SendMeetLinkDto,
    @Req() req: AuthRequest,
  ): Promise<InterviewBookingResponse> {
    return this.service.sendMeetLink(body, req.jwtData.sub);
  }

  @Post('interviews/:bookingId/evaluation')
  @HttpCode(201)
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 201, type: InterviewEvaluationResponseDto })
  createInterviewEvaluation(
    @Param('bookingId') bookingId: string,
    @Body() body: CreateInterviewEvaluationDto,
    @Req() req: AuthRequest,
  ): Promise<InterviewEvaluationResponse> {
    return this.service.createInterviewEvaluation(
      bookingId,
      body,
      req.jwtData.sub,
    );
  }

  @Get('interviews/evaluations')
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({
    status: 200,
    type: [InterviewEvaluationWithCandidateResponseDto],
  })
  findInterviewEvaluations(
    @Query('selection_process_id') selectionProcessId?: string,
  ): Promise<InterviewEvaluationWithCandidateResponse[]> {
    return this.service.findInterviewEvaluations(selectionProcessId);
  }

  @Get('interviews')
  @RoutePolicy({ access: { mode: 'unauthenticated' } })
  @ApiResponse({ status: 200, type: [AvailableTimeSlotResponseDto] })
  findAvailableTimeSlots(): Promise<AvailableTimeSlotResponse[]> {
    return this.service.findAvailableTimeSlots();
  }

  @Patch('interviews')
  @RoutePolicy({ access: { mode: 'unauthenticated' } })
  @ApiResponse({ status: 200, type: InterviewBookingResponseDto })
  bookInterviewSlot(
    @Body() body: BookInterviewSlotDto,
  ): Promise<InterviewBookingResponse> {
    return this.service.bookInterviewSlot(body);
  }

  @Post('send-email')
  @HttpCode(200)
  @RoutePolicy({ access: ADMIN_ACCESS })
  @ApiResponse({ status: 200, type: SendEmailResultDto })
  sendEmailToCandidates(
    @Body() body: SendEmailToCandidatesDto,
  ): Promise<SendEmailResult> {
    return this.service.sendEmailToCandidates(body);
  }

  @Patch(':processId')
  @RoutePolicy({ access: ADMIN_ACCESS })
  @ApiResponse({ status: 200, type: SelectionProcessResponseDto })
  updateProcess(
    @Param('processId') processId: string,
    @Body() body: UpdateProcessDto,
  ): Promise<SelectionProcessResponse> {
    return this.service.updateProcess(processId, body);
  }

  @Post('applications')
  @HttpCode(201)
  @RoutePolicy({ access: { mode: 'unauthenticated' } })
  @ApiResponse({ status: 201, type: ApplicationCreatedResponseDto })
  createApplication(
    @Body() body: CreateApplicationDto,
  ): Promise<ApplicationCreatedResponse> {
    return this.service.createApplication(body);
  }

  @Get('applications')
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 200, type: [ApplicationResponseDto] })
  findApplications(
    @Query('selection_process_id') selectionProcessId?: string,
  ): Promise<ApplicationResponse[]> {
    return this.service.findApplications(selectionProcessId);
  }

  @Patch('applications/:applicationId')
  @RoutePolicy({ access: ADMIN_ACCESS })
  @ApiResponse({ status: 200, type: ApplicationResponseDto })
  updateApplicationStatus(
    @Param('applicationId') applicationId: string,
    @Body() body: UpdateApplicationStatusDto,
  ): Promise<ApplicationResponse> {
    return this.service.updateApplicationStatus(applicationId, body);
  }

  @Post('stages')
  @HttpCode(201)
  @RoutePolicy({ access: ADMIN_ACCESS })
  @ApiResponse({ status: 201, type: StageResponseDto })
  createStage(@Body() body: CreateStageDto): Promise<StageResponse> {
    return this.service.createStage(body);
  }

  @Get('stages')
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 200, type: [StageResponseDto] })
  findStages(
    @Query('selection_process_id') selectionProcessId?: string,
  ): Promise<StageResponse[]> {
    return this.service.findStages(selectionProcessId);
  }

  @Put('stages/:stageId')
  @RoutePolicy({ access: ADMIN_ACCESS })
  @ApiResponse({ status: 200, type: StageResponseDto })
  updateStage(
    @Param('stageId') stageId: string,
    @Body() body: UpdateStageDto,
  ): Promise<StageResponse> {
    return this.service.updateStage(stageId, body);
  }

  @Get('candidates')
  @RoutePolicy({ access: ANY_AUTH })
  @ApiResponse({ status: 200, type: [CandidateResponseDto] })
  findCandidates(
    @Query('selection_process_id') selectionProcessId?: string,
    @Query('stage_id') stageId?: string,
  ): Promise<CandidateResponse[]> {
    return this.service.findCandidates({ selectionProcessId, stageId });
  }

  @Patch('candidates/:candidateId')
  @RoutePolicy({ access: ADMIN_ACCESS })
  @ApiResponse({ status: 200, type: CandidateResponseDto })
  updateCandidateStatus(
    @Param('candidateId') candidateId: string,
    @Body() body: UpdateCandidateStatusDto,
  ): Promise<CandidateResponse> {
    return this.service.updateCandidateStatus(candidateId, body);
  }
}
