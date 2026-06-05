import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import {
  GamificationCyclesController,
  GamificationTasksController,
  GamificationSubmissionsController,
  GamificationLeaderboardController,
} from './gamification.controller';
import { GamificationService } from './gamification.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    GamificationCyclesController,
    GamificationTasksController,
    GamificationSubmissionsController,
    GamificationLeaderboardController,
  ],
  providers: [GamificationService],
})
export class GamificationModule {}
