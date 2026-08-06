import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { LoyaltyEventType, MembershipStatus } from '@prisma/client';

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: WalletService,
  ) {}

  async recordEvent(params: {
    membershipId: string;
    companyId: string;
    type: LoyaltyEventType;
    amount: number;
    previousBalance: number;
    newBalance: number;
    reason?: string;
    actorId?: string;
    actorType?: string;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.loyaltyHistory.create({
      data: {
        membershipId: params.membershipId,
        companyId: params.companyId,
        type: params.type,
        amount: params.amount,
        previousBalance: params.previousBalance,
        newBalance: params.newBalance,
        reason: params.reason,
        actorId: params.actorId,
        actorType: params.actorType,
        metadata: params.metadata || {},
      },
    });
  }

  /**
   * Core balance update – always goes through history + optional wallet sync
   */
  async updateBalance(params: {
    membershipId: string;
    amount: number; // can be negative for redeem
    type: LoyaltyEventType;
    reason?: string;
    actorId?: string;
    actorType?: string;
    metadata?: Record<string, any>;
    syncWallet?: boolean;
  }) {
    const membership = await this.prisma.membership.findUniqueOrThrow({
      where: { id: params.membershipId },
    });

    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new Error('Membership is not active');
    }

    const previousBalance = membership.balance;
    const newBalance = Math.max(0, previousBalance + params.amount); // never negative for now

    const updated = await this.prisma.$transaction(async (tx) => {
      const m = await tx.membership.update({
        where: { id: params.membershipId },
        data: { balance: newBalance },
      });

      await tx.loyaltyHistory.create({
        data: {
          membershipId: params.membershipId,
          companyId: membership.companyId,
          type: params.type,
          amount: params.amount,
          previousBalance,
          newBalance,
          reason: params.reason,
          actorId: params.actorId,
          actorType: params.actorType || 'system',
          metadata: params.metadata || {},
        },
      });

      return m;
    });

    // Push to Google Wallet (async, non-blocking for the response if desired)
    if (params.syncWallet !== false) {
      try {
        await this.walletService.syncPass(params.membershipId);
      } catch (err: any) {
        this.logger.warn(
          `Wallet sync failed after balance update (membership ${params.membershipId}): ${err.message}`,
        );
        // We still return success – the history is recorded; sync can be retried
      }
    }

    return updated;
  }
}
