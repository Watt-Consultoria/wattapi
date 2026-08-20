import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { WalletAccountsController } from './wallet-accounts.controller';
import { WalletAccountsService } from './wallet-accounts.service';
import { WalletTransactionsController } from './wallet-transactions.controller';
import { WalletTransactionsService } from './wallet-transactions.service';

@Module({
  imports: [DatabaseModule],
  controllers: [WalletAccountsController, WalletTransactionsController],
  providers: [WalletAccountsService, WalletTransactionsService],
})
export class WalletModule {}
