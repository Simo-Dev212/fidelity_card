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
  @IsOptional()
  @IsString()
  qr?: string;

  @IsOptional()
  @IsString()
  code?: string;
}

class StaffUpdateDto {
  @IsOptional()
  @IsString()
  membershipId?: string;

  @IsOptional()
  @IsString()
  walletId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
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

  /** Company comes from StaffAssignment — never from the client body. */
  private async assignedCompanyId(user: Authed): Promise<string> {
    if (!user?.id) throw new ForbiddenException('Non authentifié');
    if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Compte caisse requis');
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
      select: { id: true, slug: true, name: true },
    });
    return { role: req.user.role, company };
  }

  @Get('scan')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({
    summary: 'Staff scan page — login required, company locked to assignment',
  })
  scanPage() {
    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Caisse — Fidélité</title>
  <style>
    :root{--ink:#0c0c0e;--paper:#f2f1ee;--line:#d4d0c8}
    body{font-family:system-ui,sans-serif;margin:0;background:var(--ink);color:var(--paper)}
    .wrap{max-width:480px;margin:0 auto;padding:20px}
    h2{margin:0 0 16px;font-weight:600}
    .card{background:#151518;border:1px solid #2a2a30;border-radius:20px;padding:16px;margin-bottom:14px}
    label{display:block;font-size:13px;margin-bottom:6px;opacity:.7}
    input{width:100%;padding:12px;box-sizing:border-box;border:1px solid #2a2a30;border-radius:8px;background:#1c1c21;color:var(--paper);font-size:16px}
    .btn{padding:12px 16px;background:var(--paper);color:var(--ink);border:none;border-radius:8px;font-weight:600;cursor:pointer}
    .btn-ghost{background:transparent;color:var(--paper);border:1px solid #2a2a30}
    #reader{width:100%;max-width:320px;margin:8px auto}
    .muted{opacity:.65;font-size:13px}
    .balance{font-size:32px;font-weight:600}
    .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
  </style>
</head>
<body>
  <div class="wrap">
  <h2>Caisse</h2>
  <div class="card" id="loginCard">
    <label>Email staff</label>
    <input id="email" type="email" autocomplete="username" />
    <label style="margin-top:10px">Mot de passe</label>
    <input id="password" type="password" autocomplete="current-password" />
    <p style="margin-top:12px"><button id="loginBtn" class="btn">Connexion</button></p>
    <p id="loginMsg" class="muted"></p>
  </div>
  <div class="card" id="scanCard" style="display:none">
    <p id="companyLabel" class="muted"></p>
    <div id="reader"></div>
    <div class="row">
      <button id="startBtn" class="btn">Caméra</button>
      <button id="fileBtn" class="btn btn-ghost">Photo du QR</button>
      <button id="stopBtn" class="btn btn-ghost">Stop</button>
    </div>
    <input id="file" type="file" accept="image/*" capture="environment" style="display:none" />
    <label style="margin-top:12px">QR / walletId</label>
    <input id="manual" placeholder="loyalty:LW-…" />
    <div class="row">
      <button id="lookupBtn" class="btn">Ouvrir</button>
      <button id="logoutBtn" class="btn btn-ghost">Déconnexion</button>
    </div>
  </div>
  <div id="result" class="muted">Connecte-toi avec un compte caisse assigné.</div>
  </div>
  <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
  <script>
    const resultEl = document.getElementById('result');
    let token = localStorage.getItem('staffToken') || '';
    let company = null;
    let html5QrCode = null;

    function headers() {
      return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
    }

    async function loadSession() {
      const res = await fetch('/staff/session', { headers: headers() });
      if (!res.ok) throw new Error('Compte caisse requis ou restaurant non assigné');
      const data = await res.json();
      company = data.company;
      document.getElementById('loginCard').style.display = 'none';
      document.getElementById('scanCard').style.display = 'block';
      document.getElementById('companyLabel').textContent = company
        ? (company.name + ' · ' + company.slug)
        : '';
      resultEl.textContent = 'Scanne loyalty:… (pas le QR mural).';
    }

    if (token) loadSession().catch(function () { token = ''; localStorage.removeItem('staffToken'); });

    document.getElementById('loginBtn').onclick = async function () {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password }),
      });
      const data = await res.json();
      if (!res.ok) { document.getElementById('loginMsg').textContent = data.message || 'Login échoué'; return; }
      token = data.accessToken;
      localStorage.setItem('staffToken', token);
      try { await loadSession(); }
      catch (e) { document.getElementById('loginMsg').textContent = e.message; }
    };

    document.getElementById('logoutBtn').onclick = function () {
      token = ''; localStorage.removeItem('staffToken'); location.reload();
    };

    document.getElementById('startBtn').onclick = async function () {
      if (html5QrCode) { try { await html5QrCode.stop(); } catch (_) {} }
      html5QrCode = new Html5Qrcode('reader');
      await html5QrCode.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, function (msg) {
        html5QrCode.stop().catch(function () {});
        doLookup(msg);
      });
    };
    document.getElementById('stopBtn').onclick = function () {
      if (html5QrCode) html5QrCode.stop().catch(function () {});
    };
    document.getElementById('fileBtn').onclick = function () {
      document.getElementById('file').click();
    };
    document.getElementById('file').onchange = async function (e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        if (!html5QrCode) html5QrCode = new Html5Qrcode('reader');
        const msg = await html5QrCode.scanFile(file, true);
        doLookup(msg);
      } catch (err) {
        resultEl.textContent = 'Aucun QR sur cette photo.';
      }
    };
    document.getElementById('lookupBtn').onclick = function () {
      const q = document.getElementById('manual').value.trim();
      if (q) doLookup(q);
    };

    async function doLookup(q) {
      resultEl.textContent = 'Recherche…';
      const res = await fetch('/staff/cards/lookup', {
        method: 'POST', headers: headers(), body: JSON.stringify({ qr: q }),
      });
      const text = await res.text();
      if (!res.ok) { resultEl.innerHTML = '<pre style="color:#c45c4a">' + text + '</pre>'; return; }
      const body = JSON.parse(text);
      const m = body.membership || body;
      resultEl.innerHTML = '<div class="card"><div class="muted">' + (m.walletId || '') + '</div><div class="balance">' +
        m.balance + '</div><p><button id="add1" class="btn">+1 tampon</button> <button id="redeem" class="btn btn-ghost">Récompense</button></p></div>';
      document.getElementById('add1').onclick = function () { doUpdate(m, 1); };
      document.getElementById('redeem').onclick = function () { doUpdate(m, -1); };
    }

    async function doUpdate(m, amount) {
      const res = await fetch('/staff/loyalty/update', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ membershipId: m.id, amount: amount, reason: 'Caisse' }),
      });
      const text = await res.text();
      if (!res.ok) { resultEl.innerHTML = '<pre style="color:#c45c4a">' + text + '</pre>'; return; }
      const body = JSON.parse(text);
      resultEl.innerHTML = '<p>OK · solde ' + body.newBalance + '</p>';
    }
  </script>
</body>
</html>`;
  }

  @Post('cards/lookup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lookup by loyalty:{walletId} — company locked to staff assignment',
  })
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
  @ApiOperation({
    summary: 'Credit/debit after scan — company locked to staff assignment',
  })
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
