import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigModule } from '../../config/config.module';
import { DatabaseModule } from '../../database/database.module';
import { EnvService } from '../../config/env.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';

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
  providers: [AuthService, JwtGuard],
  exports: [JwtGuard, AuthService],
})
export class AuthModule {}
