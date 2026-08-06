import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { MembershipsService } from '../memberships/memberships.service';
import { LoyaltyEventType } from '@prisma/client';
import { IsString, IsNumber, IsOptional } from 'class-validator';

class AdminUpdateDto {
  @IsString()
  membershipId: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly membershipsService: MembershipsService,
  ) {}

  @Post('loyalty/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin override – update points/stamps' })
  async update(@Body() dto: AdminUpdateDto) {
    // In a real multi-tenant admin you would also check that the JWT user
    // belongs to the same companyId. For Phase 1 we keep it simple.
    const membership = await this.loyaltyService.updateBalance({
      membershipId: dto.membershipId,
      amount: dto.amount,
      type: LoyaltyEventType.ADMIN_OVERRIDE,
      reason: dto.reason || 'Admin override',
      actorType: 'admin',
      syncWallet: true,
    });

    return {
      success: true,
      membershipId: membership.id,
      newBalance: membership.balance,
    };
  }
}
