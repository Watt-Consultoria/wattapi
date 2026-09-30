import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  AlmoxarifadoMaterialRow,
  CreateAlmoxarifadoMaterialDto,
  UpdateAlmoxarifadoMaterialDto,
} from './dto/almoxarifado-material.dto';
import type { AlmoxarifadoMaterialResponse } from './dto/almoxarifado-material.response.dto';

function toResponse(
  row: AlmoxarifadoMaterialRow,
): AlmoxarifadoMaterialResponse {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    quantidade_estoque: row.quantidade_estoque,
    observacoes: row.observacoes,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

@Injectable()
export class AlmoxarifadoMaterialService {
  constructor(private readonly db: DatabaseService) {}

  async create(
    dto: CreateAlmoxarifadoMaterialDto,
  ): Promise<AlmoxarifadoMaterialResponse> {
    const { rows } = await this.db.query<AlmoxarifadoMaterialRow>(
      `INSERT INTO almoxarifado_materiais (nome, descricao, quantidade_estoque, observacoes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        dto.nome,
        dto.descricao,
        dto.quantidade_estoque,
        dto.observacoes ?? null,
      ],
    );

    return toResponse(rows[0]);
  }

  async findAll(): Promise<AlmoxarifadoMaterialResponse[]> {
    const { rows } = await this.db.query<AlmoxarifadoMaterialRow>(
      `SELECT * FROM almoxarifado_materiais ORDER BY nome`,
    );

    return rows.map(toResponse);
  }

  async update(
    id: string,
    dto: UpdateAlmoxarifadoMaterialDto,
  ): Promise<AlmoxarifadoMaterialResponse> {
    const { rows: materialRows } = await this.db.query<AlmoxarifadoMaterialRow>(
      `SELECT * FROM almoxarifado_materiais WHERE id = $1`,
      [id],
    );

    if (materialRows.length === 0) {
      throw new NotFoundException(`Material with id ${id} not found`);
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (dto.nome !== undefined) {
      fields.push(`nome = $${++i}`);
      values.push(dto.nome);
    }
    if (dto.descricao !== undefined) {
      fields.push(`descricao = $${++i}`);
      values.push(dto.descricao);
    }
    if (dto.quantidade_estoque !== undefined) {
      fields.push(`quantidade_estoque = $${++i}`);
      values.push(dto.quantidade_estoque);
    }
    if (dto.observacoes !== undefined) {
      fields.push(`observacoes = $${++i}`);
      values.push(dto.observacoes);
    }

    if (fields.length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    const { rows } = await this.db.query<AlmoxarifadoMaterialRow>(
      `UPDATE almoxarifado_materiais SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, ...values],
    );

    return toResponse(rows[0]);
  }
}
