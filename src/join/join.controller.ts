import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JoinService } from './join.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsOptional, IsObject } from 'class-validator';

class CompleteJoinDto {
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

@ApiTags('join')
@Controller('join')
export class JoinController {
  constructor(private readonly joinService: JoinService) {}

  /**
   * Public landing info (before auth)
   * GET /join/:companySlug/:programSlug
   */
  @Get(':companySlug/:programSlug')
  @ApiOperation({ summary: 'Resolve company + program from NFC link (public)' })
  async getProgramInfo(
    @Param('companySlug') companySlug: string,
    @Param('programSlug') programSlug: string,
  ) {
    const { company, program } = await this.joinService.resolveProgram(
      companySlug,
      programSlug,
    );

    return {
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logoUrl: company.logoUrl,
        primaryColor: company.primaryColor,
        secondaryColor: company.secondaryColor,
        heroImageUrl: company.heroImageUrl,
      },
      program: {
        id: program.id,
        name: program.name,
        slug: program.slug,
        type: program.type,
        description: program.description,
        settings: program.settings,
        logoUrl: program.logoUrl || company.logoUrl,
        primaryColor: program.primaryColor || company.primaryColor,
      },
    };
  }

  /**
   * After successful authentication → create membership + return Save to Google Wallet URL
   * POST /join/:companySlug/:programSlug/complete
   * Requires Bearer JWT
   */
  @Post(':companySlug/:programSlug/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Complete join after auth – creates Membership + Google Wallet pass and returns saveUrl',
  })
  async completeJoin(
    @Param('companySlug') companySlug: string,
    @Param('programSlug') programSlug: string,
    @Body() dto: CompleteJoinDto,
    @Req() req: any,
  ) {
    const userId = req.user.id; // set by JwtAuthGuard / JwtStrategy

    const result = await this.joinService.completeJoin({
      userId,
      companySlug,
      programSlug,
      metadata: dto.metadata,
    });

    return {
      success: true,
      alreadyMember: result.alreadyMember,
      membership: {
        id: result.membership.id,
        walletId: result.membership.walletId,
        balance: result.membership.balance,
        status: result.membership.status,
      },
      saveUrl: result.saveUrl, // ← the magic “Save to Google Wallet” link
    };
  }
}
