import { Module } from '@nestjs/common';
import { SelectionProcessController } from './selection-process.controller';
import { SelectionProcessService } from './selection-process.service';
import { DatabaseModule } from '../../database/database.module';
import { AppConfigModule } from '../../config/config.module';

@Module({
  imports: [DatabaseModule, AppConfigModule],
  controllers: [SelectionProcessController],
  providers: [SelectionProcessService],
})
export class SelectionProcessModule {}
