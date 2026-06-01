import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ReimbursementsController } from './reimbursements.controller';
import { ReimbursementsService } from './reimbursements.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReimbursementsController],
  providers: [ReimbursementsService],
})
export class ReimbursementsModule {}
