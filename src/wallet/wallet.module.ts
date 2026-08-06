import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { GoogleWalletProvider } from './providers/google-wallet.provider';
import { WALLET_PROVIDER } from './providers/wallet-provider.interface';

@Module({
  providers: [
    WalletService,
    GoogleWalletProvider,
    {
      provide: WALLET_PROVIDER,
      useExisting: GoogleWalletProvider,
    },
  ],
  exports: [WalletService, WALLET_PROVIDER],
})
export class WalletModule {}
