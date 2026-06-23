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
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { SelectionProcessService } from './selection-process.service';
import {
  createProcessSchema,
  updateProcessSchema,
  createApplicationSchema,
  updateApplicationStatusSchema,
  createStageSchema,
  updateStageSchema,
  updateCandidateStatusSchema,
  createInterviewSlotsSchema,
  bookInterviewSlotSchema,
  sendInterviewLinksSchema,
  sendMeetLinkSchema,
  createInterviewEvaluationSchema,
  sendEmailToCandidatesSchema,
} from './dto/selection-process.dto';
import type {
  SelectionProcessResponse,
  ApplicationResponse,
  ApplicationCreatedResponse,
  StageResponse,
  CandidateResponse,
  InterviewSlotResponse,
  AvailableTimeSlotResponse,
  InterviewBookingResponse,
  InterviewEvaluationResponse,
  InterviewEvaluationWithCandidateResponse,
  MySlotResponse,
  SendLinksResult,
  SendEmailResult,
} from './dto/selection-process.dto';

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

  // ─── Interviews ───────────────────────────────────────────────────────────

  @Post('interviews')
  @HttpCode(201)
  @RoutePolicy({ access: ANY_AUTH })
  createInterviewSlots(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<InterviewSlotResponse[]> {
    const result = createInterviewSlotsSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.service.createInterviewSlots(req.jwtData.sub, result.data);
  }

  @Get('interviews/slots')
  @RoutePolicy({ access: ANY_AUTH })
  getMySlots(@Req() req: AuthRequest): Promise<MySlotResponse[]> {
    return this.service.getMySlots(req.jwtData.sub, req.user.role);
  }

  @Post('interviews/send-link')
  @HttpCode(200)
  @RoutePolicy({ access: ADMIN_ACCESS })
  sendInterviewLinks(@Body() body: unknown): Promise<SendLinksResult[]> {
    const result = sendInterviewLinksSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.service.sendInterviewLinks(result.data);
  }

  @Post('interviews/meet-link')
  @HttpCode(200)
  @RoutePolicy({ access: ANY_AUTH })
  sendMeetLink(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<InterviewBookingResponse> {
    const result = sendMeetLinkSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.service.sendMeetLink(result.data, req.jwtData.sub);
  }

  @Post('interviews/:bookingId/evaluation')
  @HttpCode(201)
  @RoutePolicy({ access: ANY_AUTH })
  createInterviewEvaluation(
    @Param('bookingId') bookingId: string,
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<InterviewEvaluationResponse> {
    const result = createInterviewEvaluationSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.service.createInterviewEvaluation(
      bookingId,
      result.data,
      req.jwtData.sub,
    );
  }

  @Get('interviews/evaluations')
  @RoutePolicy({ access: ANY_AUTH })
  findInterviewEvaluations(
    @Query('selection_process_id') selectionProcessId?: string,
  ): Promise<InterviewEvaluationWithCandidateResponse[]> {
    return this.service.findInterviewEvaluations(selectionProcessId);
  }

  @Get('interviews')
  @RoutePolicy({ access: { mode: 'unauthenticated' } })
  findAvailableTimeSlots(): Promise<AvailableTimeSlotResponse[]> {
    return this.service.findAvailableTimeSlots();
  }

  @Patch('interviews')
  @RoutePolicy({ access: { mode: 'unauthenticated' } })
  bookInterviewSlot(@Body() body: unknown): Promise<InterviewBookingResponse> {
    const result = bookInterviewSlotSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.service.bookInterviewSlot(result.data);
  }

  @Post('send-email')
  @HttpCode(200)
  @RoutePolicy({ access: ADMIN_ACCESS })
  sendEmailToCandidates(@Body() body: unknown): Promise<SendEmailResult> {
    const result = sendEmailToCandidatesSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.service.sendEmailToCandidates(result.data);
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
