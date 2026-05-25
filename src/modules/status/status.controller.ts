import { Controller, Get } from '@nestjs/common';
import {
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StatusResponse, StatusService } from './status.service';

class DatabaseStatusSchema {
  @ApiProperty({ example: 100 })
  max_connections: number;

  @ApiProperty({ example: 3 })
  opened_connections: number;
}

class StatusDependenciesSchema {
  @ApiProperty({ type: DatabaseStatusSchema })
  database: DatabaseStatusSchema;
}

class StatusResponseSchema {
  @ApiProperty({ example: '2026-05-25T12:00:00.000Z', format: 'date-time' })
  updated_at: string;

  @ApiProperty({ type: StatusDependenciesSchema })
  dependencies: StatusDependenciesSchema;
}

@ApiTags('Status')
@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check da API',
    description:
      'Retorna o status da API e métricas de conexão com o banco de dados. Não requer autenticação.',
  })
  @ApiResponse({
    status: 200,
    description: 'API operacional',
    type: StatusResponseSchema,
  })
  @ApiResponse({ status: 500, description: 'Erro interno no servidor' })
  getStatus(): Promise<StatusResponse> {
    return this.statusService.getStatus();
  }
}
