import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { LoyaltyEventType, MembershipStatus } from '@prisma/client';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  parseWalletId(code: string): string {
    const raw = (code || '').trim();
    if (!raw) throw new BadRequestException('Empty scan code');
    if (raw.startsWith('loyalty:')) return raw.slice('loyalty:'.length).trim();
    return raw;
  }

  async lookupByCode(code: string, staffCompanyId?: string) {
    const walletId = this.parseWalletId(code);
    const membership = await this.prisma.membership.findUnique({
      where: { walletId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        program: {
          select: {
            id: true,
            name: true,
            type: true,
            settings: true,
            slug: true,
          },
        },
        company: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!membership) throw new NotFoundException('Carte introuvable');
    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new ForbiddenException('Carte inactive');
    }
    if (staffCompanyId && membership.companyId !== staffCompanyId) {
      throw new ForbiddenException(
        'Cette carte n’appartient pas à ce restaurant',
      );
    }

    const settings = (membership.program.settings as Record<string, unknown>) || {};
    const isStamps = membership.program.type === 'STAMPS';
    const stampsRequired =
      typeof settings.stampsRequired === 'number' ? settings.stampsRequired : 5;

    return {
      membershipId: membership.id,
      walletId: membership.walletId,
      balance: membership.balance,
      displayBalance: isStamps
        ? `${membership.balance}/${stampsRequired}`
        : String(membership.balance),
      programType: membership.program.type,
      programName: membership.program.name,
      rewardDescription: (settings.rewardDescription as string) || null,
      stampsRequired: isStamps ? stampsRequired : null,
      customer: {
        name: membership.user.name,
        email: membership.user.email,
      },
      company: membership.company,
    };
  }

  async updateByCode(params: {
    code: string;
    companyId: string;
    amount: number;
    reason?: string;
    type?: 'EARN' | 'REDEEM' | 'ADJUST';
    actorId?: string;
  }) {
    const card = await this.lookupByCode(params.code, params.companyId);

    const eventType =
      params.type === 'REDEEM'
        ? LoyaltyEventType.REDEEM
        : params.type === 'ADJUST'
          ? LoyaltyEventType.ADJUST
          : LoyaltyEventType.EARN;

    const amount =
      params.type === 'REDEEM' && params.amount > 0
        ? -Math.abs(params.amount)
        : params.amount;

    const updated = await this.loyaltyService.updateBalance({
      membershipId: card.membershipId,
      amount,
      type: eventType,
      reason: params.reason || `Staff caisse (${eventType})`,
      actorId: params.actorId,
      actorType: 'staff',
      syncWallet: true,
    });

    const refreshed = await this.lookupByCode(params.code, params.companyId);
    return {
      success: true,
      previousBalance: card.balance,
      newBalance: updated.balance,
      displayBalance: refreshed.displayBalance,
      membershipId: updated.id,
      walletId: card.walletId,
      customer: card.customer,
    };
  }
}