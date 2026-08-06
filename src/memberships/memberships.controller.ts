import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MembershipsService } from './memberships.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('memberships')
@Controller('memberships')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membershipsService.findById(id);
  }

  @Get('wallet/:walletId')
  findByWalletId(@Param('walletId') walletId: string) {
    return this.membershipsService.findByWalletId(walletId);
  }
}
