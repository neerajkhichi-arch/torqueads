const ADV_RAIL = [
  {key:'campaigns', icon:'campaign', label:'Campaigns', items:[['campaigns','Overview'],['create','New campaign'],['creatives','Ads & creatives'],{group:'Insights and reports', items:[['reports','Campaign reports'],['inventory','Inventory & forecast']]}]},
  {key:'audiences', icon:'groups', label:'Audiences', items:[['audiences','Audience builder'],['packages','Audience packages']]},
  {key:'goals', icon:'emoji_events', label:'Goals', items:[['tracking','Conversions & tracking']]},
  {key:'billing', icon:'credit_card', label:'Billing', items:[['billing','Summary']]},
];
const ADM_RAIL = [
  {key:'overview', icon:'monitoring', label:'Overview', items:[['overview','Network overview'],['delivery','Delivery & pacing'],['advertisers','Advertisers']]},
  {key:'supply', icon:'dashboard', label:'Supply', items:[['inv-admin','Inventory'],['pricing','Rate card & pricing']]},
  {key:'engine', icon:'bolt', label:'Engine', items:[['adserver','Ad server simulator'],['audience-engine','Audience engine'],['arch','Architecture']]},
  {key:'gov', icon:'shield', label:'Governance', items:[['privacy','Privacy & audit log']]},
];
const VIEW_TITLE = {campaigns:'Campaigns',create:'New campaign',audiences:'Audience builder',packages:'Audience packages',inventory:'Inventory & forecast',creatives:'Ads & creatives',reports:'Campaign reports',tracking:'Conversions & tracking',billing:'Billing summary',
  overview:'Network overview',delivery:'Delivery & pacing',advertisers:'Advertisers','inv-admin':'Inventory management',pricing:'Rate card & pricing',adserver:'Ad server simulator','audience-engine':'Audience engine',arch:'Architecture',privacy:'Privacy & audit log'};
const VIEWS = {};
const ADV_IDS = {v1:'431-220-1041',v2:'431-220-2087',v3:'431-220-3310',v4:'431-220-4126',v5:'431-220-5598',v6:'431-220-6702',v7:'431-220-7815'};
Object.assign(S, { navCollapsed:false, navOpen:{'Insights and reports':true}, pop:null, bannerOff:{}, sel:[], campQ:'' });

const getPath = (o,p) => p.split('.').reduce((a,k)=>a?.[k], o);
function setPath(o,p,v){ const ks=p.split('.'); const last=ks.pop(); const t=ks.reduce((a,k)=>a[k],o); t[last]=v; }
const clone = o => JSON.parse(JSON.stringify(o));
const myCampaigns = () => S.console==='adm' ? CAMPAIGNS : CAMPAIGNS.filter(c=>c.adv===S.advId);
const railFor = () => S.console==='adv' ? ADV_RAIL : S.console==='pub' ? PUB_RAIL : ADM_RAIL;
const CONSOLES = {adv:['Advertiser console','storefront','campaigns'], pub:['Publisher console','newspaper','pub-home'], adm:['Admin console','admin_panel_settings','overview']};
const flatItems = sec => sec.items.flatMap(i=>Array.isArray(i)?[i]:i.items);
const sectionOf = v => railFor().find(s=>flatItems(s).some(i=>i[0]===v)) || railFor()[0];
const msi = (n, cls='') => `<span class="msi ${cls}" aria-hidden="true">${n}</span>`;

function bannerHTML(){
  const key = S.console+':'+S.advId; if (S.bannerOff[key]) return '';
  if (S.console==='pub') return typeof pubBannerHTML==='function' ? pubBannerHTML() : '';
  if (S.console==='adm') return `<div class="banner" role="status">${msi('warning')}<p><b>Advertiser verification pending</b> — Crestline Tyres can't launch campaigns until GST and brand-safety review are complete.</p><button class="linkbtn" data-act="dismiss">Dismiss</button><button class="linkbtn" data-act="go" data-v="privacy">Learn more ${msi('open_in_new','s18')}</button><button class="btn fix" data-act="go" data-v="advertisers">Fix it</button></div>`;
  const hasLeadCamp = myCampaigns().some(c=>/Lead|Test/.test(c.objective));
  if (!hasLeadCamp) return `<div class="banner" role="status">${msi('warning')}<p><b>Set up conversion tracking</b> — add the Torque pixel to measure landing-page visits and leads from your campaigns.</p><button class="linkbtn" data-act="dismiss">Dismiss</button><button class="btn fix" data-act="go" data-v="tracking">Fix it</button></div>`;
  return `<div class="banner" role="status">${msi('warning')}<p><b>Complete financial services verification</b> — campaigns promoting loans or insurance need verification before they can run on EMI / finance pages.</p><button class="linkbtn" data-act="dismiss">Dismiss</button><button class="linkbtn" data-act="go" data-v="tracking">Learn more ${msi('open_in_new','s18')}</button><button class="btn fix" data-act="go" data-v="billing">Fix it</button></div>`;
}

