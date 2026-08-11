import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StaffLookupDto {
  @ApiProperty({
    description: 'Raw QR payload, e.g. loyalty:LW-xxxx or plain walletId',
    example: 'loyalty:LW-544CD1A5557F4BCC',
  })
  @IsString()
  code!: string;

  @ApiPropertyOptional({
    description: 'Staff company id for tenant isolation (recommended)',
  })
  @IsOptional()
  @IsString()
  companyId?: string;
}

export class StaffUpdateDto {
  @ApiProperty({
    description: 'Raw QR payload or walletId',
    example: 'loyalty:LW-544CD1A5557F4BCC',
  })
  @IsString()
  code!: string;

  @ApiProperty({
    description: 'Company id of the staff member (tenant isolation)',
  })
  @IsString()
  companyId!: string;

  @ApiProperty({
    description: 'Delta to apply. +1 stamp, +10 points, -5 redeem, etc.',
    example: 1,
  })
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({ example: 'Visit / commande caisse' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    enum: ['EARN', 'REDEEM', 'ADJUST'],
    default: 'EARN',
  })
  @IsOptional()
  @IsIn(['EARN', 'REDEEM', 'ADJUST'])
  type?: 'EARN' | 'REDEEM' | 'ADJUST';
}