import {
  Controller,
  Get,
  Param,
  Res,
  Logger,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { APPLE_WALLET_PROVIDER } from './providers/wallet-provider.interface';
import type { WalletProvider } from './providers/wallet-provider.interface';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APPLE_WALLET_PROVIDER) private readonly appleProvider: WalletProvider,
  ) {}

  /**
   * Download a signed (or dev-unsigned) Apple Wallet .pkpass for a membership.
   * GET /wallet/apple/:membershipId/download
   */
  @Get('apple/:membershipId/download')
  @ApiOperation({ summary: 'Download Apple Wallet .pkpass for a membership' })
  async downloadApplePass(
    @Param('membershipId') membershipId: string,
    @Res() res: any,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: { program: true, company: true, user: true },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    const provider = this.appleProvider as any;
    const buffer: Buffer = await provider.generatePkpassBuffer(membership);

    res.header('Content-Type', 'application/vnd.apple.pkpass');
    res.header(
      'Content-Disposition',
      `attachment; filename="${membership.walletId}.pkpass"`,
    );
    res.header('Content-Length', buffer.length);
    return res.send(buffer);
  }
}
