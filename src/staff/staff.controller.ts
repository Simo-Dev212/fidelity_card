import {
  Controller,
  Get,
  Post,
  Body,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, RequireRoles } from '../auth/guards/roles.guard';
import { MembershipsService } from '../memberships/memberships.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoyaltyEventType, StaffStatus } from '@prisma/client';

class LookupDto {
  @IsOptional() @IsString() qr?: string;
  @IsOptional() @IsString() code?: string;
}

class StaffUpdateDto {
  @IsOptional() @IsString() membershipId?: string;
  @IsOptional() @IsString() walletId?: string;
  @IsOptional() @IsString() code?: string;
  @IsNumber() amount!: number;
  @IsOptional() @IsString() reason?: string;
}

type Authed = { id: string; email: string; role?: string };

@ApiTags('staff')
@Controller('staff')
export class StaffController {
  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly loyaltyService: LoyaltyService,
    private readonly prisma: PrismaService,
  ) {}

  private parseWalletId(raw: string): string {
    const q = (raw || '').trim();
    if (!q) throw new NotFoundException('QR vide');
    if (q.toLowerCase().includes('/join/')) {
      throw new ForbiddenException(
        "QR mural d'inscription — demande au client d'ouvrir sa carte.",
      );
    }
    return q.toLowerCase().startsWith('loyalty:')
      ? q.slice('loyalty:'.length).trim()
      : q;
  }

  private async assignedCompanyId(user: Authed): Promise<string> {
    if (!user?.id) throw new ForbiddenException('Non authentifié');
    if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Compte caisse requis');
    }
    if (user.role === 'ADMIN') {
      const first = await this.prisma.company.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      if (first) return first.id;
      throw new ForbiddenException('Aucune entreprise configurée');
    }
    const assignment = await this.prisma.staffAssignment.findFirst({
      where: { userId: user.id, status: StaffStatus.ACTIVE },
      include: { company: { select: { id: true, slug: true, name: true } } },
    });
    if (!assignment) {
      throw new ForbiddenException(
        'Aucun restaurant assigné. Demande à ton gérant.',
      );
    }
    return assignment.companyId;
  }

  @Get('session')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assigned restaurant for the signed-in staff account' })
  async session(@Req() req: { user: Authed }) {
    const companyId = await this.assignedCompanyId(req.user);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, slug: true, name: true, primaryColor: true, logoUrl: true },
    });
    return { role: req.user.role, company };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stats for the staff assigned company' })
  async stats(@Req() req: { user: Authed }) {
    const companyId = await this.assignedCompanyId(req.user);
    const [agg, recent, programs] = await Promise.all([
      this.prisma.membership.aggregate({
        where: { companyId },
        _count: true,
        _sum: { balance: true },
      }),
      this.prisma.loyaltyHistory.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          membership: {
            select: {
              walletId: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      }),
      this.prisma.program.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true, slug: true, type: true, settings: true },
      }),
    ]);
    return {
      members: agg._count,
      totalBalance: agg._sum.balance || 0,
      recent,
      programs,
    };
  }

  @Get('scan')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Redirect staff to role-locked PWA caisse' })
  scanPage() {
    return `<!doctype html><html><head><meta http-equiv="refresh" content="0;url=/app/staff"/><title>Caisse</title></head>
<body style="font-family:system-ui;background:#0c0c0e;color:#f5f5f7;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<p>Redirection vers la caisse… <a href="/app/staff" style="color:#0071e3">Ouvrir</a></p>
</body></html>`;
  }

  @Post('cards/lookup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lookup by loyalty:{walletId} — company locked to assignment' })
  async lookup(@Body() dto: LookupDto, @Req() req: { user: Authed }) {
    const companyId = await this.assignedCompanyId(req.user);
    const walletId = this.parseWalletId(dto.qr || dto.code || '');
    const membership = await this.membershipsService.findByWalletId(walletId);
    if (!membership) throw new NotFoundException('Carte introuvable');
    if (membership.companyId !== companyId) {
      throw new ForbiddenException("Cette carte n'appartient pas à ton restaurant");
    }
    const program = membership.program || ({} as any);
    return {
      success: true,
      membership: {
        id: membership.id,
        walletId: membership.walletId,
        balance: membership.balance,
        status: membership.status,
        program: {
          id: program.id,
          slug: program.slug,
          type: program.type,
          settings: program.settings,
        },
        companyId: membership.companyId,
      },
    };
  }

  @Post('loyalty/update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Credit/debit after scan — company locked to assignment' })
  async update(@Body() dto: StaffUpdateDto, @Req() req: { user: Authed }) {
    const companyId = await this.assignedCompanyId(req.user);
    let membership;
    if (dto.membershipId) {
      membership = await this.membershipsService.findById(dto.membershipId);
    } else if (dto.walletId || dto.code) {
      membership = await this.membershipsService.findByWalletId(
        this.parseWalletId(dto.walletId || dto.code || ''),
      );
    } else {
      throw new NotFoundException('membershipId or walletId required');
    }
    if (!membership) throw new NotFoundException('Carte introuvable');
    if (membership.companyId !== companyId) {
      throw new ForbiddenException("Cette carte n'appartient pas à ton restaurant");
    }
    const type = dto.amount >= 0 ? LoyaltyEventType.EARN : LoyaltyEventType.REDEEM;
    const updated = await this.loyaltyService.updateBalance({
      membershipId: membership.id,
      amount: dto.amount,
      type,
      reason: dto.reason || 'Staff caisse',
      actorType: 'staff',
      actorId: req.user.id,
      syncWallet: true,
    });
    return {
      success: true,
      membershipId: updated.id,
      newBalance: updated.balance,
    };
  }
}
