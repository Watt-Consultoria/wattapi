import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  AlmoxarifadoEmprestimoRow,
  CreateAlmoxarifadoEmprestimoDto,
  ReturnAlmoxarifadoEmprestimoDto,
} from './dto/almoxarifado-emprestimo.dto';
import type { AlmoxarifadoEmprestimoResponse } from './dto/almoxarifado-emprestimo.response.dto';

interface MaterialStockRow {
  id: string;
  quantidade_estoque: number;
}

function toResponse(
  row: AlmoxarifadoEmprestimoRow,
): AlmoxarifadoEmprestimoResponse {
  return {
    id: row.id,
    material_id: row.material_id,
    quantidade: row.quantidade,
    user_id: row.user_id,
    emprestado_em: row.emprestado_em.toISOString(),
    previsao_devolucao: row.previsao_devolucao.toISOString(),
    devolvido_em: row.devolvido_em ? row.devolvido_em.toISOString() : null,
    observacoes: row.observacoes,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

@Injectable()
export class AlmoxarifadoEmprestimoService {
  constructor(private readonly db: DatabaseService) {}

  async create(
    userId: string,
    dto: CreateAlmoxarifadoEmprestimoDto,
  ): Promise<AlmoxarifadoEmprestimoResponse> {
    return this.db.withTransaction(async (client) => {
      const { rows: materialRows } = await client.query<MaterialStockRow>(
        `SELECT id, quantidade_estoque FROM almoxarifado_materiais WHERE id = $1 FOR UPDATE`,
        [dto.material_id],
      );

      if (materialRows.length === 0) {
        throw new NotFoundException(
          `Material with id ${dto.material_id} not found`,
        );
      }

      if (materialRows[0].quantidade_estoque < dto.quantidade) {
        throw new BadRequestException('Estoque insuficiente para o empréstimo');
      }

      await client.query(
        `UPDATE almoxarifado_materiais SET quantidade_estoque = quantidade_estoque - $1, updated_at = now()
         WHERE id = $2`,
        [dto.quantidade, dto.material_id],
      );

      const { rows } = await client.query<AlmoxarifadoEmprestimoRow>(
        `INSERT INTO almoxarifado_emprestimos
           (material_id, quantidade, user_id, previsao_devolucao, observacoes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          dto.material_id,
          dto.quantidade,
          userId,
          dto.previsao_devolucao,
          dto.observacoes ?? null,
        ],
      );

      return toResponse(rows[0]);
    });
  }

  async findAll(): Promise<AlmoxarifadoEmprestimoResponse[]> {
    const { rows } = await this.db.query<AlmoxarifadoEmprestimoRow>(
      `SELECT * FROM almoxarifado_emprestimos ORDER BY emprestado_em DESC`,
    );

    return rows.map(toResponse);
  }

  async returnLoan(
    id: string,
    dto: ReturnAlmoxarifadoEmprestimoDto,
  ): Promise<AlmoxarifadoEmprestimoResponse> {
    return this.db.withTransaction(async (client) => {
      const { rows: loanRows } = await client.query<AlmoxarifadoEmprestimoRow>(
        `SELECT * FROM almoxarifado_emprestimos WHERE id = $1 FOR UPDATE`,
        [id],
      );

      if (loanRows.length === 0) {
        throw new NotFoundException(`Empréstimo with id ${id} not found`);
      }

      const loan = loanRows[0];

      if (loan.devolvido_em !== null) {
        throw new BadRequestException('Empréstimo já foi devolvido');
      }

      await client.query(
        `UPDATE almoxarifado_materiais SET quantidade_estoque = quantidade_estoque + $1, updated_at = now()
         WHERE id = $2`,
        [loan.quantidade, loan.material_id],
      );

      const { rows } = await client.query<AlmoxarifadoEmprestimoRow>(
        `UPDATE almoxarifado_emprestimos
         SET devolvido_em = COALESCE($2, now()),
             observacoes = COALESCE($3, observacoes),
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id, dto.devolvido_em ?? null, dto.observacoes ?? null],
      );

      return toResponse(rows[0]);
    });
  }
}
