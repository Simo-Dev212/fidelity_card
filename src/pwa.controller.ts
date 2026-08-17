import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('app')
@Controller('app')
export class PwaController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'PWA entry point' })
  index() {
    return this.shell('Loyalty Wallet', 'auth');
  }

  @Get('auth')
  @Header('Content-Type', 'text/html; charset=utf-8')
  auth() {
    return this.shell('Sign In', 'auth');
  }

  @Get('client')
  @Header('Content-Type', 'text/html; charset=utf-8')
  client() {
    return this.shell('My Wallet', 'client');
  }

  @Get('staff')
  @Header('Content-Type', 'text/html; charset=utf-8')
  staff() {
    return this.shell('Staff Dashboard', 'staff');
  }

  @Get('admin')
  @Header('Content-Type', 'text/html; charset=utf-8')
  admin() {
    return this.shell('Admin Dashboard', 'admin');
  }

  private shell(title: string, route: string): string {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="theme-color" content="#000000" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
  <title>${title}</title>
  <style>${CSS}</style>
</head>
<body>
  <div id="app"></div>
  <script>
    window.__ROUTE__ = ${JSON.stringify(route)};
    window.__TITLE__ = ${JSON.stringify(title)};
  </script>
  <script>${JS}</script>
</body>
</html>`;
  }
}

const CSS = `
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
:root{
  --bg:#f5f5f7;--surface:#fff;--text:#1d1d1f;--text2:#6e6e73;--text3:#86868b;
  --blue:#0071e3;--blue2:#0058b0;--green:#34c759;--red:#ff3b30;--orange:#ff9500;
  --border:#d2d2d7;--radius:12px;--radius-lg:18px;
  --shadow:0 1px 3px rgba(0,0,0,.08),0 4px 12px rgba(0,0,0,.04);
  --shadow-lg:0 4px 24px rgba(0,0,0,.1);
  --nav-h:48px;--safe-b:env(safe-area-inset-bottom,0px);--safe-t:env(safe-area-inset-top,0px);
}
html,body{height:100%;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,sans-serif;font-size:17px;line-height:1.47;-webkit-font-smoothing:antialiased}
#app{min-height:100%;max-width:480px;margin:0 auto;position:relative}
a{color:var(--blue);text-decoration:none}
button{font-family:inherit;font-size:inherit;cursor:pointer;border:none;background:none}
input{font-family:inherit;font-size:inherit}
.hidden{display:none!important}
.muted{color:var(--text2)}
.center{text-align:center}
.spin{display:inline-block;width:24px;height:24px;border:2px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}

.nav{position:sticky;top:0;z-index:50;height:calc(var(--nav-h) + var(--safe-t));padding-top:var(--safe-t);display:flex;align-items:center;justify-content:space-between;padding-inline:16px;background:rgba(245,245,247,.8);backdrop-filter:saturate(180%) blur(20px);border-bottom:.5px solid var(--border)}
.nav .title{font-size:17px;font-weight:600;letter-spacing:-.02em}
.nav .btn{font-size:15px;color:var(--blue);font-weight:500;padding:4px 8px;border-radius:6px}
.nav .btn:active{opacity:.5}

.view{padding:16px 20px calc(80px + var(--safe-b));animation:fade .3s ease}
@keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

.tabbar{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;display:flex;height:calc(56px + var(--safe-b));padding-bottom:var(--safe-b);background:rgba(255,255,255,.9);backdrop-filter:saturate(180%) blur(20px);border-top:.5px solid var(--border);z-index:100}
.tabbar button{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding-top:8px;color:var(--text3);font-size:10px;font-weight:500}
.tabbar button.active{color:var(--blue)}
.tabbar button svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:1.8}

.card{background:var(--surface);border-radius:var(--radius-lg);padding:20px;box-shadow:var(--shadow);margin-bottom:12px}
.card h2{font-size:22px;font-weight:700;letter-spacing:-.02em;margin-bottom:4px}
.card p{color:var(--text2);font-size:15px}

.hero{padding:40px 20px 24px;text-align:center}
.hero h1{font-size:28px;font-weight:700;letter-spacing:-.03em;margin-bottom:8px}
.hero p{color:var(--text2);font-size:15px}

