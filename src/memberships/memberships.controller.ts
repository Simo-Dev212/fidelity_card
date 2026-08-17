import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipsService } from './memberships.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('memberships')
@Controller('memberships')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MembershipsController {
  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('mine')
  @ApiOperation({ summary: 'Get all memberships for the current user (client)' })
  async findMine(@Req() req: any) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId: req.user.id },
      include: {
        program: { select: { id: true, name: true, slug: true, type: true, settings: true, primaryColor: true, secondaryColor: true, logoUrl: true } },
        company: { select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true, secondaryColor: true } },
        walletPass: { select: { id: true, provider: true, status: true } },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => ({
      ...m,
      appleUrl: `/wallet/apple/${m.id}/download`,
    }));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membershipsService.findById(id);
  }

  @Get('wallet/:walletId')
  findByWalletId(@Param('walletId') walletId: string) {
    return this.membershipsService.findByWalletId(walletId);
  }
}
