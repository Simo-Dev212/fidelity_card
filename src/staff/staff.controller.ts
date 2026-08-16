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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MembershipsService } from '../memberships/memberships.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CompaniesService } from '../companies/companies.service';
import { LoyaltyEventType } from '@prisma/client';

class LookupDto {
  @IsString()
  qr!: string;

  /** Accepts company CUID or slug (e.g. "bigdwich") */
  @IsString()
  companyId!: string;
}

class StaffUpdateDto {
  @IsOptional()
  @IsString()
  membershipId?: string;

  @IsOptional()
  @IsString()
  walletId?: string;

  @IsNumber()
  amount!: number;

  /** Accepts company CUID or slug (e.g. "bigdwich") */
  @IsString()
  companyId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('staff')
@Controller('staff')
export class StaffController {
  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly loyaltyService: LoyaltyService,
    private readonly companiesService: CompaniesService,
  ) {}

  /** Resolve a company from either a CUID or a slug */
  private async resolveCompanyId(idOrSlug: string): Promise<string> {
    if (!idOrSlug) throw new ForbiddenException('Company required');
    const slugLike = !/^[a-z0-9]{20,}$/i.test(idOrSlug);
    if (slugLike) {
      const c = await this.companiesService.findBySlug(idOrSlug);
      if (c) return c.id;
    }
    return idOrSlug;
  }

