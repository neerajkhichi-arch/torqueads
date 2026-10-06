/* =========================================================
   PUBLISHER CONSOLE — AdSense-style self-serve onboarding for
   blogs and sites joining the Torque Publisher Network, plus the
   admin review queue, policy workflow and payouts run.
   ========================================================= */
document.head.insertAdjacentHTML('beforeend', `<style>
.stepper-v{display:flex;flex-direction:column;gap:0;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--surface)}
.stepper-v .sv{display:grid;grid-template-columns:40px 1fr auto;gap:12px;align-items:start;padding:16px 18px;border-bottom:1px solid var(--line)}
.stepper-v .sv:last-child{border-bottom:0}
.stepper-v .dot{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:500;background:var(--sunk);color:var(--ink-2)}
.stepper-v .sv.done .dot{background:var(--good);color:#fff}
.stepper-v .sv.cur .dot{background:var(--accent);color:var(--accent-ink)}
.stepper-v .sv.cur{background:var(--accent-soft)}
.stepper-v h4{margin:2px 0 4px;font-family:var(--display);font-size:15px;font-weight:500}
.stepper-v p{margin:0;font-size:13px;color:var(--ink-2)}
.codebox{position:relative}
.codebox .copy{position:absolute;top:6px;right:6px}
.scan{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.scan .sc{border:1px solid var(--line);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;background:var(--surface)}
.scan .sc b{font-size:20px;font-family:var(--display);font-weight:400}
.scan .sc span{font-size:12.5px;color:var(--ink-2)}
.statuschip{display:inline-flex;gap:6px;align-items:center;font-size:12.5px;padding:3px 10px;border-radius:99px;font-weight:500;white-space:nowrap}
.statuschip.ready{background:var(--good-soft);color:var(--good)}
.statuschip.review{background:var(--accent-soft);color:var(--accent-soft-ink)}
.statuschip.action{background:var(--warn-soft);color:var(--warn)}
.statuschip.bad{background:var(--bad-soft);color:var(--bad)}
</style>`);

/* ---------- sample publisher (the signed-in account) ---------- */
const PUB = {
  id:'pub-4812063917', name:'Desi Road Trips Media', share:.70, threshold:1000, currency:'INR',
  profile:{ legal:'Desi Road Trips Media LLP', pan:'•••••4812F', gstin:'27•••••••••1Z5', bank:'HDFC Bank ••••4821', ifsc:'HDFC0000•••', tds:.01, address:'Pune, Maharashtra', complete:true },
  sites:[
    {id:'s1', domain:'desiroadtrips.example', cat:'Travel', status:'ready',  verified:true,  adsTxt:true,  pvDay:86000, since:'2026-07-04', scan:{traffic:94,content:91,policy:100,ivt:1.8,safety:95}},
    {id:'s2', domain:'roadtripreels.example', cat:'Auto',   status:'review', verified:true,  adsTxt:true,  pvDay:21000, since:'2026-09-19', scan:{traffic:81,content:74,policy:96,ivt:3.9,safety:92}},
    {id:'s3', domain:'highwaydhabas.example', cat:'Lifestyle', status:'verify', verified:false, adsTxt:false, pvDay:0, since:'2026-09-23', scan:null},
  ],
  units:[
    {id:'tq-u-1001', name:'Auto ads (whole site)', site:'s1', fmt:'auto', size:'Automatic', created:'2026-07-06'},
    {id:'tq-u-1002', name:'In-article 1', site:'s1', fmt:'in-article', size:'Responsive', created:'2026-07-06'},
    {id:'tq-u-1003', name:'Sidebar MPU', site:'s1', fmt:'display', size:'300x250', created:'2026-07-10'},
    {id:'tq-u-1004', name:'Mobile sticky', site:'s1', fmt:'sticky', size:'320x50', created:'2026-08-02'},
  ],
  blocks:{ cats:['Alcohol','Gambling','Dating'], advertisers:['competitor-travel.example'] },
  payouts:[['Aug 2026','₹38,412','₹384','₹0','₹38,028','Paid · 21 Sep'],['Jul 2026','₹22,960','₹230','₹412','₹22,318','Paid · 21 Aug']],
  issues:[
    {site:'s2', sev:'action', title:'Pages with little content', detail:'3 pages on roadtripreels.example are mostly video embeds with under 100 words. Ads are limited on those pages until content is added.', status:'Ad serving limited', since:'2026-09-21'},
    {site:'s1', sev:'ok', title:'Invalid clicks from one referrer', detail:'A traffic spike from a paid-traffic source was filtered; ₹412 withheld from July earnings.', status:'Resolved', since:'2026-08-03'},
  ],
};
const siteById = id => PUB.sites.find(s=>s.id===id);
const STATUS_TXT = {ready:['ready','Ready — ads serving'], review:['review','In review'], verify:['action','Verify ownership'], adstxt:['action','Add ads.txt'], rejected:['bad','Not approved'], limited:['action','Ad serving limited']};
const statusChip = st => { const [c,t] = STATUS_TXT[st]||['review',st]; return `<span class="statuschip ${c}">${t}</span>`; };
const VERIFY_TOKEN = 'tsv-8f3a2c91d7e4';
const ADS_TXT_LINE = `torque-ads.example, ${PUB.id}, DIRECT, 7c3e91a2b4d5f608`;
const TAG = `<script async src="https://tag.torque-ads.example/t.js?pub=${PUB.id}" crossorigin="anonymous"><\/script>`;
function unitCode(u){ if (u.fmt==='auto') return TAG + `\n<!-- Auto ads: Torque places ads automatically on this site -->`;
  return `<ins class="torque-ad" style="display:block"\n     data-pub="${PUB.id}"\n     data-unit="${u.id}"\n     data-format="${u.fmt}"${u.size!=='Responsive'&&u.size!=='Automatic'?`\n     data-size="${u.size}"`:''}></ins>\n<script>(window.torque = window.torque || []).push({});<\/script>`; }
