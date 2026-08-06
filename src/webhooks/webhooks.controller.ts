import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { IsString, IsNumber, IsOptional } from 'class-validator';

class WebhookUpdateDto {
  @IsString()
  walletId: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsString()
  secret: string;
}

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('loyalty/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update points/stamps by walletId (protected by shared secret)',
  })
  async update(@Body() dto: WebhookUpdateDto) {
    const membership = await this.webhooksService.updateByWalletId(dto);
    return {
      success: true,
      membershipId: membership.id,
      newBalance: membership.balance,
    };
  }
}
