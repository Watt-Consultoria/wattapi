import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { getRank, isSuperuser } from '../../common/guards/role-hierarchy';
import type { UserResponse } from '../users/users.service';
import { formatCnpj } from './dto/lead.dto';
import type {
  CreateLeadDto,
  UpdateLeadDto,
  CreateContactDto,
  UpdateContactDto,
  CreateCommentDto,
  UpdateCommentDto,
  LeadRow,
  ContactRow,
  CommentRow,
  LeadResponse,
  LeadDetailResponse,
  ContactResponse,
  CommentResponse,
} from './dto/lead.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly db: DatabaseService) {}

  // ─── Leads ────────────────────────────────────────────────────────────────

  async findAll(): Promise<LeadDetailResponse[]> {
    const { rows: leads } = await this.db.query<LeadRow>(
      `SELECT * FROM leads ORDER BY created_at DESC`,
    );
    if (leads.length === 0) return [];

    const leadIds = leads.map((l) => l.id);

    const { rows: contacts } = await this.db.query<ContactRow>(
      `SELECT id, lead_id, name, role, email, phone FROM lead_contacts WHERE lead_id = ANY($1)`,
      [leadIds],
    );

    const { rows: comments } = await this.db.query<CommentRow>(
      `SELECT * FROM lead_comments WHERE lead_id = ANY($1) ORDER BY created_at ASC`,
      [leadIds],
    );

    const contactsByLead = new Map<string, ContactRow[]>();
    const commentsByLead = new Map<string, CommentRow[]>();

    for (const c of contacts) {
      const list = contactsByLead.get(c.lead_id) ?? [];
      list.push(c);
      contactsByLead.set(c.lead_id, list);
    }

    for (const c of comments) {
      const list = commentsByLead.get(c.lead_id) ?? [];
      list.push(c);
      commentsByLead.set(c.lead_id, list);
    }

    return leads.map((row) => ({
      ...this.toLeadResponse(row),
      contacts: contactsByLead.get(row.id) ?? [],
      comments: (commentsByLead.get(row.id) ?? []).map((c) =>
        this.toCommentResponse(c),
      ),
    }));
  }

  async create(callerId: string, dto: CreateLeadDto): Promise<LeadResponse> {
    if (dto.interest_items && dto.interest_items.length > 0) {
      await this.validateInterestItems(dto.interest_items);
    }

    const { rows } = await this.db.query<LeadRow>(
      `INSERT INTO leads (
         company_name, cnpj, created_by, status,
         address_logradouro, address_numero, address_complemento,
         address_bairro, address_cidade, address_estado, address_cep,
         interest_items
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        dto.company_name,
        dto.cnpj,
        callerId,
        dto.status ?? 'nao_contatado',
        dto.address_logradouro,
        dto.address_numero,
        dto.address_complemento ?? null,
        dto.address_bairro,
        dto.address_cidade,
        dto.address_estado,
        dto.address_cep,
        dto.interest_items ?? [],
      ],
    );
    return this.toLeadResponse(rows[0]);
  }

  async findOne(id: string): Promise<LeadDetailResponse> {
    const { rows: leadRows } = await this.db.query<LeadRow>(
      `SELECT * FROM leads WHERE id = $1`,
      [id],
    );
    if (leadRows.length === 0) {
      throw new NotFoundException(`Lead ${id} not found`);
    }

    const { rows: contacts } = await this.db.query<ContactRow>(
      `SELECT id, lead_id, name, role, email, phone FROM lead_contacts WHERE lead_id = $1`,
      [id],
    );

    const { rows: comments } = await this.db.query<CommentRow>(
      `SELECT * FROM lead_comments WHERE lead_id = $1 ORDER BY created_at ASC`,
      [id],
    );

    return {
      ...this.toLeadResponse(leadRows[0]),
      contacts,
      comments: comments.map((c) => this.toCommentResponse(c)),
    };
  }

  async update(id: string, dto: UpdateLeadDto): Promise<LeadResponse> {
    if (dto.interest_items !== undefined && dto.interest_items.length > 0) {
      await this.validateInterestItems(dto.interest_items);
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const fields: (keyof UpdateLeadDto)[] = [
      'company_name',
      'cnpj',
      'address_logradouro',
      'address_numero',
      'address_complemento',
      'address_bairro',
      'address_cidade',
      'address_estado',
      'address_cep',
      'status',
    ];

    for (const field of fields) {
      if (dto[field] !== undefined) {
        sets.push(`${field} = $${idx++}`);
        params.push(dto[field]);
      }
    }

    if (dto.interest_items !== undefined) {
      sets.push(`interest_items = $${idx++}`);
      params.push(dto.interest_items);
    }

    sets.push(`updated_at = now()`);
    params.push(id);

    const { rows } = await this.db.query<LeadRow>(
      `UPDATE leads SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );

    if (rows.length === 0) {
      throw new NotFoundException(`Lead ${id} not found`);
    }
    return this.toLeadResponse(rows[0]);
  }

  async remove(caller: UserResponse, id: string): Promise<void> {
    const { rows } = await this.db.query<{ created_by: string }>(
      `SELECT created_by FROM leads WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundException(`Lead ${id} not found`);
    }

    const lead = rows[0];
    if (caller.id !== lead.created_by && !isSuperuser(caller.role)) {
      throw new ForbiddenException();
    }

    await this.db.query(`DELETE FROM leads WHERE id = $1`, [id]);
  }

  // ─── Contacts ─────────────────────────────────────────────────────────────

  async addContact(
    leadId: string,
    dto: CreateContactDto,
  ): Promise<ContactResponse> {
    const leadExists = await this.leadExists(leadId);
    if (!leadExists) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    const { rows } = await this.db.query<ContactRow>(
      `INSERT INTO lead_contacts (lead_id, name, role, email, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, lead_id, name, role, email, phone`,
      [leadId, dto.name, dto.role, dto.email ?? null, dto.phone ?? null],
    );
    return rows[0];
  }

  async updateContact(
    leadId: string,
    contactId: string,
    dto: UpdateContactDto,
  ): Promise<ContactResponse> {
    const { rows: current } = await this.db.query<ContactRow>(
      `SELECT * FROM lead_contacts WHERE id = $1 AND lead_id = $2`,
      [contactId, leadId],
    );

    if (current.length === 0) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }

    const merged = {
      email: 'email' in dto ? dto.email : current[0].email,
      phone: 'phone' in dto ? dto.phone : current[0].phone,
    };

    if (merged.email === null && merged.phone === null) {
      throw new BadRequestException(
        'Either email or phone must be present after update',
      );
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (dto.name !== undefined) {
      sets.push(`name = $${idx++}`);
      params.push(dto.name);
    }
    if (dto.role !== undefined) {
      sets.push(`role = $${idx++}`);
      params.push(dto.role);
    }
    if ('email' in dto) {
      sets.push(`email = $${idx++}`);
      params.push(dto.email ?? null);
    }
    if ('phone' in dto) {
      sets.push(`phone = $${idx++}`);
      params.push(dto.phone ?? null);
    }

    params.push(contactId, leadId);

    const { rows } = await this.db.query<ContactRow>(
      `UPDATE lead_contacts SET ${sets.join(', ')} WHERE id = $${idx} AND lead_id = $${idx + 1} RETURNING id, lead_id, name, role, email, phone`,
      params,
    );
    return rows[0];
  }

  async removeContact(leadId: string, contactId: string): Promise<void> {
    const { rowCount } = await this.db.query(
      `DELETE FROM lead_contacts WHERE id = $1 AND lead_id = $2`,
      [contactId, leadId],
    );
    if (rowCount === 0) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  async addComment(
    leadId: string,
    callerId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponse> {
    const leadExists = await this.leadExists(leadId);
    if (!leadExists) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    const { rows } = await this.db.query<CommentRow>(
      `INSERT INTO lead_comments (lead_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [leadId, callerId, dto.content],
    );
    return this.toCommentResponse(rows[0]);
  }

  async updateComment(
    leadId: string,
    commentId: string,
    caller: UserResponse,
    dto: UpdateCommentDto,
  ): Promise<CommentResponse> {
    const { rows } = await this.db.query<CommentRow>(
      `SELECT * FROM lead_comments WHERE id = $1 AND lead_id = $2`,
      [commentId, leadId],
    );

    if (rows.length === 0) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    if (caller.id !== rows[0].user_id) {
      throw new ForbiddenException();
    }

    const { rows: updated } = await this.db.query<CommentRow>(
      `UPDATE lead_comments SET content = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [dto.content, commentId],
    );
    return this.toCommentResponse(updated[0]);
  }

  async removeComment(
    leadId: string,
    commentId: string,
    caller: UserResponse,
  ): Promise<void> {
    const { rows } = await this.db.query<CommentRow & { creator_role: string }>(
      `SELECT lc.*, u.role AS creator_role
       FROM lead_comments lc
       JOIN users u ON u.id = lc.user_id
       WHERE lc.id = $1 AND lc.lead_id = $2`,
      [commentId, leadId],
    );

    if (rows.length === 0) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    const comment = rows[0];
    const isCreator = caller.id === comment.user_id;
    const hasSuperiorRank =
      getRank(caller.role) > getRank(comment.creator_role);

    if (!isCreator && !hasSuperiorRank) {
      throw new ForbiddenException();
    }

    await this.db.query(`DELETE FROM lead_comments WHERE id = $1`, [commentId]);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async leadExists(leadId: string): Promise<boolean> {
    const { rows } = await this.db.query<{ id: string }>(
      `SELECT id FROM leads WHERE id = $1`,
      [leadId],
    );
    return rows.length > 0;
  }

  private async validateInterestItems(items: string[]): Promise<void> {
    const { rows } = await this.db.query<{ name: string }>(
      `SELECT name FROM portfolio_items WHERE name = ANY($1)`,
      [items],
    );
    const found = new Set(rows.map((r) => r.name));
    const missing = items.filter((item) => !found.has(item));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Interest items not found in portfolio: ${missing.join(', ')}`,
      );
    }
  }

  private toLeadResponse(row: LeadRow): LeadResponse {
    return {
      id: row.id,
      company_name: row.company_name,
      cnpj: row.cnpj,
      created_by: row.created_by,
      status: row.status,
      address_logradouro: row.address_logradouro,
      address_numero: row.address_numero,
      address_complemento: row.address_complemento,
      address_bairro: row.address_bairro,
      address_cidade: row.address_cidade,
      address_estado: row.address_estado,
      address_cep: row.address_cep,
      interest_items: row.interest_items,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  private toCommentResponse(row: CommentRow): CommentResponse {
    return {
      id: row.id,
      lead_id: row.lead_id,
      user_id: row.user_id,
      content: row.content,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  // ─── CNPJ Lookup ──────────────────────────────────────────────────────────

  async lookupCnpj(cnpjDigits: string): Promise<Record<string, unknown>> {
    const cnpjFormatted = formatCnpj(cnpjDigits);

    const { rows } = await this.db.query<{ data: Record<string, unknown> }>(
      `SELECT data FROM cnpj_cache WHERE cnpj = $1`,
      [cnpjFormatted],
    );
    if (rows.length > 0) return rows[0].data;

    const response = await fetch(
      `https://receitaws.com.br/v1/cnpj/${cnpjDigits}`,
    );
    if (response.status === 429) {
      throw new HttpException(
        'Limite de consultas à ReceitaWS atingido — tente novamente em alguns segundos',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (!response.ok) {
      throw new BadGatewayException('Falha na consulta à ReceitaWS');
    }

    const data = (await response.json()) as Record<string, unknown>;
    if (data['status'] === 'ERROR') {
      throw new BadGatewayException(
        'CNPJ não encontrado ou inativo na ReceitaWS',
      );
    }

    await this.db.query(
      `INSERT INTO cnpj_cache (cnpj, data) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [cnpjFormatted, JSON.stringify(data)],
    );

    return data;
  }
}
