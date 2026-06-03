import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ViolationsController } from './violations.controller';
import { ViolationsService } from './violations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ViolationsController],
  providers: [ViolationsService],
})
export class ViolationsModule {}
