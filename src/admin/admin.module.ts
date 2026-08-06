import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [LoyaltyModule, MembershipsModule, AuthModule],
  controllers: [AdminController],
})
export class AdminModule {}
