import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigModule } from '../../config/config.module';
import { DatabaseModule } from '../../database/database.module';
import { EnvService } from '../../config/env.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';
import { RoutePolicyGuard } from './route-policy.guard';
import { RoleSerializerInterceptor } from './role-serializer.interceptor';

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
