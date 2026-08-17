import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [LoyaltyModule, AuthModule, CompaniesModule, PrismaModule],
  controllers: [AdminController],
})
export class AdminModule {}