function codeBox(code, id){ return `<div class="codebox"><pre class="code" id="${id}">${esc(code)}</pre><button class="btn sm copy" data-act="copy" data-t="${id}">${msi('content_copy','s18')}Copy</button></div>`; }
ACT.copy = el => { const t=$('#'+el.dataset.t).textContent; const done=()=>toast('Copied to clipboard'); try{ navigator.clipboard.writeText(t).then(done, ()=>{ selectText(el.dataset.t); toast('Press Ctrl/Cmd+C to copy'); }); }catch(e){ selectText(el.dataset.t); toast('Press Ctrl/Cmd+C to copy'); } };
function selectText(id){ const r=document.createRange(); r.selectNodeContents($('#'+id)); const s=getSelection(); s.removeAllRanges(); s.addRange(r); }

/* earnings model (sample) */
function unitStats(u, days=23){ const s=siteById(u.site); if (!s || s.status!=='ready') return {pv:0,imps:0,clicks:0,rev:0,fill:0};
  const w = {auto:.34, 'in-article':.28, display:.22, sticky:.16}[u.fmt]||.2; const r=rng(u.id);
  const pv = s.pvDay*days; const imps = Math.round(pv*w*2.1*(0.9+r()*.2)); const fill=.62+r()*.2; const ecpm = {auto:44,'in-article':58,display:40,sticky:22}[u.fmt]||40;
  const rev = imps*fill*ecpm/1000*PUB.share; return {pv, imps:Math.round(imps*fill), req:imps, clicks:Math.round(imps*fill*.0042), rev, fill}; }
function pubTotals(days=23){ const us=PUB.units.map(u=>unitStats(u,days)); const pv=sum(PUB.sites.filter(s=>s.status==='ready').map(s=>s.pvDay*days));
  const rev=sum(us.map(x=>x.rev)), imps=sum(us.map(x=>x.imps)), req=sum(us.map(x=>x.req||0)); return {pv, rev, imps, clicks:sum(us.map(x=>x.clicks)), rpm: pv? rev/pv*1000:0, fill: req? imps/req:0}; }

/* ---------- navigation ---------- */
const PUB_RAIL = [
  {key:'home', icon:'home', label:'Home', items:[['pub-home','Overview'],['pub-reports','Reports']]},
  {key:'sites', icon:'language', label:'Sites', items:[['pub-sites','Sites'],['pub-add','Add a site']]},
  {key:'ads', icon:'ad_units', label:'Ads', items:[['pub-units','Ad units'],['pub-blocking','Blocking controls']]},
  {key:'pay', icon:'payments', label:'Payments', items:[['pub-pay','Payments'],['pub-profile','Payment profile']]},
  {key:'policy', icon:'policy', label:'Policy', items:[['pub-policy','Policy center']]},
];
ADM_RAIL[1].items.push(['pub-queue','Publisher review queue'], ['pub-payouts','Publisher payouts']);
Object.assign(VIEW_TITLE, {'pub-home':'Overview','pub-reports':'Reports','pub-sites':'Sites','pub-add':'Add a site','pub-units':'Ad units','pub-blocking':'Blocking controls','pub-pay':'Payments','pub-profile':'Payment profile','pub-policy':'Policy center','pub-queue':'Publisher review queue','pub-payouts':'Publisher payouts'});
S.pub = { add:{step:0, domain:'', cat:'Auto', pv:'', method:'meta', verified:false, adsTxt:false}, newUnit:{name:'', site:'s1', fmt:'display', size:'300x250'}, showCode:'tq-u-1003', repDim:'unit' };
function pubBannerHTML(){ const key='pub'; if (S.bannerOff[key]) return '';
  const open = PUB.issues.find(i=>i.sev==='action');
  return open ? `<div class="banner" role="status">${msi('warning')}<p><b>${esc(open.title)}</b> — ${esc(open.detail)}</p><button class="linkbtn" data-act="pub-dismiss">Dismiss</button><button class="btn fix" data-act="go" data-v="pub-policy">Fix it</button></div>` : ''; }
