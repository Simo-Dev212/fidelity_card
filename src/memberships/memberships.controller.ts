import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipsService } from './memberships.service';
import { WalletService } from '../wallet/wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('memberships')
@Controller('memberships')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MembershipsController {
  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  @Get('mine')
  @ApiOperation({ summary: 'Get all memberships for the current user (client)' })
  async findMine(@Req() req: any) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId: req.user.id },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            settings: true,
            primaryColor: true,
            secondaryColor: true,
            logoUrl: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            primaryColor: true,
            secondaryColor: true,
          },
        },
        walletPass: {
          select: { id: true, provider: true, status: true, saveUrl: true },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => ({
      ...m,
      appleUrl: `/wallet/apple/${m.id}/download`,
      googleUrl: m.walletPass?.saveUrl || null,
    }));
  }

  /** Re-issue a fresh Google Wallet save URL for an existing membership (owner only). */
  @Post(':id/google-save-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate Google Wallet save URL for own membership' })
  async googleSaveUrl(@Param('id') id: string, @Req() req: any) {
    const membership = await this.prisma.membership.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!membership) {
      return { error: 'Membership not found' };
    }
    const saveUrl = await this.walletService.regenerateSaveUrlForMembership(id);
    return { saveUrl, appleUrl: `/wallet/apple/${id}/download` };
  }

  @Get('wallet/:walletId')
  @ApiOperation({ summary: 'Find membership by walletId' })
  findByWalletId(@Param('walletId') walletId: string) {
    return this.membershipsService.findByWalletId(walletId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find membership by id' })
  findOne(@Param('id') id: string) {
    return this.membershipsService.findById(id);
  }
}
