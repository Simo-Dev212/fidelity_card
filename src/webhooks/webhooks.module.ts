import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { MembershipsModule } from '../memberships/memberships.module';

@Module({
  imports: [LoyaltyModule, MembershipsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