ACT['pub-dismiss'] = () => { S.bannerOff.pub=true; render(); };
const _rp = renderPops;
renderPops = function(){ _rp(); if (S.pop==='notif' && S.console==='pub'){ $('#pop-notif').innerHTML = `<div class="pop"><div class="ph">Notifications</div>${[
  ['task_alt','Payment sent','₹38,028 for August reached HDFC ••••4821.','pub-pay'],
  ['hourglass_top','roadtripreels.example is in review','Usually 2–3 days. We\'ll email you when it\'s done.','pub-sites'],
  ['warning','Ad serving limited on 3 pages','Add more original content to restore full ad serving.','pub-policy']].map(([ic,t,d,v])=>`<button class="pi" data-act="go" data-v="${v}">${msi(ic)}<span>${t}<small>${d}</small></span></button>`).join('')}</div>`; } };
if (S.pop==null) S.pop=null;
const _createPop = renderPops;

/* ---------- PUBLISHER: Overview ---------- */
VIEWS['pub-home'] = () => {
  const t = pubTotals(23), today = pubTotals(1), yest = pubTotals(1);
  const r = rng('pubdays'); const labels=[], rev=[]; for (let i=1;i<=23;i++){ const dt=new Date(2026,8,i); labels.push(dstr(dt)); rev.push(t.rev/23*(0.85+i/23*.25+(r()-.5)*.2)*(dt.getDay()%6===0?1.15:1)); }
  const bal = 12480 + t.rev;
  return kpis([['Estimated earnings today',fmtINRx(today.rev*.52),'so far, updates hourly'],['This month',fmtINRx(t.rev),`${pct(PUB.share,0)} revenue share`],['Page views',fmtN(t.pv),'this month, ready sites'],['Page RPM','₹'+t.rpm.toFixed(1),'earnings per 1,000 page views'],['Fill rate',pct(t.fill,0),'ad requests filled'],['Balance',fmtINRx(bal),`paid on the 21st · min ₹${PUB.threshold.toLocaleString('en-IN')}`]])
  + `<div class="grid g-side">${panel('Earnings — September', lineChart('ch-pub',labels,[{name:'Earnings',color:'var(--c1)',vals:rev,area:true}],{fmt:v=>'₹'+Math.round(v).toLocaleString('en-IN')}), {sub:'hover for values'})}
     ${panel('Your sites', `<div class="stack" style="gap:12px">${PUB.sites.map(s=>`<div class="row" style="justify-content:space-between"><span><b style="font-weight:500">${s.domain}</b><div class="muted" style="font-size:12.5px">${s.cat}${s.pvDay?` · ${fmtN(s.pvDay*30)} page views/month`:''}</div></span>${statusChip(s.status)}</div>`).join('')}<div><button class="btn" data-act="pub-new-site">${msi('add','s20')}Add a site</button></div></div>`)}</div>
  ${panel('Top ad units this month', pubUnitTable(), {pad:false, actions:'<button class="btn sm" data-act="go" data-v="pub-units">Manage ad units</button>'})}
  <div class="note">Ads come from Torque advertisers (auto brands, EV makers, banks, insurers) who target readers by interest and context. You earn ${pct(PUB.share,0)} of what advertisers pay for ads on your pages.</div>`;
};
function pubUnitTable(){ return `<div class="tbl-wrap"><table><thead><tr><th>Ad unit</th><th>Site</th><th>Type</th><th class="n m">Impressions</th><th class="n m">Clicks</th><th class="n m">Fill</th><th class="n m">Earnings</th></tr></thead><tbody>${PUB.units.map(u=>{ const x=unitStats(u); return `<tr><td><b style="font-weight:500">${esc(u.name)}</b><div class="muted mono">${u.id}</div></td><td>${siteById(u.site)?.domain||'—'}</td><td>${u.fmt==='auto'?'Auto ads':u.fmt==='in-article'?'In-article':u.fmt==='sticky'?'Sticky':'Display'} · ${u.size}</td><td class="n">${fmtN(x.imps)}</td><td class="n">${fmtN(x.clicks)}</td><td class="n">${x.req?pct(x.fill,0):'—'}</td><td class="n">${fmtINRx(x.rev)}</td></tr>`; }).join('')}</tbody></table></div>`; }
ACT['pub-new-site'] = () => { S.pub.add={step:0, domain:'', cat:'Auto', pv:'', method:'meta', verified:false, adsTxt:false}; go('pub-add'); };

