import { Module, forwardRef } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { WalletModule } from '../wallet/wallet.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [
    forwardRef(() => WalletModule),
    forwardRef(() => LoyaltyModule),
  ],
  providers: [MembershipsService],
  controllers: [MembershipsController],
  exports: [MembershipsService],
})
export class MembershipsModule {}
