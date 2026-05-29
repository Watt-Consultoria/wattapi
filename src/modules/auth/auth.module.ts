import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigModule } from '../../config/config.module';
import { DatabaseModule } from '../../database/database.module';
import { EnvService } from '../../config/env.service';
import { JwtGuard } from '../../common/guards/jwt.guard';

import { RoutePolicyGuard } from '../../common/guards/route-policy.guard';
import { RoleSerializerInterceptor } from '../../common/interceptors/role-serializer.interceptor';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [EnvService],
      useFactory: (env: EnvService) => ({
        secret: env.get('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtGuard,
    RoutePolicyGuard,
    RoleSerializerInterceptor,
  ],
  exports: [
    JwtModule,
    JwtGuard,
    AuthService,
    RoutePolicyGuard,
    RoleSerializerInterceptor,
  ],
})
export class AuthModule {}
