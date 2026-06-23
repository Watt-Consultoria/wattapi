import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PushSubscriptionsController } from './push-subscriptions.controller';
import { PushSubscriptionsService } from './push-subscriptions.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PushSubscriptionsController],
  providers: [PushSubscriptionsService],
})
export class PushSubscriptionsModule {}
