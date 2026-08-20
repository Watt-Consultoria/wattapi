import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { HeroesController } from './heroes.controller';
import { HeroesService } from './heroes.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HeroesController],
  providers: [HeroesService],
})
export class HeroesModule {}
