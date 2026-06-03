import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from '../../config/config.module';
import { EmailService } from './email.service';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
