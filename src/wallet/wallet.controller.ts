import {
  Controller,
  Get,
  Param,
  Res,
  Logger,
  NotFoundException,
  Inject,
  HttpException,
  HttpStatus,
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

  @Get('apple/status')
  @ApiOperation({ summary: 'Apple Wallet signing status' })
  appleStatus() {
    const provider = this.appleProvider as any;
    const signed = !!(provider.certificates);
    return {
      signed,
      message: signed
        ? 'Apple Wallet passes will install on real iPhones'
        : 'No Apple Developer certificates — .pkpass will download but iOS will reject install. Use on-screen QR for staff scan.',
    };
  }

  @Get('apple/:membershipId/download')
  @ApiOperation({ summary: 'Download Apple Wallet .pkpass' })
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

    try {
      const provider = this.appleProvider as any;
      if (typeof provider.generatePkpassBuffer !== 'function') {
        throw new Error('Apple provider missing generatePkpassBuffer');
      }
      const buffer: Buffer = await provider.generatePkpassBuffer(membership);

      res.header('Content-Type', 'application/vnd.apple.pkpass');
      res.header(
        'Content-Disposition',
        `attachment; filename="${membership.walletId}.pkpass"`,
      );
      res.header('Content-Length', String(buffer.length));
      res.header('Cache-Control', 'no-store');
      return res.send(buffer);
    } catch (err: any) {
      this.logger.error(`Apple pass failed: ${err?.message || err}`);
      throw new HttpException(
        {
          message:
            'Impossible de générer le .pkpass. Sur iPhone sans certificats Apple Developer, utilise le QR affiché sur ta carte pour la caisse.',
          detail: err?.message || String(err),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
