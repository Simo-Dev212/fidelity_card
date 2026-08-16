import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JoinService } from './join.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsOptional, IsObject } from 'class-validator';

class CompleteJoinDto {
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

@ApiTags('join')
@Controller('join')
export class JoinController {
  constructor(private readonly joinService: JoinService) {}

  /**
   * Public landing HTML page — client scans QR/NFC and arrives here.
   * GET /join/:companySlug/:programSlug
   * Renders a self-contained page: company branding, register/login,
   * then "Save to Google Wallet" + "Add to Apple Wallet" buttons.
   */
  @Get(':companySlug/:programSlug')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Public join landing page (HTML)' })
  async getJoinPage(
    @Param('companySlug') companySlug: string,
    @Param('programSlug') programSlug: string,
  ) {
    const { company, program } = await this.joinService.resolveProgram(
      companySlug,
      programSlug,
    );

    const primary =
      program.primaryColor || company.primaryColor || '#4B0E7A';
    const secondary =
      program.secondaryColor || company.secondaryColor || '#00D4C8';
    const accent = company.accentColor || '#E91E8C';
    const logoUrl = program.logoUrl || company.logoUrl || '';
    const heroUrl = program.heroImageUrl || company.heroImageUrl || '';
    const isStamps = program.type === 'STAMPS';
    const settings = (program.settings as Record<string, any>) || {};
    const stampsRequired = settings.stampsRequired || 5;
    const rewardDesc = settings.rewardDescription || (isStamps ? `${stampsRequired} tampons = récompense` : 'Échange tes points contre des récompenses');

    const programTypeLabel = isStamps ? 'Carte Tampons' : 'Programme Points';

    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${company.name} — ${program.name}</title>
  <style>
    :root{--p:${primary};--s:${secondary};--a:${accent}}
    *{box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;margin:0;padding:0;background:linear-gradient(135deg,var(--p) 0%,#1a0533 100%);min-height:100vh;color:#fff}
    .wrap{max-width:440px;margin:0 auto;padding:20px}
    .card{background:#fff;color:#222;border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:0 4px 20px rgba(0,0,0,.2)}
    .hero{border-radius:16px;overflow:hidden;margin-bottom:16px}
    .hero img{width:100%;display:block;max-height:180px;object-fit:cover}
    .logo{width:64px;height:64px;border-radius:14px;object-fit:cover;vertical-align:middle;margin-right:12px}
    h1{font-size:24px;margin:0 0 4px;color:var(--p);line-height:1.2}
    h2{font-size:18px;margin:0 0 16px;color:var(--p)}
    .sub{font-size:14px;color:#666;margin:0 0 16px}
    .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:var(--s);color:#111;margin-bottom:12px}
    .reward-box{background:#f8f5fa;border-left:4px solid var(--p);padding:14px;border-radius:8px;font-size:15px;margin:12px 0}
    label{display:block;font-size:13px;font-weight:600;margin-bottom:5px;color:#444}
    input{width:100%;padding:12px;border:2px solid #ddd;border-radius:10px;font-size:16px;margin-bottom:14px;transition:border .2s}
    input:focus{outline:none;border-color:var(--s)}
    .btn{display:block;width:100%;padding:14px;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;transition:transform .15s,opacity .15s;margin-bottom:10px}
    .btn:active{transform:scale(.98)}
    .btn-primary{background:var(--p);color:#fff}
    .btn-cyan{background:var(--s);color:#111}
    .btn-accent{background:var(--a);color:#fff}
    .btn-outline{background:transparent;border:2px solid var(--p);color:var(--p)}
    .btn:disabled{opacity:.5;cursor:not-allowed}
    .tabs{display:flex;gap:0;margin-bottom:16px}
    .tab{flex:1;padding:10px;text-align:center;font-weight:600;font-size:14px;cursor:pointer;border-bottom:3px solid #eee;color:#888;transition:all .2s}
    .tab.active{border-bottom-color:var(--p);color:var(--p)}
    .hidden{display:none}
    .success{display:none;text-align:center}
    .success .icon{font-size:48px;margin-bottom:8px}
    .wallet-id{background:#f0ecf5;padding:8px 14px;border-radius:8px;font-family:monospace;font-size:14px;display:inline-block;margin:8px 0}
    .balance-display{font-size:36px;font-weight:800;color:var(--p);margin:8px 0}
    .links{display:flex;flex-direction:column;gap:10px;margin-top:16px}
    .err{color:#c0392b;font-size:14px;margin:8px 0;padding:8px;background:#fde;border-radius:6px;display:none}
    .muted{color:#888;font-size:13px}
  </style>
</head>
<body>
  <div class="wrap">
    ${heroUrl ? `<div class="hero"><img src="${heroUrl}" alt="${company.name}" /></div>` : ''}
    <div class="card">
      ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="logo" />` : ''}
      <span class="badge">${programTypeLabel}</span>
      <h1>${program.name}</h1>
      <p class="sub">${company.name}</p>
      <p class="sub">${program.description || ''}</p>
      <div class="reward-box">${rewardDesc}</div>
    </div>

    <div class="card" id="authCard">
      <div class="tabs">
        <div class="tab active" id="tabLogin">Connexion</div>
        <div class="tab" id="tabRegister">Inscription</div>
      </div>

      <div id="loginForm">
        <div class="err" id="loginErr"></div>
        <label>Email</label>
        <input id="loginEmail" type="email" placeholder="ton@email.com" autocomplete="username" />
        <label>Mot de passe</label>
        <input id="loginPassword" type="password" placeholder="••••••••" autocomplete="current-password" />
        <button id="loginBtn" class="btn btn-primary">Se connecter</button>
      </div>

      <div id="registerForm" class="hidden">
        <div class="err" id="registerErr"></div>
        <label>Nom (optionnel)</label>
        <input id="regName" type="text" placeholder="Ton nom" autocomplete="name" />
        <label>Email</label>
        <input id="regEmail" type="email" placeholder="ton@email.com" autocomplete="email" />
        <label>Mot de passe (8+ caractères)</label>
        <input id="regPassword" type="password" placeholder="••••••••" autocomplete="new-password" />
        <button id="registerBtn" class="btn btn-cyan">Créer mon compte</button>
      </div>
    </div>

    <div class="card success" id="successCard">
      <div class="icon">✅</div>
      <h2>Bienvenue !</h2>
      <p>Ta carte de fidélité est prête.</p>
      <div class="wallet-id" id="walletIdDisplay"></div>
      <div class="balance-display" id="balanceDisplay">0</div>
      <p class="muted" id="stampsInfo"></p>
      <div class="links">
        <button id="googleBtn" class="btn btn-primary">Ajouter à Google Wallet</button>
        <button id="appleBtn" class="btn btn-outline">Ajouter à Apple Wallet</button>
      </div>
    </div>

    <div class="card hidden" id="loadingCard">
      <p style="text-align:center" class="muted">Chargement…</p>
    </div>
  </div>

  <script>
    const companySlug = '${companySlug}';
    const programSlug = '${programSlug}';
    const isStamps = ${isStamps};
    const stampsRequired = ${stampsRequired};
    let token = localStorage.getItem('joinToken') || '';
    let membershipData = null;

    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authCard = document.getElementById('authCard');
    const successCard = document.getElementById('successCard');

    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active'); tabRegister.classList.remove('active');
      loginForm.classList.remove('hidden'); registerForm.classList.add('hidden');
    });
    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active'); tabLogin.classList.remove('active');
      registerForm.classList.remove('hidden'); loginForm.classList.add('hidden');
    });

    function showErr(id, msg) {
      const el = document.getElementById(id);
      el.textContent = msg; el.style.display = 'block';
      setTimeout(() => el.style.display = 'none', 5000);
    }

    document.getElementById('loginBtn').addEventListener('click', async () => {
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      if (!email || !password) { showErr('loginErr', 'Email et mot de passe requis'); return; }
      const btn = document.getElementById('loginBtn');
      btn.disabled = true; btn.textContent = 'Connexion…';
      try {
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) { showErr('loginErr', data.message || 'Login échoué'); btn.disabled = false; btn.textContent = 'Se connecter'; return; }
        token = data.accessToken;
        localStorage.setItem('joinToken', token);
        await completeJoin();
      } catch (e) {
        showErr('loginErr', 'Erreur réseau'); btn.disabled = false; btn.textContent = 'Se connecter';
      }
    });

    document.getElementById('registerBtn').addEventListener('click', async () => {
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      if (!email || !password) { showErr('registerErr', 'Email et mot de passe requis'); return; }
      if (password.length < 8) { showErr('registerErr', 'Mot de passe: 8 caractères minimum'); return; }
      const btn = document.getElementById('registerBtn');
      btn.disabled = true; btn.textContent = 'Création…';
      try {
        const res = await fetch('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, locale: 'fr' }),
        });
        const data = await res.json();
        if (!res.ok) { showErr('registerErr', data.message || 'Inscription échouée'); btn.disabled = false; btn.textContent = 'Créer mon compte'; return; }
        token = data.accessToken;
        localStorage.setItem('joinToken', token);
        await completeJoin();
      } catch (e) {
        showErr('registerErr', 'Erreur réseau'); btn.disabled = false; btn.textContent = 'Créer mon compte';
      }
    });

    async function completeJoin() {
      try {
        const res = await fetch('/join/' + companySlug + '/' + programSlug + '/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) { showErr('loginErr', data.message || 'Erreur lors de l\\'inscription'); return; }
        membershipData = data;
        authCard.classList.add('hidden');
        successCard.style.display = 'block';
        document.getElementById('walletIdDisplay').textContent = data.membership.walletId;
        const bal = data.membership.balance;
        document.getElementById('balanceDisplay').textContent = isStamps ? bal + '/' + stampsRequired : bal;
        if (isStamps) document.getElementById('stampsInfo').textContent = stampsRequired + ' tampons = récompense';
        const gBtn = document.getElementById('googleBtn');
        if (data.saveUrl) gBtn.onclick = () => window.open(data.saveUrl, '_blank');
        else gBtn.style.display = 'none';
        const aBtn = document.getElementById('appleBtn');
        aBtn.onclick = () => window.open('/wallet/apple/' + data.membership.id + '/download', '_blank');
      } catch (e) {
        showErr('loginErr', 'Erreur réseau');
      }
    }

    // If already logged in, try to join directly
    if (token) {
      authCard.style.display = 'none';
      document.getElementById('loadingCard').classList.remove('hidden');
      completeJoin().then(() => {
        document.getElementById('loadingCard').classList.add('hidden');
        if (!membershipData) authCard.style.display = 'block';
      });
    }
  </script>
</body>
</html>`;
  }

  /**
   * Public API: resolve company + program info (JSON)
   * GET /join/:companySlug/:programSlug/info
   */
  @Get(':companySlug/:programSlug/info')
  @ApiOperation({ summary: 'Resolve company + program from NFC link (JSON)' })
  async getProgramInfo(
    @Param('companySlug') companySlug: string,
    @Param('programSlug') programSlug: string,
  ) {
    const { company, program } = await this.joinService.resolveProgram(
      companySlug,
      programSlug,
    );

    return {
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logoUrl: company.logoUrl,
        primaryColor: company.primaryColor,
        secondaryColor: company.secondaryColor,
        heroImageUrl: company.heroImageUrl,
      },
      program: {
        id: program.id,
        name: program.name,
        slug: program.slug,
        type: program.type,
        description: program.description,
        settings: program.settings,
        logoUrl: program.logoUrl || company.logoUrl,
        primaryColor: program.primaryColor || company.primaryColor,
      },
    };
  }

  /**
   * After successful authentication → create membership + return Save to Wallet URLs
   * POST /join/:companySlug/:programSlug/complete
   * Requires Bearer JWT
   */
  @Post(':companySlug/:programSlug/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Complete join after auth – creates Membership + Wallet passes and returns saveUrls',
  })
  async completeJoin(
    @Param('companySlug') companySlug: string,
    @Param('programSlug') programSlug: string,
    @Body() dto: CompleteJoinDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;

    const result = await this.joinService.completeJoin({
      userId,
      companySlug,
      programSlug,
      metadata: dto.metadata,
    });

    return {
      success: true,
      alreadyMember: result.alreadyMember,
      membership: {
        id: result.membership.id,
        walletId: result.membership.walletId,
        balance: result.membership.balance,
        status: result.membership.status,
      },
      saveUrl: result.saveUrl,
      appleUrl: `/wallet/apple/${result.membership.id}/download`,
    };
  }
}
