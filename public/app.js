function api(path,opts){
  opts=opts||{};
  var token=localStorage.getItem('token');
  var h={'Content-Type':'application/json'};
  if(token)h['Authorization']='Bearer '+token;
  return fetch(path,{method:opts.method||'GET',headers:h,body:opts.body}).then(function(r){
    return r.text().then(function(t){
      var j;try{j=JSON.parse(t)}catch(e){j=t}
      if(!r.ok){var m=(j&&j.message)||(typeof j==='string'?j:'Erreur');if(Array.isArray(m))m=m.join(', ');throw new Error(m)}
      return j;
    });
  });
}
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
function go(r){location.href='/app/'+r}
function logout(){localStorage.removeItem('token');localStorage.removeItem('user');go('auth')}
function getUser(){try{return JSON.parse(localStorage.getItem('user')||'{}')}catch(e){return{}}}
function getRole(){return getUser().role||'CLIENT'}
function getToken(){return localStorage.getItem('token')}
var IC={
  wallet:'<svg viewBox="0 0 24 24"><path d="M21 8V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3M3 10h18M16 14h3v-4h-3a2 2 0 0 0 0 4z"/></svg>',
  scan:'<svg viewBox="0 0 24 24"><path d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3M4 12h16"/></svg>',
  grid:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>'
};
function tabbar(active){
  var role=getRole();
  var tabs=[];
  if(role==='CLIENT'){tabs=[{r:'client',i:IC.wallet,l:'Carte'},{r:'settings',i:IC.user,l:'Compte'}];}
  else if(role==='STAFF'){tabs=[{r:'staff',i:IC.scan,l:'Caisse'},{r:'settings',i:IC.user,l:'Compte'}];}
  else if(role==='ADMIN'){tabs=[{r:'admin',i:IC.grid,l:'Admin'},{r:'staff',i:IC.scan,l:'Caisse'},{r:'settings',i:IC.user,l:'Compte'}];}
  else{tabs=[{r:'client',i:IC.wallet,l:'Carte'},{r:'settings',i:IC.user,l:'Compte'}];}
  var bar=el('div','tabbar');
  tabs.forEach(function(t){
    var b=el('button',active===t.r?'on':'');
    b.innerHTML=t.i+'<span>'+t.l+'</span>';
    b.onclick=function(){if(t.r==='settings')showSettings();else go(t.r)};
    bar.appendChild(b);
  });
  return bar;
}
function showAuth(){
  var app=document.getElementById('app');app.innerHTML='';
  app.appendChild(el('div','nav','<span class="t">Fidélité</span>'));
  var v=el('div','view');
  v.appendChild(el('div','hero','<h1>Bienvenue.</h1><p>Connecte-toi pour ta carte ou la caisse.</p>'));
  var seg=el('div','seg');
  var bLogin=el('button','on','Connexion');
  var bReg=el('button','','Inscription');
  seg.appendChild(bLogin);seg.appendChild(bReg);v.appendChild(seg);
  var err=el('div','err hidden');v.appendChild(err);
  var form=el('div');
  form.innerHTML='<div class="field"><label>Email</label><input id="email" type="email" autocomplete="email" placeholder="toi@email.com"/></div><div class="field"><label>Mot de passe</label><input id="password" type="password" autocomplete="current-password" placeholder="••••••••"/></div><div class="field hidden" id="nameField"><label>Nom</label><input id="name" type="text" autocomplete="name" placeholder="Ton nom"/></div><button class="btn" id="go">Se connecter</button>';
  v.appendChild(form);app.appendChild(v);
  var mode='login';
  bLogin.onclick=function(){mode='login';bLogin.className='on';bReg.className='';document.getElementById('nameField').classList.add('hidden');document.getElementById('go').textContent='Se connecter'};
  bReg.onclick=function(){mode='register';bReg.className='on';bLogin.className='';document.getElementById('nameField').classList.remove('hidden');document.getElementById('go').textContent='Créer mon compte'};
  document.getElementById('go').onclick=async function(){
    var email=document.getElementById('email').value.trim();
    var password=document.getElementById('password').value;
    if(!email||!password){err.textContent='Email et mot de passe requis';err.classList.remove('hidden');return}
    err.classList.add('hidden');
    var btn=document.getElementById('go');btn.disabled=true;var old=btn.textContent;btn.textContent='…';
    try{
      var path=mode==='login'?'/auth/login':'/auth/register';
      var body=mode==='login'?{email:email,password:password}:{email:email,password:password,name:(document.getElementById('name').value||'').trim()||undefined,locale:'fr'};
      var data=await api(path,{method:'POST',body:JSON.stringify(body)});
      localStorage.setItem('token',data.accessToken);
      localStorage.setItem('user',JSON.stringify(data.user));
      var role=data.user.role;
      if(role==='ADMIN')go('admin');else if(role==='STAFF')go('staff');else go('client');
    }catch(e){err.textContent=e.message;err.classList.remove('hidden');btn.disabled=false;btn.textContent=old}
  };
  if(getToken()){
    api('/auth/me',{method:'POST'}).then(function(me){
      localStorage.setItem('user',JSON.stringify(me));
      if(me.role==='ADMIN')go('admin');else if(me.role==='STAFF')go('staff');else go('client');
    }).catch(function(){localStorage.removeItem('token');localStorage.removeItem('user')});
  }
}
function showClient(){
  var app=document.getElementById('app');app.innerHTML='';
  if(!getToken()){go('auth');return}
  if(getRole()==='STAFF'){go('staff');return}
  app.appendChild(el('div','nav','<span class="t">Ma carte</span><button class="a" onclick="logout()">Quitter</button>'));
  var v=el('div','view');
  v.appendChild(el('div','hero','<h1>Tes cartes.</h1><p>Points, QR et installation Wallet.</p>'));
  var loading=el('div','center muted','<div class="spin"></div>');
  v.appendChild(loading);app.appendChild(v);app.appendChild(tabbar('client'));
  api('/memberships/mine').then(function(cards){
    loading.remove();
    if(!cards||!cards.length){
      v.appendChild(el('div','empty','<h3>Aucune carte</h3><p>Scanne le QR du restaurant pour rejoindre un programme.</p>'));
      return;
    }
    cards.forEach(function(c){
      var p=c.program||{},co=c.company||{};
      var isStamps=p.type==='STAMPS';
      var req=(p.settings&&p.settings.stampsRequired)||5;
      var bal=isStamps?(c.balance+'/'+req):String(c.balance);
      var pass=el('div','pass'+(isStamps?'':' pts'));
      pass.innerHTML='<div class="lab">'+(isStamps?'Tampons':'Points')+'</div><div class="bal">'+bal+'</div><div class="brand">'+(co.name||'')+' · '+(p.name||'')+'</div><div class="wid">'+c.walletId+'</div><div class="qrbox"><img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data='+encodeURIComponent('loyalty:'+c.walletId)+'" width="160" height="160" alt="QR"/></div><div class="acts"><button type="button" data-gid="'+c.id+'" class="gbtn">Google Wallet</button><a href="/wallet/apple/'+c.id+'/download">Apple Wallet</a></div><div class="hint">iPhone : le .pkpass ne s\'installe que s\'il est signé (certificats Apple Developer). Sinon présente ce QR à la caisse.</div>';
      v.appendChild(pass);
    });
    v.querySelectorAll('.gbtn').forEach(function(btn){
      btn.onclick=async function(){
        btn.textContent='…';
        try{
          var r=await api('/memberships/'+btn.getAttribute('data-gid')+'/google-save-url',{method:'POST'});
          if(r&&r.saveUrl){window.open(r.saveUrl,'_blank')}
          else{alert('Google Wallet non configuré (credentials manquants sur le serveur).')}
        }catch(e){alert(e.message)}
        btn.textContent='Google Wallet';
      };
    });
  }).catch(function(e){loading.remove();v.appendChild(el('div','err',e.message))});
}
function showStaff(){
  var app=document.getElementById('app');app.innerHTML='';
  if(!getToken()){go('auth');return}
  var role=getRole();
  if(role!=='STAFF'&&role!=='ADMIN'){go('client');return}
  app.appendChild(el('div','nav','<span class="t">Caisse</span><button class="a" onclick="logout()">Quitter</button>'));
  var v=el('div','view');
  var companyLabel=el('div','muted','Chargement restaurant…');
  v.appendChild(companyLabel);
  var card=el('div','card');
  card.innerHTML='<h2>Scanner une carte</h2><p class="sub">QR loyalty:… du client (pas le QR mural).</p><div id="reader"></div><div class="row"><button class="btn" id="camStart">Caméra</button><button class="btn btn-ghost" id="camStop">Stop</button><button class="btn btn-ghost" id="fileBtn">Photo</button></div><input id="file" type="file" accept="image/*" capture="environment" class="hidden"/><div class="field" style="margin-top:14px"><label>Ou coller le code</label><input id="manual" placeholder="loyalty:LW-…"/></div><button class="btn" id="lookupBtn">Ouvrir</button>';
  v.appendChild(card);
  var result=el('div');v.appendChild(result);
  var statsBox=el('div');v.appendChild(statsBox);
  app.appendChild(v);app.appendChild(tabbar('staff'));
  var scanner=null;
  api('/staff/session').then(function(s){
    var company=s.company;
    companyLabel.textContent=company?(company.name+' · '+company.slug):'Restaurant non assigné';
  }).catch(function(e){
    companyLabel.innerHTML='<div class="err">'+e.message+'</div>';
  });
  api('/staff/stats').then(function(st){
    statsBox.innerHTML='<div class="statg"><div class="stat"><div class="n">'+(st.members||0)+'</div><div class="l">Clients</div></div><div class="stat"><div class="n">'+(st.totalBalance||0)+'</div><div class="l">Points totaux</div></div></div>';
  }).catch(function(){});
  function stopCam(){if(scanner){try{scanner.stop()}catch(e){}scanner=null;}}
  document.getElementById('camStart').onclick=async function(){
    result.innerHTML='<div class="center muted"><div class="spin"></div><p>Caméra…</p></div>';
    stopCam();
    if(typeof Html5Qrcode==='undefined'){result.innerHTML='<div class="err">Librairie scan non chargée. Recharge la page (HTTPS ou localhost requis pour la caméra).</div>';return}
    try{
      scanner=new Html5Qrcode('reader');
      await scanner.start({facingMode:'environment'},{fps:10,qrbox:{width:220,height:220}},function(txt){
        stopCam();
        document.getElementById('manual').value=txt;
        doLookup(txt);
      });
      result.innerHTML='<div class="muted center">Pointe le QR de la carte client</div>';
    }catch(e){
      result.innerHTML='<div class="err">Caméra refusée ou indisponible. Autorise la caméra dans les réglages, ou utilise Photo / collage du code.</div>';
    }
  };
  document.getElementById('camStop').onclick=function(){stopCam();result.innerHTML=''};
  document.getElementById('fileBtn').onclick=function(){document.getElementById('file').click()};
  document.getElementById('file').onchange=async function(e){
    var f=e.target.files&&e.target.files[0];e.target.value='';
    if(!f)return;
    if(typeof Html5Qrcode==='undefined'){result.innerHTML='<div class="err">Scan non disponible</div>';return}
    try{
      if(!scanner)scanner=new Html5Qrcode('reader');
      var txt=await scanner.scanFile(f,true);
      document.getElementById('manual').value=txt;
      doLookup(txt);
    }catch(err){result.innerHTML='<div class="err">Aucun QR détecté sur la photo</div>';}
  };
  document.getElementById('lookupBtn').onclick=function(){var q=document.getElementById('manual').value.trim();if(q)doLookup(q)};
  document.getElementById('manual').addEventListener('keydown',function(e){if(e.key==='Enter'){var q=document.getElementById('manual').value.trim();if(q)doLookup(q)}});
  function doLookup(q){
    result.innerHTML='<div class="center muted"><div class="spin"></div></div>';
    api('/staff/cards/lookup',{method:'POST',body:JSON.stringify({qr:q})}).then(function(data){
      var m=data.membership||data;
      var isStamps=m.program&&m.program.type==='STAMPS';
      var req=(m.program&&m.program.settings&&m.program.settings.stampsRequired)||5;
      var bal=isStamps?(m.balance+'/'+req):m.balance;
      result.innerHTML='';
      var box=el('div','card');
      box.innerHTML='<div class="muted">'+m.walletId+'</div><div style="font-size:36px;font-weight:700;margin:6px 0">'+bal+'</div><div class="row"><button class="btn btn-sm" id="p1">+1</button><button class="btn btn-sm" id="p5">+5</button><button class="btn btn-sm btn-red" id="m1">−1</button></div>';
      result.appendChild(box);
      document.getElementById('p1').onclick=function(){doUpdate(m.id,1)};
      document.getElementById('p5').onclick=function(){doUpdate(m.id,5)};
      document.getElementById('m1').onclick=function(){doUpdate(m.id,-1)};
    }).catch(function(e){result.innerHTML='<div class="err">'+e.message+'</div>';});
  }
  function doUpdate(mid,amount){
    result.innerHTML='<div class="center muted"><div class="spin"></div></div>';
    api('/staff/loyalty/update',{method:'POST',body:JSON.stringify({membershipId:mid,amount:amount,reason:'Caisse'})}).then(function(data){
      result.innerHTML='<div class="ok">OK · nouveau solde : <b>'+data.newBalance+'</b></div><button class="btn btn-ghost btn-sm" id="again">Nouveau scan</button>';
      document.getElementById('again').onclick=function(){document.getElementById('manual').value='';document.getElementById('manual').focus();result.innerHTML=''};
    }).catch(function(e){result.innerHTML='<div class="err">'+e.message+'</div>';});
  }
}
function showAdmin(){
  var app=document.getElementById('app');app.innerHTML='';
  if(!getToken()){go('auth');return}
  if(getRole()!=='ADMIN'){go('client');return}
  app.appendChild(el('div','nav','<span class="t">Admin</span><button class="a" onclick="logout()">Quitter</button>'));
  var v=el('div','view');
  v.appendChild(el('div','hero','<h1>Dashboard.</h1><p>Entreprises, programmes, staff.</p>'));
  var loading=el('div','center muted','<div class="spin"></div>');v.appendChild(loading);
  app.appendChild(v);app.appendChild(tabbar('admin'));
  Promise.all([api('/admin/dashboard'),api('/companies'),api('/admin/users')]).then(function(res){
    var dash=res[0],companies=res[1];
    loading.remove();
    v.insertAdjacentHTML('beforeend','<div class="statg"><div class="stat"><div class="n">'+dash.companies+'</div><div class="l">Entreprises</div></div><div class="stat"><div class="n">'+dash.users+'</div><div class="l">Users</div></div><div class="stat"><div class="n">'+dash.memberships+'</div><div class="l">Cartes</div></div><div class="stat"><div class="n">'+dash.programs+'</div><div class="l">Programmes</div></div></div>');
    var list=el('div','card list');list.innerHTML='<h2>Entreprises</h2>';
    (companies||[]).forEach(function(c){
      var item=el('div','item');
      item.innerHTML='<div style="flex:1"><div style="font-weight:600">'+c.name+'</div><div class="muted">'+c.slug+' · /join/'+c.slug+'/…</div></div>';
      item.onclick=function(){showCompany(c)};
      list.appendChild(item);
    });
    v.appendChild(list);
    var btn=el('button','btn','+ Créer entreprise');btn.style.marginTop='12px';btn.onclick=function(){showCreateCompany()};v.appendChild(btn);
  }).catch(function(e){loading.remove();v.appendChild(el('div','err',e.message))});
}
function showCompany(c){
  var app=document.getElementById('app');app.innerHTML='';
  app.appendChild(el('div','nav','<button class="a" id="backAd">←</button><span class="t">'+c.name+'</span>'));
  document.getElementById('backAd').onclick=function(){go('admin')};
  var v=el('div','view');
  var loading=el('div','center muted','<div class="spin"></div>');v.appendChild(loading);
  app.appendChild(v);
  Promise.all([api('/companies/'+c.id+'/stats'),api('/companies/'+c.id+'/memberships'),api('/companies/'+c.id+'/staff')]).then(function(res){
    var stats=res[0],mems=res[1],staff=res[2];
    loading.remove();
    v.innerHTML='<div class="statg"><div class="stat"><div class="n">'+(stats._count||0)+'</div><div class="l">Membres</div></div><div class="stat"><div class="n">'+(stats._sum&&stats._sum.balance||0)+'</div><div class="l">Points</div></div></div>';
    v.insertAdjacentHTML('beforeend','<div class="card"><h2>Lien fidélité</h2><p class="sub">QR mural à imprimer</p><div class="muted">/join/'+c.slug+'/points</div><div class="muted">/join/'+c.slug+'/stamps</div></div>');
    var ml=el('div','card list');ml.innerHTML='<h2>Membres ('+(mems||[]).length+')</h2>';
    (mems||[]).slice(0,30).forEach(function(m){var u=m.user||{};ml.insertAdjacentHTML('beforeend','<div class="item"><div style="flex:1"><div style="font-weight:600">'+(u.name||u.email||'?')+'</div><div class="muted">'+m.walletId+' · '+m.balance+'</div></div></div>')});
    v.appendChild(ml);
    var sl=el('div','card list');sl.innerHTML='<h2>Staff</h2>';
    (staff||[]).forEach(function(s){sl.insertAdjacentHTML('beforeend','<div class="item"><div style="flex:1">'+(s.user&&s.user.email||'')+'</div><span class="badge badge-g">'+s.status+'</span></div>')});
    var ab=el('button','btn btn-ghost btn-sm','+ Assigner staff');ab.onclick=function(){showAssign(c)};sl.appendChild(ab);v.appendChild(sl);
    var pb=el('button','btn','+ Programme');pb.onclick=function(){showCreateProgram(c)};v.appendChild(pb);
  }).catch(function(e){loading.remove();v.appendChild(el('div','err',e.message))});
}
function showCreateCompany(){
  var app=document.getElementById('app');app.innerHTML='';
  app.appendChild(el('div','nav','<button class="a" id="backAd2">←</button><span class="t">Nouvelle entreprise</span>'));
  document.getElementById('backAd2').onclick=function(){go('admin')};
  var v=el('div','view');
  var card=el('div','card');
  card.innerHTML='<div class="field"><label>Nom</label><input id="cName" placeholder="BigDwich"/></div><div class="field"><label>Slug</label><input id="cSlug" placeholder="bigdwich"/></div><div class="field"><label>Couleur</label><input id="cColor" placeholder="#4B0E7A"/></div><div id="err" class="err hidden"></div><button class="btn" id="save">Créer</button>';
  v.appendChild(card);app.appendChild(v);
  document.getElementById('save').onclick=async function(){
    var name=document.getElementById('cName').value.trim();var slug=document.getElementById('cSlug').value.trim();
    if(!name||!slug){document.getElementById('err').textContent='Nom et slug requis';document.getElementById('err').classList.remove('hidden');return}
    try{await api('/companies',{method:'POST',body:JSON.stringify({name:name,slug:slug,primaryColor:document.getElementById('cColor').value.trim()||undefined})});go('admin')}
    catch(e){document.getElementById('err').textContent=e.message;document.getElementById('err').classList.remove('hidden')}
  };
}
function showCreateProgram(c){
  var app=document.getElementById('app');app.innerHTML='';
  app.appendChild(el('div','nav','<button class="a" id="backAd3">←</button><span class="t">Programme</span>'));
  document.getElementById('backAd3').onclick=function(){go('admin')};
  var v=el('div','view');
  var card=el('div','card');
  card.innerHTML='<div class="field"><label>Nom</label><input id="pName" placeholder="Tampons"/></div><div class="field"><label>Slug</label><input id="pSlug" placeholder="stamps"/></div><div class="field"><label>Type</label><select id="pType" style="width:100%;padding:14px;border-radius:12px;background:var(--raised);border:1px solid var(--line);color:var(--text)"><option value="STAMPS">Tampons</option><option value="POINTS">Points</option></select></div><div id="err" class="err hidden"></div><button class="btn" id="save">Créer</button>';
  v.appendChild(card);app.appendChild(v);
  document.getElementById('save').onclick=async function(){
    try{await api('/admin/programs/create',{method:'POST',body:JSON.stringify({companyId:c.id,name:document.getElementById('pName').value.trim(),slug:document.getElementById('pSlug').value.trim(),type:document.getElementById('pType').value,settings:document.getElementById('pType').value==='STAMPS'?{stampsRequired:5}:{}})});go('admin')}
    catch(e){document.getElementById('err').textContent=e.message;document.getElementById('err').classList.remove('hidden')}
  };
}
function showAssign(c){
  var app=document.getElementById('app');app.innerHTML='';
  app.appendChild(el('div','nav','<button class="a" id="backAd4">←</button><span class="t">Assigner staff</span>'));
  document.getElementById('backAd4').onclick=function(){go('admin')};
  var v=el('div','view');
  var card=el('div','card');
  card.innerHTML='<div class="field"><label>Email du compte</label><input id="sEmail" placeholder="staff@resto.com"/></div><div class="hint">Le compte doit déjà exister (inscription). L\'admin le promeut STAFF et l\'assigne.</div><div id="err" class="err hidden"></div><button class="btn" id="go">Assigner</button>';
  v.appendChild(card);app.appendChild(v);
  document.getElementById('go').onclick=async function(){
    var email=document.getElementById('sEmail').value.trim().toLowerCase();if(!email)return;
    try{
      var users=await api('/admin/users');
      var u=(users||[]).find(function(x){return x.email===email});
      if(!u){document.getElementById('err').textContent='Utilisateur introuvable — qu\'il s\'inscrive d\'abord';document.getElementById('err').classList.remove('hidden');return}
      await api('/admin/staff/assign',{method:'POST',body:JSON.stringify({userId:u.id,companyId:c.id})});
      go('admin');
    }catch(e){document.getElementById('err').textContent=e.message;document.getElementById('err').classList.remove('hidden')}
  };
}
function showSettings(){
  var app=document.getElementById('app');app.innerHTML='';
  if(!getToken()){go('auth');return}
  app.appendChild(el('div','nav','<span class="t">Compte</span>'));
  var v=el('div','view');
  var u=getUser();
  var card=el('div','card');
  card.innerHTML='<h2>'+(u.name||u.email||'Compte')+'</h2><p class="sub">'+u.email+'</p><span class="badge badge-b">'+(u.role||'CLIENT')+'</span>';
  v.appendChild(card);
  var btn=el('button','btn btn-red','Se déconnecter');btn.style.marginTop='12px';btn.onclick=logout;v.appendChild(btn);
  app.appendChild(v);app.appendChild(tabbar('settings'));
}
var route=window.__ROUTE__;
if(route==='auth'||!getToken())showAuth();
else if(route==='client')showClient();
else if(route==='staff')showStaff();
else if(route==='admin')showAdmin();
else showAuth();