  @Get('scan')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Scan page for staff (QR scanner) — public' })
  scanPage() {
    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Staff Scan — BigDwich</title>
  <style>
    :root{--purple:#4B0E7A;--cyan:#00D4C8;--pink:#E91E8C}
    body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:16px;background:#f4f1f7;color:#222;max-width:480px;margin:0 auto}
    h2{margin:16px 0 12px;color:var(--purple)}
    .card{background:#fff;border-radius:12px;padding:16px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
    .row{margin-bottom:12px}
    label{display:block;font-size:13px;margin-bottom:4px;color:#555;font-weight:600}
    input{width:100%;padding:10px;box-sizing:border-box;border:1px solid #ccc;border-radius:8px;font-size:15px}
    .btn{padding:11px 16px;background:var(--purple);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:600;transition:opacity .15s}
    .btn:active{transform:scale(.97)}
    .btn:disabled{opacity:.5}
    .btn-cyan{background:var(--cyan);color:#111}
    .btn-pink{background:var(--pink)}
    .btn-gray{background:#888}
    .btn-sm{padding:8px 12px;font-size:13px}
    #reader{width:100%;max-width:320px;margin:8px auto;border-radius:8px;overflow:hidden}
    #result{margin-top:12px;padding:14px;background:#fff;border-radius:12px;min-height:50px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
    .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700}
    .badge-ok{background:#e6f9f4;color:#007a6e}
    .badge-err{background:#fde8f0;color:#b00040}
    .muted{color:#888;font-size:12px}
    .balance-big{font-size:28px;font-weight:800;color:var(--purple)}
    .login-grid{display:flex;gap:8px;flex-wrap:wrap}
    .login-grid .btn{flex:1;min-width:120px}
  </style>
</head>
<body>
  <h2>Staff Scan — BigDwich</h2>

  <div class="card" id="loginCard">
    <div class="row">
      <label>Email staff</label>
      <input id="email" type="email" placeholder="staff@bigdwich.fr" autocomplete="username" />
    </div>
    <div class="row">
      <label>Mot de passe</label>
      <input id="password" type="password" placeholder="••••••••" autocomplete="current-password" />
    </div>
    <div class="login-grid">
      <button id="loginBtn" class="btn btn-cyan">Connexion</button>
      <button id="logoutBtn" class="btn btn-gray btn-sm" style="display:none">Déconnexion</button>
    </div>
    <div id="loginMsg" class="muted" style="margin-top:8px"></div>
  </div>

  <div class="card" id="scanCard" style="display:none">
    <div class="row">
      <label>Restaurant (slug ou ID)</label>
      <input id="company" placeholder="bigdwich" />
    </div>
    <div id="reader"></div>
    <div class="row">
      <button id="startBtn" class="btn">Démarrer caméra</button>
      <button id="stopBtn" class="btn btn-gray btn-sm">Stop</button>
    </div>
    <div class="row">
      <label>QR manuel / walletId</label>
      <input id="manual" placeholder="loyalty:LW-... ou LW-..." />
    </div>
    <button id="lookupBtn" class="btn btn-cyan">Rechercher</button>
  </div>

  <div id="result"><em class="muted">Connecte-toi pour scanner les cartes.</em></div>

  <script src="https://unpkg.com/html5-qrcode@2.3.7/minified/html5-qrcode.min.js"></script>
  <script>
    const resultEl = document.getElementById('result');
    const companyEl = document.getElementById('company');
    const loginCard = document.getElementById('loginCard');
    const scanCard = document.getElementById('scanCard');
    const loginMsg = document.getElementById('loginMsg');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    let token = localStorage.getItem('staffToken') || '';
    let html5QrCode = null;

    function showLoggedIn() {
      loginCard.style.display = 'none';
      scanCard.style.display = 'block';
      logoutBtn.style.display = 'inline-block';
      companyEl.value = localStorage.getItem('staffCompany') || 'bigdwich';
      resultEl.innerHTML = '<em class="muted">Scanne une carte ou entre un walletId.</em>';
    }

    if (token) showLoggedIn();

    loginBtn.addEventListener('click', async () => {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      if (!email || !password) { loginMsg.innerHTML = '<span class="badge badge-err">Email + mot de passe requis</span>'; return; }
      loginMsg.textContent = 'Connexion…';
      try {
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) { loginMsg.innerHTML = '<span class="badge badge-err">' + (data.message || 'Login échoué') + '</span>'; return; }
        token = data.accessToken;
        localStorage.setItem('staffToken', token);
        loginMsg.textContent = '';
        showLoggedIn();
      } catch (e) {
        loginMsg.innerHTML = '<span class="badge badge-err">Erreur réseau</span>';
      }
    });

    logoutBtn.addEventListener('click', () => {
      token = '';
      localStorage.removeItem('staffToken');
      loginCard.style.display = 'block';
      scanCard.style.display = 'none';
      logoutBtn.style.display = 'none';
      resultEl.innerHTML = '<em class="muted">Connecte-toi pour scanner les cartes.</em>';
    });

    companyEl.addEventListener('change', () => localStorage.setItem('staffCompany', companyEl.value.trim()));

    function authHeaders() {
      const h = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = 'Bearer ' + token;
      return h;
    }

    function requireFields() {
      if (!token) { alert('Connecte-toi d\\'abord.'); return false; }
      if (!companyEl.value.trim()) { alert('Entre le slug du restaurant (ex: bigdwich)'); return false; }
      return true;
    }

    document.getElementById('startBtn').addEventListener('click', async () => {
      if (!requireFields()) return;
      if (html5QrCode) { try { await html5QrCode.stop(); } catch (_) {} }
      html5QrCode = new Html5Qrcode('reader');
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (msg) => { html5QrCode.stop().catch(() => {}); doLookup(msg); }
        );
      } catch (e) { alert('Caméra: ' + e); }
    });

    document.getElementById('stopBtn').addEventListener('click', () => {
      if (html5QrCode) html5QrCode.stop().catch(() => {});
    });

    document.getElementById('lookupBtn').addEventListener('click', () => {
      const q = document.getElementById('manual').value.trim();
      if (!q) return alert('Entre un QR ou walletId');
      doLookup(q);
    });

    async function doLookup(q) {
      if (!requireFields()) return;
      resultEl.innerHTML = '<p class="muted">Recherche…</p>';
      try {
        const res = await fetch('/staff/cards/lookup', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ qr: q, companyId: companyEl.value.trim() }),
        });
        const text = await res.text();
        if (!res.ok) { resultEl.innerHTML = '<pre style="color:red">Lookup ' + res.status + ':\\n' + text + '</pre>'; return; }
        const body = JSON.parse(text);
        showMembership(body.membership || body);
      } catch (err) { resultEl.innerHTML = '<pre style="color:red">Error: ' + err + '</pre>'; }
    }

    function showMembership(m) {
      const isStamps = m.program && m.program.type === 'STAMPS';
      const req = (m.program && m.program.settings && m.program.settings.stampsRequired) || 5;
      const balDisp = isStamps ? m.balance + '/' + req : m.balance;
      resultEl.innerHTML =
        '<div><div class="muted">Wallet</div><div><strong>' + m.walletId + '</strong></div>' +
        '<div class="muted" style="margin-top:8px">Solde</div><div class="balance-big">' + balDisp + '</div>' +
        '<div style="margin-top:12px">' +
        '<button id="add1" class="btn btn-sm">+1</button> ' +
        '<button id="add5" class="btn btn-sm">+5</button> ' +
        '<button id="redeem1" class="btn btn-pink btn-sm">-1</button>' +
        '</div></div>';
      document.getElementById('add1').onclick = () => doUpdate(m, 1);
      document.getElementById('add5').onclick = () => doUpdate(m, 5);
      document.getElementById('redeem1').onclick = () => doUpdate(m, -1);
    }

    async function doUpdate(m, amount) {
      if (!requireFields()) return;
      resultEl.innerHTML = '<p class="muted">Mise à jour…</p>';
      try {
        const res = await fetch('/staff/loyalty/update', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            membershipId: m.id,
            amount: amount,
            companyId: m.companyId || companyEl.value.trim(),
            reason: 'Staff caisse',
          }),
        });
        const text = await res.text();
        if (!res.ok) { resultEl.innerHTML = '<pre style="color:red">Update ' + res.status + ':\\n' + text + '</pre>'; return; }
        const body = JSON.parse(text);
        resultEl.innerHTML =
          '<div><span class="badge badge-ok">OK</span> Nouveau solde: <strong>' + body.newBalance + '</strong></div>' +
          '<button id="again" class="btn btn-cyan btn-sm" style="margin-top:8px">Nouveau scan</button>';
        document.getElementById('again').onclick = () => {
          resultEl.innerHTML = '<em class="muted">Scanne ou recherche à nouveau.</em>';
        };
      } catch (err) { resultEl.innerHTML = '<pre style="color:red">Error: ' + err + '</pre>'; }
    }
  </script>
</body>
</html>`;
  }

  @Post('cards/lookup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lookup membership by scanned QR (accepts company slug or id)' })
  async lookup(@Body() dto: LookupDto) {
    const q = dto.qr?.trim();
    const walletId = q?.toLowerCase().startsWith('loyalty:')
      ? q.split(':').slice(1).join(':').trim()
      : q;

    const membership = await this.membershipsService.findByWalletId(walletId);
    if (!membership) throw new NotFoundException('Membership not found');

    const companyId = await this.resolveCompanyId(dto.companyId);
    if (membership.companyId !== companyId) {
      throw new ForbiddenException('Membership does not belong to this company');
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Staff credit/debit after cashier scan (accepts company slug or id)' })
  async update(@Body() dto: StaffUpdateDto) {
    let membership;
    if (dto.membershipId) {
      membership = await this.membershipsService.findById(dto.membershipId);
    } else if (dto.walletId) {
      const wId = dto.walletId.toLowerCase().startsWith('loyalty:')
        ? dto.walletId.split(':').slice(1).join(':').trim()
        : dto.walletId;
      membership = await this.membershipsService.findByWalletId(wId);
    } else {
      throw new NotFoundException('membershipId or walletId required');
    }

    if (!membership) throw new NotFoundException('Membership not found');

    const companyId = await this.resolveCompanyId(dto.companyId);
    if (membership.companyId !== companyId) {
      throw new ForbiddenException('Membership does not belong to this company');
    }

    const type =
      dto.amount >= 0 ? LoyaltyEventType.EARN : LoyaltyEventType.REDEEM;

    const updated = await this.loyaltyService.updateBalance({
      membershipId: membership.id,
      amount: dto.amount,
      type,
      reason: dto.reason || 'Staff update',
      actorType: 'staff',
      syncWallet: true,
    });

    return {
      success: true,
      membershipId: updated.id,
      newBalance: updated.balance,
    };
  }
}
