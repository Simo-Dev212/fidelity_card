import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffService } from './staff.service';
import { StaffLookupDto, StaffUpdateDto } from './staff.dto';

@ApiTags('staff')
@Controller('staff')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post('cards/lookup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lookup a loyalty card from scanned QR (loyalty:walletId)',
  })
  async lookup(@Body() dto: StaffLookupDto) {
    return this.staffService.lookupByCode(dto.code, dto.companyId);
  }

  @Post('loyalty/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Credit / debit points or stamps after cashier scan',
  })
  async update(@Body() dto: StaffUpdateDto, @Req() req: any) {
    return this.staffService.updateByCode({
      code: dto.code,
      companyId: dto.companyId,
      amount: dto.amount,
      reason: dto.reason,
      type: dto.type,
      actorId: req.user?.id,
    });
  }
}