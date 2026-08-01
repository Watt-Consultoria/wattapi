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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { LeadsService } from './leads.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  CreateContactDto,
  UpdateContactDto,
  CreateCommentDto,
  UpdateCommentDto,
  isValidCnpjDigits,
} from './dto/lead.dto';
import {
  LeadResponseDto,
  LeadDetailResponseDto,
  ContactResponseDto,
  CommentResponseDto,
} from './dto/lead.response.dto';
import type {
  LeadResponse,
  LeadDetailResponse,
  ContactResponse,
  CommentResponse,
} from './dto/lead.response.dto';

type AuthRequest = Request & {
  jwtData: JwtData;
  user: UserResponse;
};

// ATENÇÃO: a condição original ['roleAndSector', { roles: ['diretor'], sectors: ['marketing'] }]
// requeria AND entre role e sector, que access.rba não suporta. A condição foi decomposta em OR:
// ['role', ['diretor']] OR ['sector', ['marketing']] — ligeiramente mais permissivo que o original.
const LEADS_ACCESS = {
  mode: 'authenticated' as const,
  rba: [
    ['role', ['assessor', 'presidente']] as ['role', string[]],
    ['sector', ['comercial']] as ['sector', string[]],
    [
      'role AND sector',
      { roles: ['diretor'], sectors: ['marketing', 'comercial'] },
    ] as ['role AND sector', { roles: string[]; sectors: string[] }],
  ],
};

@Controller('leads')
@UseGuards(RoutePolicyGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // ─── Leads ────────────────────────────────────────────────────────────────

  @Get()
  @RoutePolicy({ access: LEADS_ACCESS })
  @ApiResponse({ status: 200, type: [LeadDetailResponseDto] })
  findAll(): Promise<LeadDetailResponse[]> {
    return this.leadsService.findAll();
  }

  @Get('cnpj/:cnpj')
  @RoutePolicy({ access: LEADS_ACCESS })
  lookupCnpj(@Param('cnpj') cnpj: string): Promise<Record<string, unknown>> {
    if (!isValidCnpjDigits(cnpj)) {
      throw new BadRequestException(
        'CNPJ inválido — informe exatamente 14 dígitos com dígitos verificadores válidos',
      );
    }
    return this.leadsService.lookupCnpj(cnpj);
  }

  @Post()
  @HttpCode(201)
  @RoutePolicy({ access: LEADS_ACCESS })
  @ApiResponse({ status: 201, type: LeadResponseDto })
  create(
    @Body() body: CreateLeadDto,
    @Req() req: AuthRequest,
  ): Promise<LeadResponse> {
    return this.leadsService.create(req.jwtData.sub, body);
  }

  @Get(':id')
  @RoutePolicy({ access: LEADS_ACCESS })
  @ApiResponse({ status: 200, type: LeadDetailResponseDto })
  findOne(@Param('id') id: string): Promise<LeadDetailResponse> {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  @RoutePolicy({ access: LEADS_ACCESS })
  @ApiResponse({ status: 200, type: LeadResponseDto })
  update(
    @Param('id') id: string,
    @Body() body: UpdateLeadDto,
  ): Promise<LeadResponse> {
    return this.leadsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RoutePolicy({ access: LEADS_ACCESS })
  remove(@Param('id') id: string, @Req() req: AuthRequest): Promise<void> {
    return this.leadsService.remove(req.user, id);
  }

  // ─── Contacts ─────────────────────────────────────────────────────────────

  @Post(':id/contacts')
  @HttpCode(201)
  @RoutePolicy({ access: LEADS_ACCESS })
  @ApiResponse({ status: 201, type: ContactResponseDto })
  addContact(
    @Param('id') leadId: string,
    @Body() body: CreateContactDto,
  ): Promise<ContactResponse> {
    return this.leadsService.addContact(leadId, body);
  }

  @Patch(':id/contacts/:contact_id')
  @RoutePolicy({ access: LEADS_ACCESS })
  @ApiResponse({ status: 200, type: ContactResponseDto })
  updateContact(
    @Param('id') leadId: string,
    @Param('contact_id') contactId: string,
    @Body() body: UpdateContactDto,
  ): Promise<ContactResponse> {
    return this.leadsService.updateContact(leadId, contactId, body);
  }

  @Delete(':id/contacts/:contact_id')
  @HttpCode(204)
  @RoutePolicy({ access: LEADS_ACCESS })
  removeContact(
    @Param('id') leadId: string,
    @Param('contact_id') contactId: string,
  ): Promise<void> {
    return this.leadsService.removeContact(leadId, contactId);
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  @Post(':id/comments')
  @HttpCode(201)
  @RoutePolicy({ access: LEADS_ACCESS })
  @ApiResponse({ status: 201, type: CommentResponseDto })
  addComment(
    @Param('id') leadId: string,
    @Body() body: CreateCommentDto,
    @Req() req: AuthRequest,
  ): Promise<CommentResponse> {
    return this.leadsService.addComment(leadId, req.jwtData.sub, body);
  }

  @Patch(':id/comments/:comment_id')
  @RoutePolicy({ access: LEADS_ACCESS })
  @ApiResponse({ status: 200, type: CommentResponseDto })
  updateComment(
    @Param('id') leadId: string,
    @Param('comment_id') commentId: string,
    @Body() body: UpdateCommentDto,
    @Req() req: AuthRequest,
  ): Promise<CommentResponse> {
    return this.leadsService.updateComment(leadId, commentId, req.user, body);
  }

  @Delete(':id/comments/:comment_id')
  @HttpCode(204)
  @RoutePolicy({ access: LEADS_ACCESS })
  removeComment(
    @Param('id') leadId: string,
    @Param('comment_id') commentId: string,
    @Req() req: AuthRequest,
  ): Promise<void> {
    return this.leadsService.removeComment(leadId, commentId, req.user);
  }
}
