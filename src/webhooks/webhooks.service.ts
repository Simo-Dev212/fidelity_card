import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { MembershipsService } from '../memberships/memberships.service';
import { LoyaltyEventType } from '@prisma/client';

@Injectable()
export class WebhooksService {
  private readonly webhookSecret: string;

  constructor(
    private readonly config: ConfigService,
    private readonly loyaltyService: LoyaltyService,
    private readonly membershipsService: MembershipsService,
  ) {
    this.webhookSecret = this.config.getOrThrow<string>('WEBHOOK_SECRET');
  }

  validateSecret(secret: string) {
    if (secret !== this.webhookSecret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
  }

  async updateByWalletId(params: {
    walletId: string;
    amount: number;
    reason?: string;
    secret: string;
  }) {
    this.validateSecret(params.secret);

    const membership = await this.membershipsService.findByWalletId(
      params.walletId,
    );
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return this.loyaltyService.updateBalance({
      membershipId: membership.id,
      amount: params.amount,
      type: LoyaltyEventType.WEBHOOK,
      reason: params.reason || 'Webhook update',
      actorType: 'webhook',
      syncWallet: true,
    });
  }
}
