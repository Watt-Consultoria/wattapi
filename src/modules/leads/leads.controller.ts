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
import { Request } from 'express';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import type { JwtData } from '../../common/guards/jwt.guard';
import type { UserResponse } from '../users/users.service';
import { LeadsService } from './leads.service';
import {
  createLeadSchema,
  updateLeadSchema,
  createContactSchema,
  updateContactSchema,
  createCommentSchema,
  updateCommentSchema,
} from './dto/lead.dto';
import type {
  LeadResponse,
  LeadDetailResponse,
  ContactResponse,
  CommentResponse,
} from './dto/lead.dto';

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
  findAll(): Promise<LeadDetailResponse[]> {
    return this.leadsService.findAll();
  }

  @Post()
  @HttpCode(201)
  @RoutePolicy({ access: LEADS_ACCESS })
  create(
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<LeadResponse> {
    const result = createLeadSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.leadsService.create(req.jwtData.sub, result.data);
  }

  @Get(':id')
  @RoutePolicy({ access: LEADS_ACCESS })
  findOne(@Param('id') id: string): Promise<LeadDetailResponse> {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  @RoutePolicy({ access: LEADS_ACCESS })
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<LeadResponse> {
    const result = updateLeadSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.leadsService.update(id, result.data);
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
  addContact(
    @Param('id') leadId: string,
    @Body() body: unknown,
  ): Promise<ContactResponse> {
    const result = createContactSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.leadsService.addContact(leadId, result.data);
  }

  @Patch(':id/contacts/:contact_id')
  @RoutePolicy({ access: LEADS_ACCESS })
  updateContact(
    @Param('id') leadId: string,
    @Param('contact_id') contactId: string,
    @Body() body: unknown,
  ): Promise<ContactResponse> {
    const result = updateContactSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.leadsService.updateContact(leadId, contactId, result.data);
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
  addComment(
    @Param('id') leadId: string,
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<CommentResponse> {
    const result = createCommentSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.leadsService.addComment(leadId, req.jwtData.sub, result.data);
  }

  @Patch(':id/comments/:comment_id')
  @RoutePolicy({ access: LEADS_ACCESS })
  updateComment(
    @Param('id') leadId: string,
    @Param('comment_id') commentId: string,
    @Body() body: unknown,
    @Req() req: AuthRequest,
  ): Promise<CommentResponse> {
    const result = updateCommentSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.leadsService.updateComment(
      leadId,
      commentId,
      req.user,
      result.data,
    );
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
