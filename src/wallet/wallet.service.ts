import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WALLET_PROVIDER } from './providers/wallet-provider.interface';
import type { WalletProvider } from './providers/wallet-provider.interface';
import { Membership, WalletPassStatus, WalletProviderType } from '@prisma/client';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WALLET_PROVIDER) private readonly provider: WalletProvider,
  ) {}

  /**
   * Create Google (or future Apple) pass for a newly created membership.
   * Returns the saveUrl that the frontend / response should give to the user.
   */
  async createPassForMembership(membershipId: string) {
    const membership = await this.prisma.membership.findUniqueOrThrow({
      where: { id: membershipId },
      include: {
        program: true,
        company: true,
        user: true,
      },
    });

    const result = await this.provider.createPass(membership);

    await this.prisma.walletPass.create({
      data: {
        membershipId: membership.id,
        companyId: membership.companyId,
        provider: this.provider.providerName as WalletProviderType,
        externalId: result.externalId,
        saveUrl: result.saveUrl,
        status: WalletPassStatus.ACTIVE,
        lastSyncAt: new Date(),
      },
    });

    this.logger.log(
      `Wallet pass created for membership ${membershipId} → ${result.externalId}`,
    );

    return result;
  }

  /**
   * Called after every balance change. Pushes update to Google Wallet.
   */
  async syncPass(membershipId: string) {
    const membership = await this.prisma.membership.findUniqueOrThrow({
      where: { id: membershipId },
      include: {
        program: true,
        company: true,
        user: true,
        walletPass: true,
      },
    });

    if (!membership.walletPass) {
      this.logger.warn(`No wallet pass for membership ${membershipId}, skipping sync`);
      return;
    }

    try {
      const result = await this.provider.updatePass(membership);

      await this.prisma.walletPass.update({
        where: { id: membership.walletPass.id },
        data: {
          status: WalletPassStatus.UPDATED,
          lastSyncAt: new Date(),
          lastError: null,
        },
      });

      return result;
    } catch (err: any) {
      this.logger.error(`Failed to sync pass ${membershipId}: ${err.message}`);
      await this.prisma.walletPass.update({
        where: { id: membership.walletPass.id },
        data: {
          status: WalletPassStatus.FAILED,
          lastError: err.message?.slice(0, 500),
        },
      });
      throw err;
    }
  }
  /**
   * Always return a freshly signed saveUrl JWT.
   * Updates walletPass.saveUrl in DB so the latest link is stored.
   * Safe to call for existing memberships (does not recreate the Google object).
   */
  async regenerateSaveUrlForMembership(membershipId: string): Promise<string> {
    const membership = await this.prisma.membership.findUniqueOrThrow({
      where: { id: membershipId },
      include: {
        program: true,
        company: true,
        user: true,
        walletPass: true,
      },
    });

    if (!membership.walletPass) {
      const result = await this.createPassForMembership(membershipId);
      return result.saveUrl;
    }

    // Local const → TypeScript narrows correctly (no more red underline on .id)
    const walletPass = membership.walletPass;

    const saveUrl = this.provider.getSaveUrl(membership);

    await this.prisma.walletPass.update({
      where: { id: walletPass.id },
      data: {
        saveUrl,
        lastSyncAt: new Date(),
      },
    });

    this.logger.log(
      `Regenerated saveUrl JWT for membership ${membershipId}`,
    );

    return saveUrl;
  }
    }