.field{margin-bottom:16px}
.field label{display:block;font-size:13px;font-weight:600;color:var(--text2);margin-bottom:6px}
.field input{width:100%;padding:14px 16px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);font-size:17px;transition:border .2s}
.field input:focus{outline:none;border-color:var(--blue)}
.field select{width:100%;padding:14px 16px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);font-size:17px}

.btn{display:block;width:100%;padding:16px;border-radius:var(--radius);background:var(--blue);color:#fff;font-size:17px;font-weight:600;transition:transform .15s,opacity .15s;text-align:center}
.btn:active{transform:scale(.97);opacity:.8}
.btn:disabled{opacity:.5}
.btn-secondary{background:var(--surface);color:var(--blue);border:1px solid var(--border)}
.btn-danger{background:var(--red)}
.btn-success{background:var(--green)}
.btn-sm{padding:10px 16px;font-size:15px;width:auto;display:inline-block}

.seg{display:flex;background:rgba(118,118,128,.08);border-radius:9px;padding:2px;margin-bottom:20px}
.seg button{flex:1;padding:8px;border-radius:7px;font-size:14px;font-weight:500;color:var(--text2);transition:all .2s}
.seg button.active{background:var(--surface);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.1)}

.list{background:var(--surface);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow)}
.list .item{display:flex;align-items:center;padding:14px 16px;border-bottom:.5px solid var(--border)}
.list .item:last-child{border-bottom:none}
.list .item .icon{width:40px;height:40px;border-radius:10px;background:var(--blue);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;margin-right:12px;flex-shrink:0}
.list .item .info{flex:1;min-width:0}
.list .item .info .name{font-weight:600;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.list .item .info .sub{font-size:13px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.list .item .chev{color:var(--text3);font-size:18px}

.badge{display:inline-block;padding:3px 10px;border-radius:10px;font-size:12px;font-weight:600}
.badge-blue{background:rgba(0,113,227,.1);color:var(--blue)}
.badge-green{background:rgba(52,199,89,.1);color:var(--green)}
.badge-orange{background:rgba(255,149,0,.1);color:var(--orange)}
.badge-red{background:rgba(255,59,48,.1);color:var(--red)}
.badge-gray{background:rgba(118,118,128,.1);color:var(--text2)}

.stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px}
.stat{background:var(--surface);border-radius:var(--radius-lg);padding:20px;box-shadow:var(--shadow)}
.stat .num{font-size:32px;font-weight:700;letter-spacing:-.02em}
.stat .label{font-size:14px;color:var(--text2);margin-top:2px}

.error{background:rgba(255,59,48,.08);color:var(--red);padding:12px 16px;border-radius:var(--radius);font-size:15px;margin-bottom:16px}
.success{background:rgba(52,199,89,.08);color:var(--green);padding:12px 16px;border-radius:var(--radius);font-size:15px;margin-bottom:16px}

.scanner{position:relative;width:100%;max-width:320px;margin:0 auto;aspect-ratio:1;border-radius:var(--radius);overflow:hidden;background:#000}
.scanner video{width:100%;height:100%;object-fit:cover}
.scanner::after{content:'';position:absolute;inset:20%;border:2px solid rgba(255,255,255,.5);border-radius:8px;pointer-events:none}

.wallet-pass{background:linear-gradient(135deg,#4B0E7A,#1a0533);border-radius:var(--radius-lg);padding:24px;color:#fff;box-shadow:var(--shadow-lg);position:relative;overflow:hidden;margin-bottom:12px}
.wallet-pass.light{background:linear-gradient(135deg,#0071e3,#0058b0)}
.wallet-pass.green{background:linear-gradient(135deg,#34c759,#248a3d)}
.wallet-pass .brand{font-size:14px;opacity:.8;font-weight:600}
.wallet-pass .balance{font-size:48px;font-weight:700;letter-spacing:-.03em;margin:8px 0}
.wallet-pass .label{font-size:13px;opacity:.7;text-transform:uppercase;letter-spacing:.05em}
.wallet-pass .id{font-family:monospace;font-size:13px;opacity:.6;margin-top:8px}
.wallet-pass .qr{margin-top:16px;text-align:center}
.wallet-pass .qr img{border-radius:8px}

.empty{text-align:center;padding:60px 20px;color:var(--text2)}
.empty svg{width:48px;height:48px;stroke:var(--text3);fill:none;stroke-width:1;margin-bottom:12px}
.empty h3{font-size:17px;font-weight:600;color:var(--text);margin-bottom:4px}
.empty p{font-size:15px}

.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.actions .btn{flex:1;min-width:100px}

.section-title{font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin:20px 20px 8px}
`;

const JS = `
function api(path,opts={}){
  var token=localStorage.getItem('token');
  var headers={'Content-Type':'application/json',...(opts.headers||{})};
  if(token)headers['Authorization']='Bearer '+token;
  return fetch(path,{...opts,headers:headers}).then(async function(r){
    var t=await r.text();
    var j;try{j=JSON.parse(t)}catch(e){j=t}
    if(!r.ok){var msg=(j&&j.message)||j||'Error';throw new Error(typeof msg==='string'?msg:JSON.stringify(msg))}
    return j;
  });
}
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function go(r){location.href='/app/'+r}
function logout(){localStorage.removeItem('token');localStorage.removeItem('user');go('auth')}
function getRole(){try{return JSON.parse(localStorage.getItem('user')).role}catch(e){return null}}
function getToken(){return localStorage.getItem('token')}

var IC={
  wallet:'<svg viewBox="0 0 24 24"><path d="M21 8V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3M3 10h18M16 14h3v-4h-3a2 2 0 0 0 0 4z"/></svg>',
  scan:'<svg viewBox="0 0 24 24"><path d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3M4 12h16"/></svg>',
  grid:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
  back:'<svg viewBox="0 0 24 24" style="stroke-width:2"><path d="M15 18l-6-6 6-6"/></svg>',
  empty:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M15 15h2"/></svg>'
};

function tabbar(active){
  var role=getRole();
  var tabs=[{r:'client',i:IC.wallet,l:'Wallet'},{r:'staff',i:IC.scan,l:'Scan'}];
  if(role==='ADMIN')tabs.push({r:'admin',i:IC.grid,l:'Admin'});
  tabs.push({r:'settings',i:IC.settings,l:'Settings'});
  var bar=el('div','tabbar');
  tabs.forEach(function(t){
    var b=el('button',(active===t.r?'active':''));
    b.innerHTML=t.i+'<span>'+t.l+'</span>';
    b.onclick=function(){if(t.r==='settings')showSettings();else go(t.r)};
    bar.appendChild(b);
  });
  return bar;
}

function showAuth(){
  document.title=window.__TITLE__;
  var app=document.getElementById('app');
  app.innerHTML='';
  app.appendChild(el('div','nav','<span class="title">Loyalty Wallet</span>'));
  var view=el('div','view');
  view.appendChild(el('div','hero','<h1>Welcome.</h1><p>Sign in to access your loyalty cards.</p>'));

  var seg=el('div','seg');
  var loginBtn=el('button','active','Sign In');
  var regBtn=el('button','','Sign Up');
  seg.appendChild(loginBtn);seg.appendChild(regBtn);
  view.appendChild(seg);

  var errBox=el('div','error hidden');
  view.appendChild(errBox);

  var form=el('div');
  form.innerHTML='<div class="field"><label>Email</label><input id="email" type="email" placeholder="you@example.com" autocomplete="email" /></div>'+
    '<div class="field"><label>Password</label><input id="password" type="password" placeholder="........" autocomplete="current-password" /></div>'+
    '<div class="field hidden" id="nameField"><label>Name</label><input id="name" type="text" placeholder="Your name" autocomplete="name" /></div>'+
    '<button class="btn" id="submitBtn">Sign In</button>';
  view.appendChild(form);

  var mode='login';
  loginBtn.onclick=function(){mode='login';loginBtn.className='active';regBtn.className='';document.getElementById('nameField').classList.add('hidden');document.getElementById('submitBtn').textContent='Sign In'};
  regBtn.onclick=function(){mode='register';regBtn.className='active';loginBtn.className='';document.getElementById('nameField').classList.remove('hidden');document.getElementById('submitBtn').textContent='Create Account'};

  document.getElementById('submitBtn').onclick=async function(){
    var email=document.getElementById('email').value.trim();
    var password=document.getElementById('password').value;
    if(!email||!password){errBox.textContent='Email and password required';errBox.classList.remove('hidden');return}
    errBox.classList.add('hidden');
    var btn=document.getElementById('submitBtn');btn.disabled=true;var old=btn.textContent;btn.textContent='...';
    try{
      var path=mode==='login'?'/auth/login':'/auth/register';
      var body=mode==='login'?{email:email,password:password}:{email:email,password:password,name:document.getElementById('name').value.trim()||undefined};
      var data=await api(path,{method:'POST',body:JSON.stringify(body)});
      localStorage.setItem('token',data.accessToken);
      localStorage.setItem('user',JSON.stringify(data.user));
      var role=data.user.role;
      if(role==='ADMIN')go('admin');else if(role==='STAFF')go('staff');else go('client');
    }catch(e){errBox.textContent=e.message;errBox.classList.remove('hidden');btn.disabled=false;btn.textContent=old}
  };
  app.appendChild(view);

  var token=getToken();
  if(token){
    api('/auth/me',{method:'POST'}).then(function(me){
      localStorage.setItem('user',JSON.stringify(me));
      if(me.role==='ADMIN')go('admin');else if(me.role==='STAFF')go('staff');else go('client');
    }).catch(function(){localStorage.removeItem('token');localStorage.removeItem('user')});
  }
}

function showClient(){
  var app=document.getElementById('app');app.innerHTML='';
  if(!getToken()){go('auth');return}
  app.appendChild(el('div','nav','<span class="title">My Wallet</span><button class="btn" onclick="logout()">Sign Out</button>'));
  var view=el('div','view');
  view.appendChild(el('div','hero','<h1>Your cards.</h1><p>All your loyalty memberships in one place.</p>'));
  var loading=el('div','center muted','<div class="spin"></div><p style="margin-top:8px">Loading...</p>');
  view.appendChild(loading);
  app.appendChild(view);app.appendChild(tabbar('client'));
  api('/memberships/mine').then(function(cards){
    loading.remove();
    if(!cards||cards.length===0){
      view.appendChild(el('div','empty',IC.empty+'<h3>No cards yet</h3><p>Join a loyalty program to get started.</p>'));
      return;
    }
    cards.forEach(function(c){
      var p=c.program||{};var co=c.company||{};
      var isStamps=p.type==='STAMPS';
      var req=(p.settings&&p.settings.stampsRequired)||5;
      var bal=isStamps?c.balance+'/'+req:c.balance;
      var cls=isStamps?'green':'light';
      var pass=el('div','wallet-pass '+cls);
      pass.innerHTML='<div class="label">'+(isStamps?'Stamps':'Points')+'</div>'+
        '<div class="balance">'+bal+'</div>'+
        '<div class="brand">'+(co.name||'')+' - '+(p.name||'')+'</div>'+
        '<div class="id">'+c.walletId+'</div>'+
        '<div class="qr"><img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=loyalty:'+c.walletId+'" alt="QR" width="180" height="180"/></div>'+
        '<div class="actions"><a class="btn btn-secondary btn-sm" href="/wallet/apple/'+c.id+'/download">Add to Apple Wallet</a></div>';
      view.appendChild(pass);
    });
  }).catch(function(e){
    loading.remove();
    view.appendChild(el('div','error',e.message));
  });
}

function showStaff(){
  var app=document.getElementById('app');app.innerHTML='';
  if(!getToken()){go('auth');return}
  app.appendChild(el('div','nav','<span class="title">Staff</span><button class="btn" onclick="logout()">Sign Out</button>'));
  var view=el('div','view');
  var card=el('div','card');
  card.innerHTML='<h2>Scan Card</h2><p>Scan a customer QR code or enter wallet ID.</p>'+
    '<div class="field" style="margin-top:16px"><label>Company slug</label><input id="company" placeholder="e.g. bigdwich" /></div>'+
    '<div class="field"><label>Wallet ID or QR</label><input id="manual" placeholder="LW-... or loyalty:LW-..." /></div>'+
    '<button class="btn" id="lookupBtn">Look Up</button>'+
    '<button class="btn btn-secondary" id="camBtn" style="margin-top:8px">Scan QR</button>'+
    '<div id="camArea" class="hidden" style="margin-top:12px"><div id="qrReader" style="width:100%"></div><button class="btn btn-secondary btn-sm" id="camStop" style="margin-top:8px">Stop</button></div>';
  view.appendChild(card);
  var result=el('div');view.appendChild(result);
  app.appendChild(view);app.appendChild(tabbar('staff'));

  document.getElementById('lookupBtn').onclick=function(){doLookup()};
  document.getElementById('manual').addEventListener('keydown',function(e){if(e.key==='Enter')doLookup()});

  var qrScanner=null;
  document.getElementById('camBtn').onclick=function(){
    document.getElementById('camArea').classList.remove('hidden');
    if(!window.Html5Qrcode){
      var s=document.createElement('script');
      s.src='https://unpkg.com/html5-qrcode@2.3.7/minified/html5-qrcode.minified.js';
      s.onload=function(){startCam()};
      document.head.appendChild(s);
    }else startCam();
  };
  function startCam(){
    try{
      qrScanner=new Html5Qrcode('qrReader');
      qrScanner.start({facingMode:'environment'},{fps:10,qrbox:250},function(txt){qrScanner.stop().catch(function(){});document.getElementById('manual').value=txt;doLookup()});
    }catch(e){alert('Camera error: '+e)}
  }
  document.getElementById('camStop').onclick=function(){if(qrScanner)qrScanner.stop().catch(function(){});document.getElementById('camArea').classList.add('hidden')};

  function doLookup(){
    var q=document.getElementById('manual').value.trim();
    var company=document.getElementById('company').value.trim();
    if(!q){alert('Enter wallet ID or scan QR');return}
    if(!company){alert('Enter company slug');return}
    result.innerHTML='<div class="center muted"><div class="spin"></div></div>';
    api('/staff/cards/lookup',{method:'POST',body:JSON.stringify({qr:q,companyId:company})}).then(function(data){
      var m=data.membership;
      var isStamps=m.program&&m.program.type==='STAMPS';
      var req=(m.program&&m.program.settings&&m.program.settings.stampsRequired)||5;
      var bal=isStamps?m.balance+'/'+req:m.balance;
      result.innerHTML='<div class="card">'+
        '<div class="muted">Wallet</div><div style="font-family:monospace;font-size:16px;margin-bottom:8px">'+m.walletId+'</div>'+
        '<div class="muted">'+(isStamps?'Stamps':'Points')+'</div>'+
        '<div style="font-size:36px;font-weight:700;color:var(--blue)">'+bal+'</div>'+
        '<div class="actions">'+
        '<button class="btn btn-sm" onclick="window._staffUpdate(\\''+m.id+'\\',1,\\''+(m.companyId||company)+'\\')">+1</button>'+
        '<button class="btn btn-sm" onclick="window._staffUpdate(\\''+m.id+'\\',5,\\''+(m.companyId||company)+'\\')">+5</button>'+
        '<button class="btn btn-danger btn-sm" onclick="window._staffUpdate(\\''+m.id+'\\',-1,\\''+(m.companyId||company)+'\\')">-1</button>'+
        '</div></div>';
    }).catch(function(e){result.innerHTML='<div class="error">'+e.message+'</div>'});
  }

  window._staffUpdate=function(mid,amt,comp){
    result.innerHTML='<div class="center muted"><div class="spin"></div></div>';
    api('/staff/loyalty/update',{method:'POST',body:JSON.stringify({membershipId:mid,amount:amt,companyId:comp,reason:'Staff'})}).then(function(data){
      result.innerHTML='<div class="success">Updated. New balance: '+data.newBalance+'</div><button class="btn btn-secondary btn-sm" onclick="document.getElementById(\\'manual\\').value=\\'\\';document.getElementById(\\'manual\\').focus()">New Scan</button>';
    }).catch(function(e){result.innerHTML='<div class="error">'+e.message+'</div>'});
  };
}

function showAdmin(){
  var app=document.getElementById('app');app.innerHTML='';
  if(!getToken()){go('auth');return}
  var role=getRole();
  if(role!=='ADMIN'){go('client');return}
  app.appendChild(el('div','nav','<span class="title">Admin</span><button class="btn" onclick="logout()">Sign Out</button>'));
  var view=el('div','view');
  view.appendChild(el('div','hero','<h1>Dashboard.</h1><p>Manage companies, programs, and users.</p>'));
  var loading=el('div','center muted','<div class="spin"></div>');view.appendChild(loading);
  app.appendChild(view);app.appendChild(tabbar('admin'));

  Promise.all([api('/admin/dashboard'),api('/companies'),api('/admin/users')]).then(function(results){
    var dash=results[0],companies=results[1],users=results[2];
    loading.remove();
    var sg=el('div','stat-grid');
    sg.innerHTML='<div class="stat"><div class="num">'+dash.companies+'</div><div class="label">Companies</div></div>'+
      '<div class="stat"><div class="num">'+dash.users+'</div><div class="label">Users</div></div>'+
      '<div class="stat"><div class="num">'+dash.memberships+'</div><div class="label">Memberships</div></div>'+
      '<div class="stat"><div class="num">'+dash.programs+'</div><div class="label">Programs</div></div>';
    view.appendChild(sg);

    view.appendChild(el('div','section-title','Companies'));
    var cl=el('div','list');
    if(companies.length===0){cl.innerHTML='<div class="item"><div class="info"><div class="name muted">No companies yet</div></div></div>'}
    companies.forEach(function(c){
      var item=el('div','item');
      item.innerHTML='<div class="icon">'+(c.name[0]||'?')+'</div><div class="info"><div class="name">'+c.name+'</div><div class="sub">'+c.slug+'</div></div><div class="chev">></div>';
      item.onclick=function(){showCompanyDetail(c)};
      cl.appendChild(item);
    });
    view.appendChild(cl);

    view.appendChild(el('div','section-title','Users'));
    var ul=el('div','list');
    users.forEach(function(u){
      var item=el('div','item');
      var roleBadge=u.role==='ADMIN'?'badge-red':u.role==='STAFF'?'badge-orange':'badge-blue';
      item.innerHTML='<div class="info"><div class="name">'+(u.name||u.email)+'</div><div class="sub">'+u.email+'</div></div><span class="badge '+roleBadge+'">'+u.role+'</span>';
      ul.appendChild(item);
    });
    view.appendChild(ul);

    var createBtn=el('button','btn','+ Create Company');
    createBtn.style.marginTop='12px';
    createBtn.onclick=function(){showCreateCompany()};
    view.appendChild(createBtn);
  }).catch(function(e){loading.remove();view.appendChild(el('div','error',e.message))});
}

function showCompanyDetail(c){
  var app=document.getElementById('app');app.innerHTML='';
  app.appendChild(el('div','nav','<button class="btn" onclick="go(\\'admin\\')">'+IC.back+'</button><span class="title">'+c.name+'</span>'));
  var view=el('div','view');
  var loading=el('div','center muted','<div class="spin"></div>');view.appendChild(loading);
  app.appendChild(view);
  Promise.all([
    api('/companies/'+c.id+'/stats'),
    api('/companies/'+c.id+'/memberships'),
    api('/companies/'+c.id+'/history'),
    api('/companies/'+c.id+'/staff')
  ]).then(function(results){
    var stats=results[0],memberships=results[1],history=results[2],staff=results[3];
    loading.remove();
    var sg=el('div','stat-grid');
    sg.innerHTML='<div class="stat"><div class="num">'+(stats._count||0)+'</div><div class="label">Members</div></div><div class="stat"><div class="num">'+(stats._sum&&stats._sum.balance||0)+'</div><div class="label">Total Points</div></div>';
    view.appendChild(sg);

    view.appendChild(el('div','section-title','Programs'));
    var createProg=el('button','btn btn-secondary btn-sm','+ Create Program');
    createProg.onclick=function(){showCreateProgram(c)};
    view.appendChild(createProg);

    view.appendChild(el('div','section-title','Memberships ('+memberships.length+')'));
    var ml=el('div','list');
    if(memberships.length===0)ml.innerHTML='<div class="item"><div class="info"><div class="name muted">No members yet</div></div></div>';
    memberships.forEach(function(m){
      var item=el('div','item');
      var uName=(m.user&&(m.user.name||m.user.email)||'?');
      item.innerHTML='<div class="icon">'+uName[0]+'</div><div class="info"><div class="name">'+uName+'</div><div class="sub">'+m.walletId+' - '+m.balance+' '+(m.program&&m.program.type==='STAMPS'?'stamps':'pts')+'</div></div><span class="badge badge-blue">'+(m.program&&m.program.name||'')+'</span>';
      ml.appendChild(item);
    });
    view.appendChild(ml);

    view.appendChild(el('div','section-title','Recent Activity'));
    var hl=el('div','list');
    if(history.length===0)hl.innerHTML='<div class="item"><div class="info"><div class="name muted">No activity yet</div></div></div>';
    history.slice(0,20).forEach(function(h){
      var item=el('div','item');
      var t=h.type==='EARN'?'badge-green':h.type==='REDEEM'?'badge-orange':'badge-gray';
      var amt=h.amount>=0?'+'+h.amount:h.amount;
      item.innerHTML='<div class="info"><div class="name">'+amt+' - '+(h.membership&&h.membership.walletId||'')+'</div><div class="sub">'+h.type+' - '+(h.reason||'')+'</div></div><span class="badge '+t+'">'+h.type+'</span>';
      hl.appendChild(item);
    });
    view.appendChild(hl);

    view.appendChild(el('div','section-title','Staff'));
    var assignBtn=el('button','btn btn-secondary btn-sm','+ Assign Staff');
    assignBtn.onclick=function(){showAssignStaff(c)};
    view.appendChild(assignBtn);
    var sl=el('div','list');sl.style.marginTop='8px';
    if(staff.length===0)sl.innerHTML='<div class="item"><div class="info"><div class="name muted">No staff assigned</div></div></div>';
    staff.forEach(function(s){
      var item=el('div','item');
      var st=s.status==='ACTIVE'?'badge-green':s.status==='SUSPENDED'?'badge-red':'badge-orange';
      item.innerHTML='<div class="info"><div class="name">'+(s.user&&s.user.email||'')+'</div><div class="sub">'+s.status+'</div></div><span class="badge '+st+'">'+s.status+'</span>';
      sl.appendChild(item);
    });
    view.appendChild(sl);
  }).catch(function(e){loading.remove();view.appendChild(el('div','error',e.message))});
}

function showCreateCompany(){
  var app=document.getElementById('app');app.innerHTML='';
  app.appendChild(el('div','nav','<button class="btn" onclick="go(\\'admin\\')">'+IC.back+'</button><span class="title">New Company</span>'));
  var view=el('div','view');
  var card=el('div','card');
  card.innerHTML='<div class="field"><label>Name</label><input id="cName" placeholder="Acme Corp" /></div>'+
    '<div class="field"><label>Slug</label><input id="cSlug" placeholder="acme" /></div>'+
    '<div class="field"><label>Primary Color</label><input id="cColor" placeholder="#0071e3" /></div>'+
    '<div class="field"><label>Website</label><input id="cWeb" placeholder="https://..." /></div>'+
    '<div id="err" class="error hidden"></div>'+
    '<button class="btn" id="save">Create</button>';
  view.appendChild(card);app.appendChild(view);
  document.getElementById('save').onclick=async function(){
    var name=document.getElementById('cName').value.trim();
    var slug=document.getElementById('cSlug').value.trim();
    if(!name||!slug){var e=document.getElementById('err');e.textContent='Name and slug required';e.classList.remove('hidden');return}
    try{
      await api('/companies',{method:'POST',body:JSON.stringify({name:name,slug:slug,primaryColor:document.getElementById('cColor').value.trim()||undefined,website:document.getElementById('cWeb').value.trim()||undefined})});
      go('admin');
    }catch(e){var err=document.getElementById('err');err.textContent=e.message;err.classList.remove('hidden')}
  };
}

function showCreateProgram(c){
  var app=document.getElementById('app');app.innerHTML='';
  app.appendChild(el('div','nav','<button class="btn" onclick="window._backToComp(\\''+c.id+'\\')">'+IC.back+'</button><span class="title">New Program</span>'));
  var view=el('div','view');
  var card=el('div','card');
  card.innerHTML='<div class="field"><label>Name</label><input id="pName" placeholder="Coffee Club" /></div>'+
    '<div class="field"><label>Slug</label><input id="pSlug" placeholder="coffee" /></div>'+
    '<div class="field"><label>Type</label><select id="pType"><option value="POINTS">Points</option><option value="STAMPS">Stamps</option></select></div>'+
    '<div class="field"><label>Description</label><input id="pDesc" placeholder="Earn rewards" /></div>'+
    '<div id="err" class="error hidden"></div>'+
    '<button class="btn" id="save">Create Program</button>';
  view.appendChild(card);app.appendChild(view);
  document.getElementById('save').onclick=async function(){
    var name=document.getElementById('pName').value.trim();
    var slug=document.getElementById('pSlug').value.trim();
    var type=document.getElementById('pType').value;
    if(!name||!slug){var e=document.getElementById('err');e.textContent='Name and slug required';e.classList.remove('hidden');return}
    try{
      await api('/admin/programs/create',{method:'POST',body:JSON.stringify({companyId:c.id,name:name,slug:slug,type:type,description:document.getElementById('pDesc').value.trim()||undefined})});
      go('admin');
    }catch(e){var err=document.getElementById('err');err.textContent=e.message;err.classList.remove('hidden')}
  };
}

window._backToComp=async function(id){
  var c=await api('/companies/'+id).catch(function(){return null});
  if(c)showCompanyDetail(c);else go('admin');
};

function showAssignStaff(c){
  var app=document.getElementById('app');app.innerHTML='';
  app.appendChild(el('div','nav','<button class="btn" onclick="window._backToComp(\\''+c.id+'\\')">'+IC.back+'</button><span class="title">Assign Staff</span>'));
  var view=el('div','view');
  var card=el('div','card');
  card.innerHTML='<div class="field"><label>User email</label><input id="sEmail" placeholder="staff@example.com" /></div>'+
    '<div id="err" class="error hidden"></div>'+
    '<button class="btn" id="assign">Assign</button>';
  view.appendChild(card);app.appendChild(view);
  document.getElementById('assign').onclick=async function(){
    var email=document.getElementById('sEmail').value.trim();
    if(!email){var e=document.getElementById('err');e.textContent='Email required';e.classList.remove('hidden');return}
    try{
      var users=await api('/admin/users');
      var u=users.find(function(x){return x.email===email.toLowerCase()});
      if(!u){var e=document.getElementById('err');e.textContent='User not found';e.classList.remove('hidden');return}
      await api('/admin/staff/assign',{method:'POST',body:JSON.stringify({userId:u.id,companyId:c.id})});
      go('admin');
    }catch(e){var err=document.getElementById('err');err.textContent=e.message;err.classList.remove('hidden')}
  };
}

function showSettings(){
  var app=document.getElementById('app');app.innerHTML='';
  app.appendChild(el('div','nav','<span class="title">Settings</span>'));
  var view=el('div','view');
  var u=JSON.parse(localStorage.getItem('user')||'{}');
  var card=el('div','card');
  card.innerHTML='<h2>'+(u.name||u.email||'Account')+'</h2><p>Role: <span class="badge badge-blue">'+(u.role||'CLIENT')+'</span></p><p style="margin-top:8px">'+(u.email||'')+'</p>';
  view.appendChild(card);
  var btn=el('button','btn btn-danger','Sign Out');
  btn.onclick=logout;
  view.appendChild(btn);
  app.appendChild(view);app.appendChild(tabbar('settings'));
}

var route=window.__ROUTE__;
if(route==='auth'||!getToken())showAuth();
else if(route==='client')showClient();
else if(route==='staff')showStaff();
else if(route==='admin')showAdmin();
else showAuth();
`;