/* ---------- PUBLISHER: Reports ---------- */
VIEWS['pub-reports'] = () => { const dim=S.pub.repDim;
  const rows = dim==='unit' ? PUB.units.map(u=>[u.name, unitStats(u)]) : dim==='site' ? PUB.sites.map(s=>[s.domain, PUB.units.filter(u=>u.site===s.id).map(unitStats).reduce((a,b)=>({imps:a.imps+b.imps,clicks:a.clicks+b.clicks,rev:a.rev+b.rev,req:(a.req||0)+(b.req||0)}),{imps:0,clicks:0,rev:0,req:0})])
    : [['Mobile',.79],['Desktop',.21]].map(([l,w])=>{ const t=pubTotals(); return [l,{imps:t.imps*w, clicks:t.clicks*w*(l==='Mobile'?.9:1.35), rev:t.rev*w*(l==='Mobile'?.92:1.3)}]; });
  return `<div class="row">${seg('pub.repDim',[['unit','By ad unit'],['site','By site'],['device','By device']],dim)}</div>` + panel('September to date', `<div class="tbl-wrap"><table><thead><tr><th>${{unit:'Ad unit',site:'Site',device:'Device'}[dim]}</th><th class="n m">Impressions</th><th class="n m">Clicks</th><th class="n m">CTR</th><th class="n m">Impression RPM</th><th class="n m">Earnings</th></tr></thead><tbody>${rows.map(([l,x])=>`<tr><td>${esc(l)}</td><td class="n">${fmtN(x.imps)}</td><td class="n">${fmtN(x.clicks)}</td><td class="n">${x.imps?pct(x.clicks/x.imps,2):'—'}</td><td class="n">${x.imps?'₹'+(x.rev/x.imps*1000).toFixed(1):'—'}</td><td class="n">${fmtINRx(x.rev)}</td></tr>`).join('')}</tbody></table></div>`, {pad:false, sub:'earnings are estimated until month end, after invalid-traffic checks'}); };

/* ---------- PUBLISHER: Sites ---------- */
VIEWS['pub-sites'] = () => panel('Sites', `<div class="tbl-wrap"><table><thead><tr><th>Site</th><th>Category</th><th>Ownership</th><th>ads.txt</th><th>Status</th><th class="n">Page views / month</th><th></th></tr></thead><tbody>${PUB.sites.map(s=>`<tr><td><b style="font-weight:500">${s.domain}</b><div class="muted" style="font-size:12.5px">added ${dstr(s.since)}</div></td><td>${s.cat}</td><td>${s.verified?'<span class="ok">✓ Verified</span>':'<span class="no">Not verified</span>'}</td><td>${s.adsTxt?'<span class="ok">✓ Found</span>':'<span class="no">Missing</span>'}</td><td>${statusChip(s.status)}</td><td class="n">${s.pvDay?fmtN(s.pvDay*30):'—'}</td><td>${s.status==='verify'||s.status==='adstxt'?`<button class="btn sm" data-act="pub-resume" data-id="${s.id}">Continue setup</button>`:''}</td></tr>`).join('')}</tbody></table></div>`, {pad:false, actions:`<button class="btn pri" data-act="pub-new-site">${msi('add','s20')}Add a site</button>`})
  + `<div class="note">A site starts showing ads once it's verified, has the Torque line in ads.txt and passes review. Review checks traffic quality, original content, our programme policies and brand safety — usually within 2–3 days.</div>`;
ACT['pub-resume'] = el => { const s=siteById(el.dataset.id); S.pub.add={step:s.verified?2:1, domain:s.domain, cat:s.cat, pv:'', method:'meta', verified:s.verified, adsTxt:s.adsTxt, siteId:s.id}; go('pub-add'); };