function scopeHTML(){
  const v=S.view;
  if (S.console==='adv' && v==='campaigns') return `<div class="scope"><label class="scard cur"><span class="l">View (${S.campFilter==='all'?'no':'1'} filter${S.campFilter==='all'?'s':''})</span><span class="v">${msi('home_work')}${{all:'All campaigns',live:'Delivering campaigns',sched:'Scheduled campaigns',ended:'Completed campaigns'}[S.campFilter]}</span>${msi('arrow_drop_down','dd')}
      <select aria-label="View" data-bind="campFilter" data-rr="1">${[['all','All campaigns'],['live','Delivering'],['sched','Scheduled'],['ended','Completed']].map(([k,l])=>`<option value="${k}" ${S.campFilter===k?'selected':''}>${l}</option>`).join('')}</select></label></div>`;
  if (S.console==='adv' && (v==='reports'||v==='creatives')){
    const list=myCampaigns(); if (!list.length) return '';
    const path = v==='reports' ? 'rep.cid' : 'crPreview'; let cid=getPath(S,path); let c=list.find(x=>x.id===cid)||list[0]; setPath(S,path,c.id);
    const st=status(c);
    return `<div class="scope"><button class="scard" data-act="go" data-v="campaigns"><span class="l">View (1 filter)</span><span class="v">${msi('home_work')}All campaigns</span>${msi('arrow_drop_down','dd')}</button>
      <label class="scard cur"><span class="l">Campaign</span><span class="v">${msi(c.formats.includes('video')?'smart_display':'ad')}${esc(c.name)}</span>${msi('arrow_drop_down','dd')}<select aria-label="Campaign" data-bind="${path}" data-rr="1">${list.map(x=>`<option value="${x.id}" ${x.id===c.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label></div>
      <div class="statusline">${pill(st)}<span><span class="k">Status:</span> <span class="u">${st==='live'?'Eligible':st==='limited'?'Limited by budget cap':STATUS_LABEL[st]}</span></span><span><span class="k">Type:</span> ${c.model}${c.model==='Sponsorship'?'':' ₹'+c.bid}</span><span><span class="k">Flight:</span> ${dstr(c.start)} – ${dstr(c.end)}</span><button class="linkbtn" data-act="edit-camp" data-id="${c.id}">${msi('settings','s20')} Campaign settings</button></div>`;
  }
  return '';
}
ACT['edit-camp'] = el => { const c=CAMPAIGNS.find(x=>x.id===el.dataset.id); S.draft=Object.assign(clone(c),{audSrc:'custom',pvFmt:'300x250'}); S.draft.name=c.name+' (copy)'; S.wiz=0; go('create'); toast('Editing a copy — launch it to create a new version'); };

function topActions(){
  if (S.view==='reports'){
    const c=myCampaigns().find(x=>x.id===S.rep.cid); if (!c) return '';
    const f=flight(c); const rng_={all:`${dstr(f.s)} – ${dstr(Math.min(TODAY,f.e))}, ${f.s.getFullYear()}`,7:'Last 7 days',14:'Last 14 days',30:'Last 30 days'};
    return `<div class="datepick"><span class="lbl">${S.rep.range==='all'?'Flight to date':'Custom'}</span><label class="box">${rng_[S.rep.range]}${msi('arrow_drop_down')}<select aria-label="Date range" data-bind="rep.range" data-rr="1">${Object.entries(rng_).map(([k,l])=>`<option value="${k}" ${String(S.rep.range)===k?'selected':''}>${k==='all'?'Flight to date':l}</option>`).join('')}</select></label>${S.rep.range!=='30'?'<button class="linkbtn" data-act="set" data-path="rep.range" data-val="30" data-rr="1">Show last 30 days</button>':''}</div>`;
  }
  if (S.view==='adserver') return '';
  return '';
}

function render(){
  const act = document.activeElement; const active = act?.id; let selS=null; try{ selS=act.selectionStart; }catch(e){}
  const sec = sectionOf(S.view);
  // top bar
  const a = ADVERTISERS.find(x=>x.id===S.advId);
  $('#acct').innerHTML = S.console==='pub' ? `<span class="a-top">Torque Publisher Network ${msi('chevron_right','s18')}</span><span class="a-main">${esc(PUB.name)} <small>${PUB.id}</small></span>`
    : S.console==='adv'
    ? `<span class="a-top">Torque Ads · CarDekho Group ${msi('chevron_right','s18')}</span><span class="a-main">${esc(a.name)} <small>${ADV_IDS[a.id]}</small></span>${msi('arrow_drop_down','dd')}
       <select id="acct-pick" aria-label="Switch advertiser account" data-bind="advId" data-rr="1">${ADVERTISERS.filter(x=>x.status==='Active').map(x=>`<option value="${x.id}" ${x.id===S.advId?'selected':''}>${esc(x.name)} · ${ADV_IDS[x.id]}</option>`).join('')}</select>`
    : `<span class="a-top">Torque Ads ${msi('chevron_right','s18')}</span><span class="a-main">Publisher admin <small>CarDekho · BikeDekho · ZigWheels</small></span>`;
  $('#who').innerHTML = S.console==='adv' ? `${esc(a.name)}<small>Advertiser admin</small>` : S.console==='pub' ? `${esc(PUB.name)}<small>Publisher · ${PUB.id}</small>` : `Torque Ad Ops<small>Platform admin</small>`;
  $('#avatar').textContent = S.console==='adv' ? a.name.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase() : S.console==='pub' ? 'DR' : 'AO';
  $('#sw-lbl').textContent = CONSOLES[S.console][0];
  $('#banner').innerHTML = bannerHTML();
  // rail
  const create = S.console==='adv' ? `<div class="menu-wrap"><button class="fab" data-act="pop" data-p="create" aria-label="Create">${msi('add')}</button><div id="pop-create"></div></div><span class="fablbl">Create</span>`
                                   : `<button class="fab" data-act="go" data-v="adserver" aria-label="Run an ad request">${msi('play_arrow')}</button><span class="fablbl">Test ad</span>`;
  $('#rail').innerHTML = create + railFor().map(s=>`<button class="rail-item" data-act="rail" data-k="${s.key}" aria-current="${s===sec}"><span class="ic">${msi(s.icon)}</span>${s.label}</button>`).join('')
    + Object.entries(CONSOLES).filter(([k])=>k!==S.console).map(([k,[l,ic]])=>`<button class="rail-item" data-act="to-console" data-c="${k}"><span class="ic">${msi(ic)}</span>${l.split(' ')[0]}</button>`).join('');
  // subnav
  const nItem = ([id,l]) => `<button class="nitem" data-act="go" data-v="${id}" ${S.view===id?'aria-current="page"':''}>${l}${id==='campaigns'?`<span class="ct">${myCampaigns().length}</span>`:''}</button>`;
  $('#nav').innerHTML = sec.items.map(i=> Array.isArray(i) ? nItem(i)
      : `<div class="ngroup"><button class="nitem" data-act="ngroup" data-g="${esc(i.group)}" aria-expanded="${!!S.navOpen[i.group]}">${i.group}${msi(S.navOpen[i.group]?'expand_less':'expand_more')}</button><div class="kids" ${S.navOpen[i.group]||i.items.some(x=>x[0]===S.view)?'':'hidden'}>${i.items.map(nItem).join('')}</div></div>`).join('');
  $('#shell').classList.toggle('collapsed', S.navCollapsed);
  // page
  $('#scope').innerHTML = scopeHTML();
  $('#title').textContent = VIEW_TITLE[S.view]||'';
  $('#top-actions').innerHTML = topActions();
  $('#view').innerHTML = (VIEWS[S.view]||(()=>''))();
  renderPops();
  if (active){ const el=document.getElementById(active); if (el && el!==document.body){ el.focus({preventScroll:true}); try{ if(selS!=null && el.setSelectionRange) el.setSelectionRange(selS,selS); }catch(e){} } }
}
function go(v){ S.view=v; S.pop=null; render(); window.scrollTo({top:0}); }

/* popovers: create menu, search, notifications */
const NOTIFS = [
  ['campaign','C-1044 is under-delivering','Daily cap limits catch-up — spend is at 71% of plan.','delivery'],
  ['task_alt','Creative approved','Storm 450 outstream video passed review.','creatives'],
  ['group_add','Audience ready','“Premium SUV Intenders” reached 312K users.','audiences'],
];
function renderPops(){
  ['create','search','notif','console'].forEach(p=>{ const el=$('#pop-'+p); if (el) el.innerHTML=''; });
  if (!S.pop) return; const el=$('#pop-'+S.pop); if (!el) return;
  if (S.pop==='create') el.innerHTML = `<div class="pop left" style="top:0;left:64px"><div class="ph">Create</div>${[['campaign','Campaign','new-camp'],['group','Audience','go:audiences'],['flag','Conversion event','go:tracking'],['inventory_2','Buy an audience package','go:packages']].map(([ic,l,a])=>`<button class="pi" data-act="${a.startsWith('go:')?'go':a}" data-v="${a.slice(3)}">${msi(ic)}<span>${l}</span></button>`).join('')}</div>`;
  if (S.pop==='console') el.innerHTML = `<div class="pop"><div class="ph">Switch console</div>${Object.entries(CONSOLES).map(([k,[l,ic]])=>`<button class="pi" data-act="to-console" data-c="${k}">${msi(ic)}<span>${l}${k===S.console?' <small>current</small>':''}<small>${{adv:'Brands buying audiences and ads',pub:'Blogs and sites earning from Torque ads',adm:'Torque team: supply, engine, governance'}[k]}</small></span></button>`).join('')}</div>`;
  if (S.pop==='notif') el.innerHTML = `<div class="pop"><div class="ph">Notifications</div>${NOTIFS.map(([ic,t,d,v])=>`<button class="pi" data-act="go" data-v="${(S.console==='adv'?{delivery:'campaigns'}:{creatives:'overview',audiences:'audience-engine'})[v]||v}">${msi(ic)}<span>${t}<small>${d}</small></span></button>`).join('')}</div>`;
  if (S.pop==='search'){ const all = railFor().flatMap(s=>flatItems(s).map(i=>[i[0],i[1],s.label])); const q=(S.searchQ||'').toLowerCase();
    el.innerHTML = `<div class="pop"><input id="navq" type="text" placeholder="Search pages" value="${esc(S.searchQ||'')}" data-bind="searchQ" data-live="pops" aria-label="Search pages">${all.filter(i=>!q||(i[1]+' '+i[2]).toLowerCase().includes(q)).map(([id,l,s])=>`<button class="pi" data-act="go" data-v="${id}">${msi('arrow_forward')}<span>${l}<small>${s}</small></span></button>`).join('')||'<div class="ph">No matching pages</div>'}</div>`;
    setTimeout(()=>{ const i=$('#navq'); if(i && document.activeElement!==i){ i.focus(); i.setSelectionRange(i.value.length,i.value.length);} },0); }
}
ACT.pop = el => { S.pop = S.pop===el.dataset.p ? null : el.dataset.p; S.searchQ=''; renderPops(); };
ACT.rail = el => { const s=railFor().find(x=>x.key===el.dataset.k); go(flatItems(s)[0][0]); };
ACT.ngroup = el => { const g=el.dataset.g; S.navOpen[g]=!S.navOpen[g]; render(); };
ACT.hamb = () => { S.navCollapsed=!S.navCollapsed; render(); };
ACT['to-console'] = el => { S.console = el.dataset.c; S.view = CONSOLES[S.console][2]; S.pop=null; render(); window.scrollTo({top:0}); };
ACT['switch-console'] = () => { S.pop = S.pop==='console' ? null : 'console'; renderPops(); };
ACT.refresh = () => { render(); toast('Data refreshed · last updated just now'); };
ACT.dismiss = () => { S.bannerOff[S.console+':'+S.advId]=true; render(); };
document.addEventListener('click', e=>{ if (S.pop && !e.target.closest('.menu-wrap')){ S.pop=null; renderPops(); } }, true);
document.addEventListener('keydown', e=>{ if (e.key==='Escape' && S.pop){ S.pop=null; renderPops(); } });
