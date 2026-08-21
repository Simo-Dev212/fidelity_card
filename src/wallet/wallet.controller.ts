import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  ForbiddenException,
  UseGuards,
  Req,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { APPLE_WALLET_PROVIDER } from './providers/wallet-provider.interface';
import type { WalletProvider } from './providers/wallet-provider.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffStatus } from '@prisma/client';

type Authed = { id: string; email: string; role?: string };

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APPLE_WALLET_PROVIDER) private readonly appleProvider: WalletProvider,
  ) {}

  private async assertCanAccessMembership(
    membershipId: string,
    user: Authed,
  ): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      select: { userId: true, companyId: true },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }
    if (membership.userId === user.id) return;

    if (user.role === 'ADMIN') return;

    if (user.role === 'STAFF') {
      const assignment = await this.prisma.staffAssignment.findFirst({
        where: {
          userId: user.id,
          companyId: membership.companyId,
          status: StaffStatus.ACTIVE,
        },
      });
      if (assignment) return;
    }

    throw new ForbiddenException('Access denied');
  }

  @Get('apple/:membershipId/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download Apple Wallet .pkpass for a membership' })
  async downloadApplePass(
    @Param('membershipId') membershipId: string,
    @Req() req: { user: Authed },
    @Res() res: any,
  ) {
    await this.assertCanAccessMembership(membershipId, req.user);

    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: { program: true, company: true, user: true },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    const provider = this.appleProvider as {
      generatePkpassBuffer: (m: typeof membership) => Promise<Buffer>;
    };
    const buffer = await provider.generatePkpassBuffer(membership);

    res.header('Content-Type', 'application/vnd.apple.pkpass');
    res.header(
      'Content-Disposition',
      `attachment; filename="${membership.walletId}.pkpass"`,
    );
    res.header('Content-Length', buffer.length);
    return res.send(buffer);
  }
}
