import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [PrismaModule, LoyaltyModule, MembershipsModule, CompaniesModule],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
