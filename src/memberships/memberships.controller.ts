import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  Post,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipsService } from './memberships.service';
import { WalletService } from '../wallet/wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, RequireRoles } from '../auth/guards/roles.guard';
import { StaffStatus } from '@prisma/client';

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
            accentColor: true,
            heroImageUrl: true,
          },
        },
        walletPass: {
          select: { id: true, provider: true, status: true, saveUrl: true },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const enriched = await Promise.all(
      memberships.map(async (m) => {
        let googleUrl: string | null = null;
        try {
          googleUrl =
            await this.walletService.regenerateSaveUrlForMembership(m.id);
        } catch {
          googleUrl = m.walletPass?.saveUrl || null;
        }
        return {
          ...m,
          appleUrl: `/wallet/apple/${m.id}/download`,
          googleUrl,
        };
      }),
    );

    return enriched;
  }

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
  @UseGuards(RolesGuard)
  @RequireRoles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Find membership by walletId (staff only)' })
  async findByWalletId(
    @Param('walletId') walletId: string,
    @Req() req: { user: { id: string; role?: string } },
  ) {
    const membership = await this.membershipsService.findByWalletId(walletId);
    if (!membership) return null;

    if (req.user.role === 'ADMIN') return membership;

    const assignment = await this.prisma.staffAssignment.findFirst({
      where: {
        userId: req.user.id,
        companyId: membership.companyId,
        status: StaffStatus.ACTIVE,
      },
    });
    if (!assignment) {
      throw new ForbiddenException('Access denied');
    }
    return membership;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find membership by id (owner only)' })
  async findOne(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    const membership = await this.membershipsService.findById(id);
    if (!membership || membership.userId !== req.user.id) {
      throw new ForbiddenException('Access denied');
    }
    return membership;
  }
}
