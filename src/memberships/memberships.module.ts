import { Module, forwardRef } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { WalletModule } from '../wallet/wallet.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => WalletModule),
    forwardRef(() => LoyaltyModule),
  ],
  providers: [MembershipsService, RolesGuard],
  controllers: [MembershipsController],
  exports: [MembershipsService],
})
export class MembershipsModule {}