/* ---------- PUBLISHER: Add a site (wizard) ---------- */
VIEWS['pub-add'] = () => { const a=S.pub.add; const st=a.step;
  const cls = i => i<st?'done':i===st?'cur':'';
  const steps = [
    ['Tell us about your site', `<div class="grid g3" style="gap:10px;margin-top:10px"><label class="f" for="pa-d">Site URL<input id="pa-d" type="text" placeholder="yourblog.in" data-bind="pub.add.domain" value="${esc(a.domain)}"></label>
       <label class="f" for="pa-c">Main topic<select id="pa-c" data-bind="pub.add.cat">${NET_CATS.map(c=>`<option ${c===a.cat?'selected':''}>${c}</option>`).join('')}</select></label>
       <label class="f" for="pa-pv">Monthly page views (approx.)<input id="pa-pv" type="number" data-bind="pub.add.pv" value="${esc(a.pv)}" placeholder="100000"></label></div>
       <div class="row" style="margin-top:12px"><button class="btn pri" data-act="pub-add-1">Save and continue</button></div>`],
    ['Verify you own the site', `${seg('pub.add.method',[['meta','HTML meta tag'],['dns','DNS TXT record']],a.method)}<div style="margin-top:10px">${a.method==='meta'
       ? `<p>Paste this inside the <span class="mono">&lt;head&gt;</span> of your homepage:</p>${codeBox(`<meta name="torque-site-verification" content="${VERIFY_TOKEN}">`,'vcode')}`
       : `<p>Add this TXT record at your domain provider:</p>${codeBox(`Host: @\nType: TXT\nValue: torque-site-verification=${VERIFY_TOKEN}`,'vcode')}`}</div>
       <div class="row" style="margin-top:12px"><button class="btn pri" data-act="pub-verify">Check now</button>${a.verified?'<span class="ok">✓ Ownership verified</span>':''}</div>`],
    ['Add Torque to ads.txt', `<p>Add this line to <span class="mono">${esc(a.domain||'yoursite.in')}/ads.txt</span> (create the file if it doesn't exist). It tells advertisers Torque is allowed to sell your ad space.</p>${codeBox(ADS_TXT_LINE,'adscode')}
       <div class="row" style="margin-top:12px"><button class="btn pri" data-act="pub-adstxt">Check ads.txt</button>${a.adsTxt?'<span class="ok">✓ Found</span>':'<span class="muted" style="font-size:12.5px">We re-check daily; changes can take up to 24 hours to be picked up.</span>'}</div>`],
    ['Add the Torque code', `<p>Paste this once in the <span class="mono">&lt;head&gt;</span> of every page. With Auto ads on, that's all you need — Torque finds good placements automatically. You can add manual ad units later.</p>${codeBox(TAG,'tagcode')}
       <div class="row" style="margin-top:12px"><button class="btn pri" data-act="pub-submit">Request review</button></div>`],
    ['Review', `<p>We're checking traffic quality, original content, programme policies and brand safety. This usually takes 2–3 days. You'll get an email when it's done.</p>`],
  ];
  return `<div class="stepper-v">${steps.map(([h,body],i)=>`<div class="sv ${cls(i)}"><span class="dot">${i<st?'✓':i+1}</span><div><h4>${h}</h4>${i===st?body:`<p>${i<st?'Done':'—'}</p>`}</div><span></span></div>`).join('')}</div>
  <div class="note">Your site must meet the Torque Publisher Policies: original content, no adult, gambling, hate or copyright-infringing material, no paid or incentivised traffic, and no clicking your own ads.</div>`; };
ACT['pub-add-1'] = () => { const a=S.pub.add; const d=a.domain.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/.*$/,'');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)){ toast('Enter a site address like yourblog.in'); return; }
  if (PUB.sites.some(s=>s.domain===d && s.id!==a.siteId)){ toast('That site is already in your account'); return; }
  a.domain=d; if (!a.siteId){ a.siteId='s'+(PUB.sites.length+1); PUB.sites.push({id:a.siteId, domain:d, cat:a.cat, status:'verify', verified:false, adsTxt:false, pvDay:(+a.pv||90000)/30, since:iso(TODAY), scan:null}); }
  a.step=1; render(); };
ACT['pub-verify'] = () => { const a=S.pub.add; a.verified=true; const s=siteById(a.siteId); if (s){ s.verified=true; s.status='adstxt'; } toast('Verification tag found — ownership confirmed'); setTimeout(()=>{ a.step=2; render(); }, 400); render(); };
ACT['pub-adstxt'] = () => { const a=S.pub.add; a.adsTxt=true; const s=siteById(a.siteId); if (s){ s.adsTxt=true; } toast('ads.txt line found'); setTimeout(()=>{ a.step=3; render(); }, 400); render(); };
ACT['pub-submit'] = () => { const a=S.pub.add; const s=siteById(a.siteId); const r=rng(a.domain);
  if (s){ s.status='review'; s.scan={traffic:Math.round(70+r()*28), content:Math.round(65+r()*32), policy:Math.round(90+r()*10), ivt:+(r()*6).toFixed(1), safety:Math.round(80+r()*19)}; }
  audit(PUB.id,'Publisher','Requested site review',a.domain); a.step=4; toast('Submitted for review'); render(); };

