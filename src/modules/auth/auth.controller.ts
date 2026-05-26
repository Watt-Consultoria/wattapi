import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoutePolicy } from '../../common/decorators/route-policy.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserResponseSchema } from '../users/dto/create-user.dto';
import type { UserResponse } from '../users/users.service';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(RoutePolicyGuard)
  @RoutePolicy({ access: { mode: 'authenticated' } })
  @ApiOperation({
    summary: 'Perfil do usuário autenticado',
    description:
      'Retorna os dados do usuário autenticado a partir do JWT fornecido.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário autenticado',
    type: UserResponseSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  me(@CurrentUser() user: UserResponse): UserResponse {
    return user;
  }
}
