import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { GoogleWalletProvider } from './providers/google-wallet.provider';
import { AppleWalletProvider } from './providers/apple-wallet.provider';
import { PrismaModule } from '../prisma/prisma.module';
import {
  WALLET_PROVIDER,
  APPLE_WALLET_PROVIDER,
} from './providers/wallet-provider.interface';

@Module({
  imports: [PrismaModule],
  providers: [
    WalletService,
    GoogleWalletProvider,
    AppleWalletProvider,
    {
      provide: WALLET_PROVIDER,
      useExisting: AppleWalletProvider,
    },
    {
      provide: APPLE_WALLET_PROVIDER,
      useExisting: AppleWalletProvider,
    },
  ],
  controllers: [WalletController],
  exports: [WalletService, WALLET_PROVIDER, APPLE_WALLET_PROVIDER],
})
export class WalletModule {}
