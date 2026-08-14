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
import { LoyaltyEventType } from '@prisma/client';

class LookupDto {
  @IsString()
  qr!: string;

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
  ) {}

  @Get('scan')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Scan page for staff (QR scanner) — public' })
  scanPage() {
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Staff Scan — BigDwich</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;margin:16px;max-width:480px}
    #reader{width:100%;max-width:320px;margin:8px 0}
    .row{margin-bottom:10px}
    label{display:block;font-size:13px;margin-bottom:4px;color:#333}
    input{width:100%;padding:8px;box-sizing:border-box;border:1px solid #ccc;border-radius:4px}
    .btn{padding:10px 14px;background:#4B0E7A;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px}
    .btn:disabled{opacity:.5}
    .btn-cyan{background:#00D4C8;color:#111}
    .btn-pink{background:#E91E8C}
    .btn-gray{background:#888}
    #result{margin-top:12px;padding:12px;background:#f6f6f6;border-radius:8px;min-height:40px}
    h2{margin:0 0 12px;color:#4B0E7A}
  </style>
</head>
<body>
  <h2>Staff Scan</h2>

  <div class="row">
    <label>Access token (JWT après login Swagger)</label>
    <input id="token" placeholder="eyJhbGciOiJIUzI1NiIs..." />
  </div>

  <div class="row">
    <label>Company ID</label>
    <input id="companyId" placeholder="cmsj..." />
  </div>

  <div id="reader"></div>

  <div class="row">
    <button id="startBtn" class="btn">Start Camera</button>
    <button id="stopBtn" class="btn btn-gray">Stop</button>
  </div>

  <div class="row">
    <label>QR manuel / walletId</label>
    <input id="manual" placeholder="loyalty:LW-... ou LW-..." />
  </div>
  <div class="row">
    <button id="lookupBtn" class="btn btn-cyan">Lookup</button>
  </div>

  <div id="result"><em>Prêt — colle le token + companyId</em></div>

  <script src="https://unpkg.com/html5-qrcode@2.3.7/minified/html5-qrcode.min.js"></script>
  <script>
    const resultEl = document.getElementById('result');
    const companyEl = document.getElementById('companyId');
    const tokenEl = document.getElementById('token');
    let html5QrCode = null;

    // garde le token si tu recharges la page
    tokenEl.value = localStorage.getItem('staffToken') || '';
    companyEl.value = localStorage.getItem('staffCompanyId') || '';
    tokenEl.addEventListener('change', () => localStorage.setItem('staffToken', tokenEl.value.trim()));
    companyEl.addEventListener('change', () => localStorage.setItem('staffCompanyId', companyEl.value.trim()));

    function authHeaders() {
      const token = tokenEl.value.trim();
      const h = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = 'Bearer ' + token;
      return h;
    }

    function requireFields() {
      if (!tokenEl.value.trim()) { alert('Colle le access_token (login Swagger)'); return false; }
      if (!companyEl.value.trim()) { alert('Entre le companyId'); return false; }
      return true;
    }

    document.getElementById('startBtn').addEventListener('click', async () => {
      if (!requireFields()) return;
      if (html5QrCode) {
        try { await html5QrCode.stop(); } catch (_) {}
      }
      html5QrCode = new Html5Qrcode('reader');
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (qrCodeMessage) => {
            html5QrCode.stop().catch(() => {});
            doLookup(qrCodeMessage);
          }
        );
      } catch (e) {
        alert('Caméra: ' + e);
      }
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
      resultEl.innerHTML = '<p>Lookup…</p>';
      try {
        const res = await fetch('/staff/cards/lookup', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ qr: q, companyId: companyEl.value.trim() }),
        });
        const text = await res.text();
        if (!res.ok) {
          resultEl.innerHTML = '<pre style="color:red">Lookup ' + res.status + ':\\n' + text + '</pre>';
          return;
        }
        const body = JSON.parse(text);
        showMembership(body.membership || body);
      } catch (err) {
        resultEl.innerHTML = '<pre style="color:red">Error: ' + err + '</pre>';
      }
    }

    function showMembership(m) {
      const isStamps = m.program && m.program.type === 'STAMPS';
      let stampsLine = '';
      if (isStamps) {
        const req = (m.program.settings && m.program.settings.stampsRequired) || 5;
        stampsLine = '<div><strong>Tampons:</strong> ' + m.balance + '/' + req + '</div>';
      }
      resultEl.innerHTML =
        '<div>' +
        '<div><strong>Wallet:</strong> ' + m.walletId + '</div>' +
        '<div><strong>Membership:</strong> ' + m.id + '</div>' +
        '<div><strong>Solde:</strong> ' + m.balance + '</div>' +
        stampsLine +
        '<div style="margin-top:10px">' +
        '<button id="add1" class="btn">+1</button> ' +
        '<button id="redeem1" class="btn btn-pink">-1 Redeem</button>' +
        '</div></div>';
      document.getElementById('add1').onclick = () => doUpdate(m, 1);
      document.getElementById('redeem1').onclick = () => doUpdate(m, -1);
    }

    async function doUpdate(m, amount) {
      if (!requireFields()) return;
      resultEl.innerHTML = '<p>Update…</p>';
      try {
        const res = await fetch('/staff/loyalty/update', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            membershipId: m.id,
            amount: amount,
            companyId: m.companyId || companyEl.value.trim(),
            reason: 'Staff scan',
          }),
        });
        const text = await res.text();
        if (!res.ok) {
          resultEl.innerHTML = '<pre style="color:red">Update ' + res.status + ':\\n' + text + '</pre>';
          return;
        }
        const body = JSON.parse(text);
        resultEl.innerHTML =
          '<div style="color:green"><strong>OK</strong> — nouveau solde: ' +
          body.newBalance +
          '</div>' +
          '<button id="again" class="btn btn-cyan" style="margin-top:8px">Rescan / Lookup</button>';
        document.getElementById('again').onclick = () => {
          resultEl.innerHTML = '<em>Scanne ou lookup à nouveau</em>';
        };
      } catch (err) {
        resultEl.innerHTML = '<pre style="color:red">Error: ' + err + '</pre>';
      }
    }
  </script>
</body>
</html>`;
  }

 

  @Post('cards/lookup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lookup membership by scanned QR' })
  async lookup(@Body() dto: LookupDto) {
    const q = dto.qr?.trim();
    const walletId = q?.toLowerCase().startsWith('loyalty:')
      ? q.split(':').slice(1).join(':').trim()
      : q;

    const membership = await this.membershipsService.findByWalletId(walletId);
    if (!membership) throw new NotFoundException('Membership not found');
    if (membership.companyId !== dto.companyId) {
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
  @ApiOperation({ summary: 'Staff credit/debit after cashier scan' })
  async update(@Body() dto: StaffUpdateDto) {
    let membership;
    if (dto.membershipId) {
      membership = await this.membershipsService.findById(dto.membershipId);
    } else if (dto.walletId) {
      membership = await this.membershipsService.findByWalletId(dto.walletId);
    } else {
      throw new NotFoundException('membershipId or walletId required');
    }

    if (!membership) throw new NotFoundException('Membership not found');
    if (membership.companyId !== dto.companyId) {
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