/* ---------- PUBLISHER: Ad units ---------- */
VIEWS['pub-units'] = () => { const n=S.pub.newUnit; const cur=PUB.units.find(u=>u.id===S.pub.showCode)||PUB.units[0]; const ready=PUB.sites.filter(s=>s.status==='ready');
  return `<div class="grid g-side">${panel('Ad units', pubUnitTable() + `<div class="body"><div class="row">${PUB.units.map(u=>`<button class="chipv" data-act="set" data-path="pub.showCode" data-val="${u.id}" aria-pressed="${u.id===cur.id}">${esc(u.name)}</button>`).join('')}</div></div>`, {pad:false})}
    ${panel('Get code: '+esc(cur.name), `<div class="stack"><p class="muted" style="margin:0;font-size:13px">${cur.fmt==='auto'?'Paste once in the &lt;head&gt; of every page.':'Paste where you want the ad to appear. The Torque code in &lt;head&gt; must also be on the page.'}</p>${codeBox(unitCode(cur),'ucode')}</div>`)}</div>
    ${panel('Create an ad unit', ready.length?`<div class="grid g4" style="gap:10px"><label class="f" for="nu-n">Name<input id="nu-n" type="text" data-bind="pub.newUnit.name" value="${esc(n.name)}" placeholder="e.g. Below article"></label>
      <label class="f" for="nu-s">Site<select id="nu-s" data-bind="pub.newUnit.site">${ready.map(s=>`<option value="${s.id}" ${s.id===n.site?'selected':''}>${s.domain}</option>`).join('')}</select></label>
      <label class="f" for="nu-f">Type<select id="nu-f" data-bind="pub.newUnit.fmt" data-rr="1">${[['display','Display'],['in-article','In-article'],['sticky','Mobile sticky'],['video','Outstream video']].map(([v,l])=>`<option value="${v}" ${v===n.fmt?'selected':''}>${l}</option>`).join('')}</select></label>
      <label class="f" for="nu-z">Size<select id="nu-z" data-bind="pub.newUnit.size">${(n.fmt==='display'?['300x250','728x90','300x600','970x250','Responsive']:n.fmt==='sticky'?['320x50','320x100']:['Responsive']).map(z=>`<option ${z===n.size?'selected':''}>${z}</option>`).join('')}</select></label></div>
      <div class="row" style="margin-top:12px"><button class="btn pri" data-act="pub-unit-add">Create and get code</button></div>`:'<p class="muted" style="margin:0">Ad units can be created once a site is approved.</p>')}`; };
ACT['pub-unit-add'] = () => { const n=S.pub.newUnit; if (!n.name.trim()){ toast('Name the ad unit'); return; }
  const size = n.fmt==='display'||n.fmt==='sticky' ? (n.size==='Responsive'&&n.fmt==='sticky'?'320x50':n.size) : 'Responsive';
  const u={id:'tq-u-'+(1001+PUB.units.length), name:n.name.trim(), site:n.site, fmt:n.fmt==='video'?'display':n.fmt, size, created:iso(TODAY)}; PUB.units.push(u); S.pub.showCode=u.id; S.pub.newUnit={name:'',site:n.site,fmt:'display',size:'300x250'};
  audit(PUB.id,'Publisher','Created ad unit',`${u.id} · ${u.name}`); toast('Ad unit created — copy the code'); render(); };

/* ---------- PUBLISHER: Blocking controls ---------- */
VIEWS['pub-blocking'] = () => panel('Advertiser categories', `<p class="muted" style="margin:0 0 10px">Blocked categories never show on your sites. Blocking more categories can lower earnings.</p>${chips('pub_blocks_cats',['Alcohol','Gambling','Dating','Political','Religion','Get-rich-quick','Weight loss','Crypto','Competitor travel sites'].map(c=>[c,c]),PUB.blocks.cats)}`)
  + panel('Specific advertisers', `<div class="row"><input id="blk-d" type="text" placeholder="advertiser-site.com" aria-label="Advertiser website to block" style="max-width:320px"><button class="btn" data-act="pub-block-add">Block</button></div><div class="row" style="margin-top:10px">${PUB.blocks.advertisers.map(d=>`<span class="tag">${esc(d)}</span>`).join('')}</div>`);
S.pub_blocks_cats = PUB.blocks.cats;
ACT['pub-block-add'] = () => { const v=$('#blk-d').value.trim(); if(!v) return; PUB.blocks.advertisers.push(v); toast(v+' blocked'); render(); };

/* ---------- PUBLISHER: Payments ---------- */
VIEWS['pub-pay'] = () => { const t=pubTotals(23); const bal=12480+t.rev;
  return kpis([['Your balance',fmtINRx(bal),'includes this month so far'],['Next payment','21 Oct 2026','for September earnings'],['Payment threshold',fmtINRx(PUB.threshold),'balances below roll over'],['Paid to',PUB.profile.bank,'bank transfer (NEFT)']])
  + panel('Payment history', `<div class="tbl-wrap"><table><thead><tr><th>Month</th><th class="n">Earnings</th><th class="n">TDS</th><th class="n">Invalid traffic deducted</th><th class="n">Paid</th><th>Status</th></tr></thead><tbody>
    <tr class="total"><td>Sep 2026 (so far)</td><td class="n">${fmtINRx(t.rev)}</td><td class="n">${fmtINRx(t.rev*PUB.profile.tds)}</td><td class="n">—</td><td class="n">${fmtINRx(t.rev*(1-PUB.profile.tds))}</td><td>Estimated · finalised 3 Oct</td></tr>
    ${PUB.payouts.map(r=>`<tr><td>${r[0]}</td><td class="n">${r[1]}</td><td class="n">${r[2]}</td><td class="n">${r[3]}</td><td class="n">${r[4]}</td><td><span class="pill live">${r[5]}</span></td></tr>`).join('')}</tbody></table></div>`, {pad:false})
  + `<div class="note">How it works: earnings are finalised on the 3rd after invalid-traffic checks, TDS is deducted as applicable, and payments above ₹${PUB.threshold.toLocaleString('en-IN')} are sent on the 21st. You receive a monthly statement for your records.</div>`; };
