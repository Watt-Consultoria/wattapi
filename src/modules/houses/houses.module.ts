import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { HousesController } from './houses.controller';
import { HousesService } from './houses.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HousesController],
  providers: [HousesService],
  exports: [HousesService],
})
export class HousesModule {}
