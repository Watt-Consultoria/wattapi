import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../users/users.module';
import { RoutineController } from './routine.controller';
import { RoutineService } from './routine.service';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [RoutineController],
  providers: [RoutineService],
})
export class RoutineModule {}