VIEWS['pub-profile'] = () => { const p=PUB.profile; return panel('Payment profile', `<div class="tbl-wrap"><table><tbody>${[['Legal name',p.legal],['PAN',p.pan],['GSTIN',p.gstin+' <span class="muted">(optional; add to receive GST on your earnings)</span>'],['Bank account',p.bank],['IFSC',p.ifsc],['Address',p.address],['TDS rate',pct(p.tds,0)+' <span class="muted">(as applicable to your entity type)</span>']].map(([k,v])=>`<tr><th style="width:180px">${k}</th><td>${v}</td></tr>`).join('')}</tbody></table></div>`, {pad:false, actions:'<button class="btn" data-act="pub-profile-edit">Edit</button>'})
  + `<div class="note">Bank details are verified with a ₹1 test deposit before the first payment. Changes to the bank account pause payments for 48 hours as a security check.</div>`; };
ACT['pub-profile-edit'] = () => toast('Editing payment details requires re-verification — sent a code to your registered email');

/* ---------- PUBLISHER: Policy center ---------- */
VIEWS['pub-policy'] = () => panel('Issues', `<div class="tbl-wrap"><table><thead><tr><th>Site</th><th>Issue</th><th>Effect</th><th>Since</th><th></th></tr></thead><tbody>${PUB.issues.map((x,i)=>`<tr><td>${siteById(x.site)?.domain}</td><td><b style="font-weight:500">${esc(x.title)}</b><div class="muted" style="font-size:12.5px;max-width:520px">${esc(x.detail)}</div></td><td>${x.sev==='action'?`<span class="statuschip action">${x.status}</span>`:`<span class="statuschip ready">${x.status}</span>`}</td><td>${dstr(x.since)}</td><td>${x.sev==='action'?`<button class="btn sm" data-act="pub-fixed" data-i="${i}">I've fixed it — request review</button>`:''}</td></tr>`).join('')}</tbody></table></div>`, {pad:false})
  + `<div class="grid g3">${[['Warning','We tell you what to fix. Ads keep serving.'],['Ad serving limited','Ads stop on affected pages until fixed and re-reviewed.'],['Account suspended','For serious or repeated violations, e.g. click fraud. Unpaid earnings from invalid activity are withheld.']].map(([t,p])=>`<div class="insight"><b>${t}</b><p>${p}</p></div>`).join('')}</div>`;
ACT['pub-fixed'] = el => { const x=PUB.issues[+el.dataset.i]; x.status='Re-review requested'; x.sev='pending'; audit(PUB.id,'Publisher','Requested policy re-review',x.title); toast('Thanks — we\'ll re-check within 48 hours'); render(); };

/* ---------- ADMIN: Publisher review queue ---------- */
function reviewQueue(){
  const own = PUB.sites.filter(s=>s.status==='review').map(s=>({key:'pub:'+s.id, pub:PUB.name, pubId:PUB.id, domain:s.domain, cat:s.cat, pv:s.pvDay*30, since:s.since, scan:s.scan}));
  const net = NET_PUBS.filter(p=>p.status!=='Live').map(p=>{ const r=rng(p.id); return {key:'net:'+p.id, pub:p.name, pubId:'pub-'+(4812063900+ +p.id.slice(1)), domain:p.domain, cat:p.cat, pv:p.pv, since:p.since, scan:{traffic:Math.round(72+r()*25), content:Math.round(66+r()*30), policy:Math.round(88+r()*12), ivt:+(r()*7).toFixed(1), safety:p.safety||Math.round(78+r()*20)}}; });
  return [...own, ...net];
}
function scanVerdict(s){ if (!s) return ['review','Scanning']; if (s.ivt>5 || s.policy<90) return ['bad','Recommend reject']; if (s.content<75 || s.traffic<75) return ['action','Needs a closer look']; return ['ready','Recommend approve']; }
VIEWS['pub-queue'] = () => { const q=reviewQueue();
  return kpis([['Waiting for review',q.length,'target: decide within 3 days'],['Auto-recommended approve',q.filter(x=>scanVerdict(x.scan)[0]==='ready').length,''],['Flagged',q.filter(x=>scanVerdict(x.scan)[0]!=='ready').length,'low content, invalid traffic or policy'],['Live publishers',netLive().length+PUB.sites.filter(s=>s.status==='ready').length,'network total']])
  + (q.length ? q.map(x=>{ const [vc,vt]=scanVerdict(x.scan); const s=x.scan||{};
    return `<section class="panel"><header><h2>${esc(x.domain)}</h2><span class="sub">${esc(x.pub)} · ${x.pubId} · ${x.cat} · ${fmtN(x.pv)} page views/month · applied ${dstr(x.since)}</span><span class="sp"></span><span class="statuschip ${vc}">${vt}</span></header>
      <div class="body stack"><div class="scan">${[['Traffic quality',s.traffic,'/100'],['Original content',s.content,'/100'],['Policy check',s.policy,'/100'],['Invalid traffic',s.ivt,'% of visits'],['Brand safety',s.safety,'/100']].map(([l,v,u])=>`<div class="sc"><span>${l}</span><b>${v??'—'}<span style="font-size:12px"> ${u}</span></b></div>`).join('')}</div>
      <div class="row"><button class="btn pri" data-act="q-approve" data-k="${x.key}">Approve</button><button class="btn" data-act="q-reject" data-k="${x.key}" data-r="Low-value content">Reject: low-value content</button><button class="btn" data-act="q-reject" data-k="${x.key}" data-r="Invalid traffic">Reject: invalid traffic</button><button class="btn ghost" data-act="q-reject" data-k="${x.key}" data-r="Policy violation">Reject: policy</button></div></div></section>`; }).join('')
    : `<div class="note good">No sites waiting for review.</div>`)
  + `<div class="note">Automated scan: crawl of 50 pages (content length, originality, prohibited content), 14-day traffic sample for bots and paid-traffic sources, and a brand-safety classifier. Reviewers see the scan and decide; every decision is written to the audit log and emailed to the publisher with the reason.</div>`; };
function resolveQ(key, approve, reason){ const [kind,id]=key.split(':');
  if (kind==='pub'){ const s=siteById(id); s.status = approve?'ready':'rejected'; if (approve && !PUB.units.some(u=>u.site===id)) PUB.units.push({id:'tq-u-'+(1001+PUB.units.length), name:'Auto ads (whole site)', site:id, fmt:'auto', size:'Automatic', created:iso(TODAY)}); return s.domain; }
  const p=NET_PUBS.find(x=>x.id===id); p.status = approve?'Live':'Rejected'; if (approve) p.safety=p.safety||93; return p.domain; }
ACT['q-approve'] = el => { const d=resolveQ(el.dataset.k, true); audit('reviewer@torque','Admin','Approved publisher site',d); toast(d+' approved — ads start serving within an hour'); render(); };
ACT['q-reject'] = el => { const d=resolveQ(el.dataset.k, false); audit('reviewer@torque','Admin','Rejected publisher site',`${d} · ${el.dataset.r}`); toast(`${d} rejected (${el.dataset.r}) — publisher notified with the reason`); render(); };

/* ---------- ADMIN: Publisher payouts ---------- */
VIEWS['pub-payouts'] = () => { const rows = [...netLive().map(p=>{ const r=rng(p.id+'pay'); const g=p.pv*2.4*.41*OFFSITE.media.network/1000*p.share; const ivt=g*(r()*.02); return [p.name, 'pub-'+(4812063900+ +p.id.slice(1)), g, ivt, (g-ivt)*.01, r()<.9?'Ready':'Hold: KYC']; }),
    [PUB.name, PUB.id, 38412, 0, 384, 'Ready']];
  const tot = sum(rows.map(r=>r[2]-r[3]-r[4]));
  return kpis([['Publishers to pay',rows.filter(r=>r[5]==='Ready').length,`${rows.length} with earnings`],['Total payout (Aug)',fmtINRx(tot),'after TDS and IVT'],['Invalid traffic withheld',fmtINRx(sum(rows.map(r=>r[3]))),'returned to advertisers'],['Payout date','21 Sep 2026','bulk NEFT']])
  + panel('August 2026 payout run', `<div class="tbl-wrap"><table><thead><tr><th>Publisher</th><th>ID</th><th class="n">Gross earnings</th><th class="n">IVT deducted</th><th class="n">TDS</th><th class="n">Net payout</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r[0])}</td><td class="mono">${r[1]}</td><td class="n">${fmtINRx(r[2])}</td><td class="n">${fmtINRx(r[3])}</td><td class="n">${fmtINRx(r[4])}</td><td class="n"><b style="font-weight:500">${fmtINRx(r[2]-r[3]-r[4])}</b></td><td><span class="pill ${r[5]==='Ready'?'live':'limited'}">${r[5]}</span></td></tr>`).join('')}</tbody></table></div>`, {pad:false, actions:'<button class="btn pri" data-act="payout-run">Approve payout run</button>'})
  + `<div class="note">Payouts go through a bulk-payout provider (e.g. RazorpayX) with TDS deducted as applicable and a monthly statement to each publisher. Publishers without verified PAN and bank details are held until KYC completes. Rates and TDS treatment to be confirmed with finance.</div>`; };
ACT['payout-run'] = () => { audit('finance@torque','Admin','Approved publisher payout run','Aug 2026'); toast('Payout run approved — transfers scheduled for 21 Sep'); };

render();
