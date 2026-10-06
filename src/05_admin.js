/* =================== ADMIN CONSOLE =================== */
function networkStats(){
  const monthly = sum(INVENTORY.filter(i=>i.active).map(i=>i.imps));
  const sold = sum(INVENTORY.filter(i=>i.active).map(i=>i.imps*i.sold));
  const mtdFrac = 23/30;
  const rev = sum(INVENTORY.map(i=>i.imps*i.sold*i.floor*1.18/1000))*mtdFrac;
  const clicks = sum(CAMPAIGNS.map(c=>c.stats.clicks)), imps=sum(CAMPAIGNS.map(c=>c.stats.imps));
  return {monthly, sold, fill: sold/monthly, rev, ecpm: rev/(sold*mtdFrac)*1000, ctr: clicks/imps};
}
VIEWS.overview = () => {
  const n=networkStats(); const live=CAMPAIGNS.filter(c=>['live','limited'].includes(status(c)));
  const pool = sitePool(['cd','bd','zw'],'any');
  const siteRows = Object.values(SITES).map(s=>{ const inv=INVENTORY.filter(i=>i.site===s.id&&i.active); const m=sum(inv.map(i=>i.imps)), so=sum(inv.map(i=>i.imps*i.sold)); const rev=sum(inv.map(i=>i.imps*i.sold*i.floor*1.18/1000))*23/30; const cs=CAMPAIGNS.filter(c=>c.sites.includes(s.id)); const cl=sum(cs.map(c=>c.stats.clicks/c.sites.length)), im=sum(cs.map(c=>c.stats.imps/c.sites.length));
    return {s, m, so, rev, ecpm: rev/(so*23/30)*1000, ctr: cl/im, camps: cs.filter(c=>['live','limited'].includes(status(c))).length}; });
  const r=rng('rev'); const labels=[], rev=[], fill=[]; for (let i=1;i<=23;i++){ const dt=new Date(2026,8,i); labels.push(dstr(dt)); const w=(1+ (i/23)*.25 + (r()-.5)*.18)*(dt.getDay()%6===0?.88:1); rev.push(n.rev/23*w*.9); fill.push(clamp(n.fill*(0.93+i/23*.1+(r()-.5)*.04),0,1)); }
  const byPt = {}; INVENTORY.filter(i=>i.active).forEach(i=>{ const k=SITES[i.site].name+' · '+pageName(i.site,i.pt); byPt[k]=(byPt[k]||0)+i.imps*(1-i.sold); });
  const unsold = Object.entries(byPt).sort((a,b)=>b[1]-a[1]).slice(0,8);
  return kpis([['Monthly inventory',fmtN(n.monthly),'ad impressions, 3 sites'],['Sold · fill rate',fmtN(n.sold),pct(n.fill,1)+' fill'],['Revenue MTD',fmtINR(n.rev),'<span class="up">▲ 14.2%</span> vs Aug MTD'],['Avg. eCPM','₹'+Math.round(n.ecpm),'across all models'],['CTR',pct(n.ctr,2),'network average'],['Campaigns running',live.length,`${ADVERTISERS.filter(a=>a.status==='Active').length} active advertisers`],['Audience pool',fmtN(pool),'30-day de-duplicated users']])
  + `<div class="grid g2">${panel('Daily revenue — September', lineChart('ch-rev',labels,[{name:'Revenue',color:'var(--c1)',vals:rev,area:true}],{fmt:fmtINR}), {sub:'hover for values'})}
    ${panel('Daily fill rate', lineChart('ch-fill',labels,[{name:'Fill rate',color:'var(--c3)',vals:fill,area:true}],{fmt:v=>pct(v,0)}), {sub:'sold ÷ available impressions'})}</div>
  ${panel('Website performance', `<div class="tbl-wrap"><table><thead><tr><th>Website</th><th class="n">Monthly users</th><th class="n">Inventory</th><th class="n">Sold</th><th>Fill</th><th class="n">Unsold</th><th class="n">eCPM</th><th class="n">CTR</th><th class="n">Revenue MTD</th><th class="n">Live campaigns</th></tr></thead><tbody>
    ${siteRows.map(x=>`<tr><td>${siteTag(x.s.id)}</td><td class="n">${fmtN(x.s.uv)}</td><td class="n">${fmtN(x.m)}</td><td class="n">${fmtN(x.so)}</td><td style="width:130px">${bar(x.so/x.m)}</td><td class="n">${fmtN(x.m-x.so)}</td><td class="n">₹${Math.round(x.ecpm)}</td><td class="n">${pct(x.ctr||0,2)}</td><td class="n">${fmtINR(x.rev)}</td><td class="n">${x.camps}</td></tr>`).join('')}</tbody></table></div>`, {pad:false})}
  <div class="grid g2">${panel('Largest pools of unsold inventory', hbars(unsold, {color:'var(--c2)'}), {sub:'monthly impressions'})}
    ${panel('Campaign delivery at a glance', `<div class="stack" style="gap:10px">${CAMPAIGNS.filter(c=>status(c)!=='ended').map(c=>{ const p=pacing(c); const st=status(c); return `<div style="display:grid;grid-template-columns:minmax(0,1fr) 120px auto;gap:10px;align-items:center;font-size:12.5px"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>${esc(c.name)}</b> <span class="muted">${esc(advName(c.adv))}</span></span>${bar(c.stats.spend/c.budget,{mark:p.f.total?p.f.elapsed/p.f.total:0,cls:p.pace<.9&&st!=='sched'?'warn':''})}${pill(st)}</div>`; }).join('')}</div>`, {actions:'<button class="btn sm" data-act="go" data-v="delivery">Open pacing</button>'})}</div>`;
};

/* ---- Delivery & pacing ---- */
VIEWS.delivery = () => `<div class="note"><b>How pacing works.</b> Every 5 minutes the pacing engine recomputes each campaign's <span class="mono">target daily spend = remaining budget ÷ remaining days</span> (capped by the daily budget) and compares it with the spend the campaign could win from forecast inventory. The ratio becomes a <b>throttle</b>: the share of eligible auctions the campaign enters. Behind-pace campaigns get throttle raised toward 100%; ahead-of-pace campaigns are held back. Delivery stops when spend ≥ budget.</div>
  ${panel('Pacing', `<div class="tbl-wrap"><table><thead><tr><th>Campaign</th><th>Status</th><th class="n">Budget</th><th class="n">Spent</th><th class="n">Should have spent</th><th>Pace</th><th class="n">Target / day</th><th class="n">Throttle</th><th>State</th><th></th></tr></thead><tbody>
  ${CAMPAIGNS.map(c=>{ const p=pacing(c); const st=status(c); return `<tr><td><b>${esc(c.name)}</b><div class="muted mono">${c.id} · ${esc(advName(c.adv))}</div></td><td>${pill(st)}</td><td class="n">${fmtINR(c.budget)}</td><td class="n">${fmtINR(c.stats.spend)}</td><td class="n">${fmtINR(p.ideal)}</td>
    <td style="width:140px"><div class="row" style="gap:6px;flex-wrap:nowrap">${bar(p.pace/2,{mark:.5,cls:p.pace<.9?'warn':p.pace>1.1?'bad':''})}<span class="mono">${st==='sched'?'—':pct(p.pace,0)}</span></div></td>
    <td class="n">${st==='ended'||st==='sched'?'—':fmtINR(p.targetDaily)}</td><td class="n">${c.model==='Sponsorship'?'guaranteed':st==='live'||st==='limited'?pct(p.throttle,0):'—'}</td><td>${st==='sched'?'Not started':st==='ended'?'Complete':p.state}</td>
    <td><button class="btn sm ghost" data-act="pause" data-id="${c.id}">${c.paused?'Resume':'Pause'}</button></td></tr>`; }).join('')}</tbody></table></div>`, {pad:false, sub:'Tick marks 100% of ideal spend'})}
  <div class="grid g3">${[['Remaining budget','Spend already committed is subtracted; nothing is allowed past 100% of the budget or daily cap.'],['Available inventory','Forecast unsold impressions matching the campaign\'s audience, pages, devices and geography.'],['Performance feedback','Phase 2: throttle is weighted toward hours and placements with higher CTR while still hitting the daily target.']].map(([t,p])=>`<div class="insight" style="border-left-color:var(--c1)"><b>${t}</b><p>${p}</p></div>`).join('')}</div>`;

/* ---- Advertisers ---- */
VIEWS.advertisers = () => panel('Advertisers', `<div class="tbl-wrap"><table><thead><tr><th>Advertiser</th><th>Type</th><th>KYC</th><th>Status</th><th class="n">Campaigns</th><th class="n">Spend (flight)</th><th class="n">Prepaid balance</th><th class="n">Credit line</th><th>Account owner</th><th>Since</th></tr></thead><tbody>
  ${ADVERTISERS.map(a=>{ const cs=CAMPAIGNS.filter(c=>c.adv===a.id); return `<tr><td><b>${esc(a.name)}</b></td><td>${a.type}</td><td><span class="pill ${a.kyc==='Verified'?'live':'limited'}">${a.kyc}</span></td><td>${a.status}</td><td class="n">${cs.length}</td><td class="n">${fmtINR(sum(cs.map(c=>c.stats.spend)))}</td><td class="n">${fmtINR(a.wallet)}</td><td class="n">${fmtINR(a.credit)}</td><td>${a.owner}</td><td>${dstr(a.since)}</td></tr>`; }).join('')}</tbody></table></div>`, {pad:false, sub:'Self-serve sign-up requires GST, PAN and brand-safety review before first launch'});

/* ---- Inventory management ---- */
VIEWS['inv-admin'] = () => {
  const f=S.invFilter; const rows=INVENTORY.filter(i=>(f.site==='all'||i.site===f.site)&&(f.dev==='all'||i.dev===f.dev)&&(f.kind==='all'||FORMATS[i.fmt].kind===f.kind));
  const m=sum(rows.map(i=>i.imps)), so=sum(rows.filter(i=>i.active).map(i=>i.imps*i.sold));
  return kpis([['Placements',rows.length,`${rows.filter(i=>i.active).length} active`],['Monthly impressions',fmtN(m),''],['Sold',fmtN(so),pct(so/m,1)+' sell-through'],['Unsold',fmtN(m-so),'open for campaigns'],['Weighted floor','₹'+Math.round(sum(rows.map(i=>i.floor*i.imps))/m||0),'CPM']])
  + panel('Placements', `<div class="tbl-wrap" style="max-height:620px;overflow-y:auto"><table><thead><tr><th>Website</th><th>Page type</th><th>Device</th><th>Position</th><th>Format</th><th class="n">Monthly impr.</th><th>Sold</th><th class="n">Floor CPM (₹)</th><th>Active</th></tr></thead><tbody>
   ${rows.map(i=>`<tr><td>${siteTag(i.site)}</td><td>${pageName(i.site,i.pt)}</td><td>${i.dev}</td><td>${i.pos}</td><td class="mono">${i.fmt}</td><td class="n">${fmtN(i.imps)}</td><td style="width:120px"><div class="row" style="gap:6px;flex-wrap:nowrap">${bar(i.sold)}<span class="mono">${pct(i.sold,0)}</span></div></td>
    <td class="n"><input type="number" id="fl-${i.id}" aria-label="Floor CPM" value="${i.floor}" min="10" data-act-change="floor" data-id="${i.id}" style="width:80px;text-align:right;padding:4px 6px"></td>
    <td><input type="checkbox" id="ac-${i.id}" aria-label="Active" ${i.active?'checked':''} data-act-change="inv-active" data-id="${i.id}" style="accent-color:var(--accent)"></td></tr>`).join('')}</tbody></table></div>`,
   {pad:false, actions:`<select aria-label="Website" data-bind="invFilter.site" data-rr="1" style="width:auto"><option value="all">All websites</option>${Object.values(SITES).map(s=>`<option value="${s.id}" ${f.site===s.id?'selected':''}>${s.name}</option>`).join('')}</select>
     <select aria-label="Device" data-bind="invFilter.dev" data-rr="1" style="width:auto">${[['all','All devices'],['desktop','Desktop'],['mobile','Mobile']].map(([v,l])=>`<option value="${v}" ${f.dev===v?'selected':''}>${l}</option>`).join('')}</select>
     <select aria-label="Format type" data-bind="invFilter.kind" data-rr="1" style="width:auto">${[['all','All formats'],['Display','Display'],['Native','Native'],['Rich media','Rich media']].map(([v,l])=>`<option value="${v}" ${f.kind===v?'selected':''}>${l}</option>`).join('')}</select>`});
};
ACT_CHANGE.floor = el => { const i=INVENTORY.find(x=>x.id===el.dataset.id); const old=i.floor; i.floor=Math.max(10,+el.value||old); audit('ops@torque','Admin','Changed floor CPM',`${SITES[i.site].name} · ${pageName(i.site,i.pt)} · ${i.pos} ${i.fmt}: ₹${old} → ₹${i.floor}`); toast('Floor updated to ₹'+i.floor); };
ACT_CHANGE['inv-active'] = el => { const i=INVENTORY.find(x=>x.id===el.dataset.id); i.active=el.checked; audit('ops@torque','Admin',i.active?'Activated placement':'Deactivated placement',`${SITES[i.site].name} · ${pageName(i.site,i.pt)} · ${i.pos}`); render(); };

/* ---- Rate card ---- */
VIEWS.pricing = () => `<div class="grid g2">${panel('Commercial models', `<div class="tbl-wrap"><table><thead><tr><th>Model</th><th>Charged on</th><th>Where it's used</th><th class="n">Guide price</th></tr></thead><tbody>
  ${[['CPM','1,000 viewable impressions','Awareness, launch, audience packages','₹140 – ₹520'],['CPC','Valid click after IVT filtering','Traffic, finance, insurance','₹8 – ₹25'],['CPA / lead','De-duplicated lead or defined conversion','Lead gen, test drives, dealer leads','₹300 – ₹1,200'],['Fixed sponsorship','Flat fee for a time-bound roadblock','Homepage takeover, launch day','₹60K – ₹5L / day'],['Package','Bundle of audience + sites at a set CPM','Mass, Entry, Premium, EV…','see packages'],['Premium placement','Floor × multiplier on high-demand slots','Billboard, masthead, compare pages','1.3× – 2.4×']].map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td class="ink2">${r[2]}</td><td class="n">${r[3]}</td></tr>`).join('')}</tbody></table></div>`, {pad:false})}
  ${panel('Premium multipliers', `<div class="tbl-wrap"><table><thead><tr><th>Placement or context</th><th class="n">Multiplier</th></tr></thead><tbody>${[['Expandable masthead',2.4],['In-article / outstream video',3.0],['Half-page 300x600',1.8],['Billboard 970x250',1.6],['EMI / finance pages',1.4],['Comparison pages',1.35],['Offers pages',1.3],['EV pages',1.3],['Model pages',1.25]].map(([l,m])=>`<tr><td>${l}</td><td class="n mono">${m.toFixed(2)}×</td></tr>`).join('')}</tbody></table></div>`, {pad:false})}</div>
  ${panel('Audience package pricing', `<div class="tbl-wrap"><table><thead><tr><th>Package</th><th>Websites</th><th class="n">Users</th><th class="n">Rate card CPM (₹)</th></tr></thead><tbody>${PACKAGES.map(p=>`<tr><td><b>${p.name}</b><div class="muted" style="font-size:12px">${p.desc}</div></td><td><div class="row" style="gap:4px">${p.sites.map(siteTag).join('')}</div></td><td class="n">${fmtN(estimateAudience(p.aud,p.sites).users)}</td><td class="n"><input type="number" id="pk-${p.id}" aria-label="CPM for ${p.name}" value="${p.cpm}" data-act-change="pkg-cpm" data-id="${p.id}" style="width:90px;text-align:right;padding:4px 6px"></td></tr>`).join('')}</tbody></table></div>`, {pad:false, sub:'Phase 3 adds automated pricing from sell-through and demand'})}`;
ACT_CHANGE['pkg-cpm'] = el => { const p=PACKAGES.find(x=>x.id===el.dataset.id); const o=p.cpm; p.cpm=+el.value||o; audit('ops@torque','Admin','Changed package CPM',`${p.name}: ₹${o} → ₹${p.cpm}`); toast('Rate card updated'); };

/* ---- Ad server simulator ---- */
const SIM_BRANDS = { car:['Maruti','Hyundai','Tata','Mahindra','Kia','Toyota','Honda','MG','BMW','Mercedes'], bike:['Hero','Honda','TVS','Bajaj','RE','KTM','Ather','OlaE'] };
const SIM_MODELS = { car:['','Creta','Nexon','XUV700','ScorpioN','Seltos','Brezza','Swift','GrandVitara','City','Fortuner'], bike:['','Classic350','Apache','Activa','Rizta'] };
VIEWS.adserver = () => {
  const q=S.sim; if (q.site==='cd') q.vehicle='car'; if (q.site==='bd') q.vehicle='bike'; const veh=q.vehicle; const res=S.simResult;
  const pts = PAGE_TYPES[q.site]; if (!pts.some(p=>p[0]===q.pt)) q.pt=pts[0][0];
  if (!SIM_BRANDS[veh].includes(q.brand)) q.brand=SIM_BRANDS[veh][0];
  if (!SIM_MODELS[veh].includes(q.model)) q.model='';
  const bk = Object.keys(DIMS[veh==='car'?'body_car':'body_bike'].vals); if (!bk.includes(q.body)) q.body=bk[0];
  q.price = veh==='car'? clamp(q.price,3,120) : clamp(q.price,.5,12);
  const form = `<div class="stack">
    <div class="grid g2" style="gap:10px">
      <label class="f" for="sq-site">Website<select id="sq-site" data-bind="sim.site" data-rr="1">${Object.values(SITES).map(s=>`<option value="${s.id}" ${q.site===s.id?'selected':''}>${s.name}</option>`).join('')}</select></label>
      <label class="f" for="sq-pt">Page<select id="sq-pt" data-bind="sim.pt" data-rr="1">${pts.map(p=>`<option value="${p[0]}" ${q.pt===p[0]?'selected':''}>${p[1]}</option>`).join('')}</select></label>
      <label class="f" for="sq-veh">Vehicle on page<select id="sq-veh" data-bind="sim.vehicle" data-rr="1"><option value="car" ${veh==='car'?'selected':''}>Car</option><option value="bike" ${veh==='bike'?'selected':''}>Two-wheeler</option></select></label>
      <label class="f" for="sq-price">Ex-showroom price: ₹${q.price} lakh<input id="sq-price" type="range" min="${veh==='car'?3:.5}" max="${veh==='car'?120:12}" step="${veh==='car'?1:.1}" value="${q.price}" data-bind="sim.price" data-live="1"></label>
      <label class="f" for="sq-body">Body / category<select id="sq-body" data-bind="sim.body" data-rr="1">${Object.keys(DIMS[veh==='car'?'body_car':'body_bike'].vals).filter(v=>v!=='Premium').map(v=>`<option ${q.body===v?'selected':''}>${v}</option>`).join('')}</select></label>
      <label class="f" for="sq-fuel">Fuel<select id="sq-fuel" data-bind="sim.fuel" data-rr="1">${Object.keys(DIMS.fuel.vals).map(v=>`<option ${q.fuel===v?'selected':''}>${v}</option>`).join('')}</select></label>
      <label class="f" for="sq-brand">Brand<select id="sq-brand" data-bind="sim.brand" data-rr="1">${SIM_BRANDS[veh].map(v=>`<option value="${v}" ${q.brand===v?'selected':''}>${dimLabel('brand',v)}</option>`).join('')}</select></label>
      <label class="f" for="sq-model">Model<select id="sq-model" data-bind="sim.model" data-rr="1">${SIM_MODELS[veh].map(v=>`<option value="${v}" ${q.model===v?'selected':''}>${v?dimLabel('model',v):'— none —'}</option>`).join('')}</select></label>
      <label class="f" for="sq-dev">Device<select id="sq-dev" data-bind="sim.device" data-rr="1"><option ${q.device==='mobile'?'selected':''}>mobile</option><option ${q.device==='desktop'?'selected':''}>desktop</option></select></label>
      <label class="f" for="sq-geo">City (from IP, coarse)<select id="sq-geo" data-bind="sim.geo" data-rr="1">${GEOS.map(g=>`<option ${q.geo===g?'selected':''}>${g}</option>`).join('')}</select></label>
      <label class="f" for="sq-mkt">Market<select id="sq-mkt" data-bind="sim.market" data-rr="1"><option value="new" ${q.market==='new'?'selected':''}>New</option><option value="used" ${q.market==='used'?'selected':''}>Used</option></select></label>
      <label class="f" for="sq-ck">Browser ID (hashed before use)<input id="sq-ck" type="text" data-bind="sim.cookie" value="${esc(q.cookie)}"></label></div>
    <div class="f"><span>Recent activity in session</span>${chips('sim.intents',Object.entries(DIMS.intent.vals).map(([k,[l]])=>[k,l]),q.intents)}</div>
    <label class="chk" for="sq-rep"><input id="sq-rep" type="checkbox" data-bind="sim.repeat" data-rr="1" ${q.repeat?'checked':''}> Repeat visitor (seen in last 30 days)</label>
    <div class="row"><button class="btn pri" data-act="serve">Request ad</button><button class="btn" data-act="serve5">Request 5× (watch frequency cap)</button><button class="btn" data-act="bulk">Simulate 10,000 page views</button></div></div>`;
  let out = `<div class="note">Set up a page view and request an ad. The engine classifies the context into cohorts, filters every campaign through 12 checks, ranks the survivors and returns a winner.</div>`;
  if (res){
    const a=res.attrs; const cohortChips = Object.entries(a).filter(([k,v])=>DIMS[k]&&v.length&&k!=='recency').map(([k,v])=>v.map(x=>`<span class="tag">${dimLabel(k,x)}</span>`).join(' ')).join(' ');
    const w=res.win;
    out = `<div class="pipe">
      <div class="st"><span class="eyebrow">1 · Page view</span><b>${SITES[q.site].name} · ${pageName(q.site,q.pt)}</b><span>${q.device} · ${q.geo}</span></div>
      <div class="st"><span class="eyebrow">2 · Vehicle context</span><b>${dimLabel('brand',q.brand)} ${q.model?dimLabel('model',q.model).split(' ').slice(1).join(' '):''}</b><span>₹${q.price}L · ${q.body} · ${q.fuel}</span></div>
      <div class="st"><span class="eyebrow">3 · Classification</span><b>${dimLabel(veh==='car'?'price_car':'price_bike',(a.price_car||a.price_bike)[0])}</b><span>${dimLabel('intent_lvl',a.intent_lvl[0])}</span></div>
      <div class="st"><span class="eyebrow">4 · Eligible</span><b>${res.eligible.length} of ${res.rows.length} campaigns</b><span>after 12 checks</span></div>
      <div class="st"><span class="eyebrow">5 · Decision</span><b>${w?esc(w.c.id):'No fill'}</b><span>${res.ms.toFixed(2)} ms in-browser</span></div></div>
     <div><div class="eyebrow" style="margin-bottom:6px">Cohorts assigned to <span class="mono" style="text-transform:none">${res.uid}</span></div><div class="row" style="gap:5px">${cohortChips}</div></div>
     ${w?`<div class="grid g2" style="align-items:center"><div class="stack" style="gap:6px"><div class="eyebrow">Winning ad</div><b style="font-size:15px">${esc(w.c.name)}</b><span class="muted">${esc(advName(w.c.adv))} · ${w.c.model} · eCPM ₹${Math.round(w.ecpm)} · priority ${w.c.priority}${w.c.priority>=10?' (sponsorship — always wins)':''}</span><span class="mono muted">Frequency today: ${FREQ.get(`${res.uid}|${w.c.id}|${iso(TODAY)}`)||0} / ${w.c.freq.n}</span></div><div style="overflow:hidden">${creativeHTML(w.c.creative, q.device==='mobile'?'300x250':'300x250',.8)}</div></div>`:`<div class="note warn">No eligible campaign — the slot falls back to house ads or programmatic backfill.</div>`}`;
  }
  const trace = res ? panel('Decision trace', `<div class="tbl-wrap"><table class="trace"><thead><tr><th>Campaign</th><th>Result</th><th>Deciding check</th><th class="n">eCPM</th><th class="n">Score</th></tr></thead><tbody>${res.rows.slice().sort((x,y)=>y.score-x.score||(y.checks.length-x.checks.length)).map(r=>{ const lastFail=r.checks.find(c=>!c[1]); const aud=r.checks.find(c=>c[0]==='Audience');
    return `<tr class="${res.win&&r.c===res.win.c?'winner':''}"><td><b>${esc(r.c.name)}</b><div class="muted mono">${r.c.id}</div></td><td>${r.ok?(res.win&&r.c===res.win.c?'<span class="ok">✓ Won</span>':'<span class="ok">✓ Eligible</span>'):'<span class="no">✕ Filtered</span>'}</td>
      <td style="font-size:12px">${lastFail?`<b>${lastFail[0]}:</b> ${esc(lastFail[2])}`:`${aud?`<b>Audience:</b> ${esc(aud[2])}`:''}`}<div class="muted">${r.checks.filter(c=>c[1]).length} checks passed</div></td><td class="n">₹${Math.round(r.ecpm)}</td><td class="n">${r.ok?(r.score>=1e9?'∞':Math.round(r.score)):'—'}</td></tr>`; }).join('')}</tbody></table></div>`, {pad:false, sub:'Status → Flight → Website → Page → Device → Geo → Format → Audience → Budget → Daily cap → Frequency → Pacing, then rank by eCPM × priority'}) : '';
  const b=S.bulk;
  const bulk = b ? panel('10,000 simulated page views', `${kpis([['Ad requests',fmtN(b.n),''],['Filled by direct campaigns',fmtN(b.filled),pct(b.filled/b.n,1)+' of requests'],['Revenue',fmtINR(b.rev),'eCPM ₹'+Math.round(b.rev/b.filled*1000||0)],['Latency p50',b.p50.toFixed(3)+' ms','decision only'],['Latency p99',b.p99.toFixed(3)+' ms','decision only'],['Frequency-capped',fmtN(b.capped),'moved to next campaign']])}
     <div class="note" style="margin-top:14px">Only the 8 sample campaigns compete here, and pacing deliberately holds each one back to its daily target — so most requests fall through to programmatic backfill or house ads. With a full order book, direct fill rises and the same throttles keep every campaign on pace.</div><div class="grid g2" style="margin-top:14px"><div><div class="eyebrow" style="margin-bottom:8px">Impressions won</div>${hbars(b.wins.map(([id,n])=>[id,n]))}</div><div><div class="eyebrow" style="margin-bottom:8px">Why requests were filtered (all campaigns)</div>${hbars(b.reasons.slice(0,7),{color:'var(--c3)'})}</div></div>`) : '';
  return `<div class="grid" style="grid-template-columns:minmax(0,380px) minmax(0,1fr);align-items:start" id="sim-grid">${panel('Page view', form)}<div class="stack" style="gap:16px">${panel('Result', `<div class="stack">${out}</div>`)}${trace}</div></div>${bulk}`;
};
ACT.serve = () => { S.simResult = decide(S.sim); render(); };
ACT.serve5 = () => { for (let i=0;i<5;i++) S.simResult = decide(S.sim); render(); toast('Served 5 requests to the same browser — frequency caps now visible in the trace'); };
ACT.bulk = () => {
  const r=rng('bulk'+Date.now()); const N=10000; let filled=0, rev=0, capped=0; const times=[], wins={}, reasons={};
  const pick = (arr,w)=>{ let x=r()*sum(w); for (let i=0;i<arr.length;i++){ x-=w[i]; if(x<=0) return arr[i]; } return arr[arr.length-1]; };
  for (let i=0;i<N;i++){
    const site=pick(['cd','bd','zw'],[SITES.cd.pv,SITES.bd.pv,SITES.zw.pv]); const veh = site==='cd'?'car':site==='bd'?'bike':(r()<.68?'car':'bike');
    const pt=pick(PAGE_TYPES[site].map(p=>p[0]),PAGE_TYPES[site].map(p=>p[2]));
    const priceKeys = veh==='car'? DIMS.price_car.vals : DIMS.price_bike.vals; const pb=pick(Object.keys(priceKeys),Object.values(priceKeys).map(v=>v[1]));
    const priceMap = veh==='car'? {'u5':4,'5-10':7.5,'10-15':12,'15-20':17,'20-30':24,'30-50':38,'50+':75} : {'u1':.8,'1-2':1.4,'2-3':2.4,'3-5':3.8,'5+':7};
    const bodies = veh==='car'? DIMS.body_car.vals : DIMS.body_bike.vals; const body=pick(Object.keys(bodies).filter(b=>b!=='Premium'),Object.entries(bodies).filter(([b])=>b!=='Premium').map(([,v])=>v[1]));
    const fuel=pick(Object.keys(DIMS.fuel.vals),Object.values(DIMS.fuel.vals).map(v=>v[1]));
    const intents=Object.entries(DIMS.intent.vals).filter(([,v])=>r()<v[1]).map(([k])=>k);
    const req={site, pt, vehicle:veh, price:priceMap[pb], body, fuel, brand:pick(SIM_BRANDS[veh],SIM_BRANDS[veh].map(()=>1)), model:'', market: pt==='used'||r()<.2?'used':'new', intents, device:r()<.78?'mobile':'desktop', geo:pick(GEOS,GEO_SHARE), tier:'metro', repeat:r()<.41, cookie:'sim-'+Math.floor(r()*2500)};
    const d=decide(req,{rand:r}); times.push(d.ms);
    if (d.win){ filled++; wins[d.win.c.id]=(wins[d.win.c.id]||0)+1; rev += d.win.c.model==='Sponsorship'? 190/1000 : d.win.ecpm/1000; }
    d.rows.forEach(x=>{ const f=x.checks.find(c=>!c[1]); if (f){ reasons[f[0]]=(reasons[f[0]]||0)+1; if (f[0]==='Frequency') capped++; } });
  }
  times.sort((a,b)=>a-b);
  S.bulk={n:N, filled, rev, capped, p50:times[Math.floor(N*.5)], p99:times[Math.floor(N*.99)], wins:Object.entries(wins).sort((a,b)=>b[1]-a[1]), reasons:Object.entries(reasons).sort((a,b)=>b[1]-a[1])};
  audit('ops@torque','Admin','Ran delivery simulation',`10,000 requests · ${pct(filled/N,1)} fill`); render(); toast('Simulation complete');
};

/* ---- Audience engine ---- */
VIEWS['audience-engine'] = () => {
  const sites=['cd','bd','zw'];
  const rowsCar = Object.entries(DIMS.price_car.vals).map(([k,[l]])=>[l,...sites.map(s=>SITES[s].car? estimateAudience({groups:[{rules:[{dim:'price_car',vals:[k]}]}]},[s]).users:0)]);
  const rowsBike = Object.entries(DIMS.price_bike.vals).map(([k,[l]])=>[l,...sites.map(s=>SITES[s].bike? estimateAudience({groups:[{rules:[{dim:'price_bike',vals:[k]}]}]},[s]).users:0)]);
  const tbl=(title,rows)=>`<div class="tbl-wrap"><table><thead><tr><th>${title}</th>${sites.map(s=>`<th class="n">${SITES[s].name}</th>`).join('')}<th class="n">All (de-dup)</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r[0]}</td>${r.slice(1).map(v=>`<td class="n">${v?fmtN(v):'—'}</td>`).join('')}<td class="n"><b>${fmtN(sum(r.slice(1))*.82)}</b></td></tr>`).join('')}</tbody></table></div>`;
  return `<div class="pipe">${[['Collect','Page view + vehicle context','consent-gated tag'],['Enrich','Price, body, fuel, brand, model','from catalogue by model ID'],['Classify','Signals → cohort flags','streaming, &lt;2s'],['Aggregate','Rolling 7/14/30-day windows','per hashed ID'],['Serve','Cohort IDs in edge profile store','read in &lt;1ms'],['Report','Counts only, k ≥ '+K_ANON,'advertisers never see IDs']].map(([a,b,c],i)=>`<div class="st"><span class="eyebrow">${i+1} · ${a}</span><b>${b}</b><span>${c}</span></div>`).join('')}</div>
  <div class="grid g2">${panel('Car price cohorts', tbl('Price segment',rowsCar), {pad:false, sub:'30-day users'})}${panel('Bike price cohorts', tbl('Price segment',rowsBike), {pad:false, sub:'ZigWheels splits by the vehicle being viewed'})}</div>
  <div class="grid g2">${panel('Classification rules', `<div class="tbl-wrap"><table><thead><tr><th>Cohort</th><th>Rule</th></tr></thead><tbody>${[
    ['Price segment','Ex-showroom price of the model viewed; a user can hold up to 3 segments, weighted by recency'],
    ['Body type / EV','Catalogue attribute of viewed models; EV = electric powertrain'],
    ['Luxury / Premium','Car ≥ ₹50L or luxury brand · Bike ≥ ₹3L'],
    ['Used-car shopper','Visited used-car listing or valuation pages'],
    ['Brand / model audience','≥ 2 views of the brand or model in 30 days'],
    ['Competitor consideration','Viewed ≥ 2 models of different brands in the same segment within 14 days'],
    ['Comparing vehicles','Used a comparison page or added ≥ 2 models to compare'],
    ['High intent','≥ 2 of: on-road price, EMI tool, offers, dealer locator, test drive — or 1 plus a repeat visit'],
    ['Lead submitters','Submitted any lead form (flag only; lead details never leave the lead system)'],
    ['Repeat visitor','≥ 2 sessions in 30 days'],
  ].map(r=>`<tr><td><b>${r[0]}</b></td><td class="ink2">${r[1]}</td></tr>`).join('')}</tbody></table></div>`, {pad:false})}
  ${panel('Signal volume (last 30 days)', hbars(Object.entries(DIMS.intent.vals).map(([k,[l,s]])=>[l, sitePool(sites,'any')*s])), {sub:'users with the signal'})}</div>`;
};

/* ---- Architecture ---- */
VIEWS.arch = () => `<div class="pipe">${['Page view','Vehicle context','Audience classification','Cohort','Eligible campaigns','Ad impression','Click','Conversion'].map((s,i)=>`<div class="st"><span class="eyebrow">${i+1}</span><b>${s}</b></div>`).join('')}</div>
  <div class="grid g2">${panel('Services', `<div class="tbl-wrap"><table><tbody>${[
    ['Advertiser management','Accounts, users, roles, KYC, wallets','Postgres'],
    ['Campaign management','Campaigns, line items, targeting, flights','Postgres'],
    ['Audience engine','Stream classifier + cohort store','Kafka · Flink · Redis/Aerospike'],
    ['Inventory management','Sites, page types, placements, floors','Postgres'],
    ['Ad server','Decision API at the edge','Go/Rust · in-memory index'],
    ['Creative management','Upload, transcode, review, CDN','Object store · CDN'],
    ['Budget & pacing','Spend counters, throttle every 5 min','Redis · worker'],
    ['Frequency capping','Per hashed ID × campaign × day','Redis (TTL 48h)'],
    ['Reporting','Aggregates by cohort, site, device, geo','ClickHouse'],
    ['Billing','Invoices, GST, wallet debits','Postgres · ledger'],
    ['Admin console','Yield, inventory, governance','Web app'],
  ].map(r=>`<tr><td><b>${r[0]}</b></td><td class="ink2">${r[1]}</td><td class="mono muted">${r[2]}</td></tr>`).join('')}</tbody></table></div>`, {pad:false})}
  ${panel('Ad decision latency budget', `<div class="tbl-wrap"><table><thead><tr><th>Step</th><th class="n">Target</th></tr></thead><tbody>${[['Edge receive + parse','2 ms'],['Profile lookup (cohorts, freq)','3 ms'],['Candidate lookup (inverted index by site × page × cohort)','1 ms'],['Filters + pacing + rank','2 ms'],['Response + creative URL','2 ms'],['Total p99 at edge','≤ 15 ms']].map(r=>`<tr><td>${r[0]}</td><td class="n mono">${r[1]}</td></tr>`).join('')}</tbody></table></div>
    <div class="body"><pre class="code">POST /v1/decide
{ "site":"cd", "page":"model", "slot":"cd-model-m-300x250",
  "ctx":{ "model_id":"creta-2026", "price_lakh":18 },
  "device":"mobile", "geo":"Delhi NCR", "uid":"u_9c1e…" }
→ 200 { "campaign":"C-1041", "creative":"cr_88…",
        "imp_url":"/i?t=…", "click_url":"/c?t=…" }</pre></div>`, {pad:false})}</div>`;

/* ---- Privacy & audit ---- */
VIEWS.privacy = () => { const g=S.gov;
  return `<div class="grid g2">${panel('Data governance controls', `<div class="stack">
    <div class="grid g2" style="gap:10px"><label class="f" for="gv-k">Minimum audience size (users)<input id="gv-k" type="number" data-bind="gov.k" value="${g.k}"></label>
    <label class="f" for="gv-rk">Minimum report row (impressions)<input id="gv-rk" type="number" data-bind="gov.repK" value="${g.repK}"></label>
    <label class="f" for="gv-ret">Raw event retention (days)<input id="gv-ret" type="number" data-bind="gov.retention" value="${g.retention}"></label>
    <label class="f" for="gv-agg">Aggregate report retention (months)<input id="gv-agg" type="number" data-bind="gov.aggRetention" value="${g.aggRetention}"></label></div>
    <label class="chk" for="gv-c"><input id="gv-c" type="checkbox" data-bind="gov.consent" ${g.consent?'checked':''}> Only build cohorts for users who gave consent in the CMP (DPDP Act 2023 notice + consent)</label>
    <label class="chk" for="gv-g"><input id="gv-g" type="checkbox" data-bind="gov.gpc" ${g.gpc?'checked':''}> Honour opt-out and withdrawal within 24 hours; purge cohort flags</label>
    <label class="chk" for="gv-s"><input id="gv-s" type="checkbox" data-bind="gov.sensitive" ${g.sensitive?'checked':''}> Block sensitive inferences (health, religion, caste, finances beyond vehicle budget)</label>
    <button class="btn pri" data-act="save-gov" style="align-self:flex-start">Save controls</button></div>`)}
  ${panel('What advertisers can and cannot see', `<div class="grid g2" style="gap:14px"><div><div class="eyebrow" style="color:var(--good);margin-bottom:6px">Available</div><ul style="margin:0;padding-left:18px;font-size:13px;display:flex;flex-direction:column;gap:4px"><li>Predefined or approved cohorts</li><li>Audience size estimates (rounded)</li><li>Aggregated delivery and performance</li><li>Conversions they define, counted in aggregate</li></ul></div>
     <div><div class="eyebrow" style="color:var(--bad);margin-bottom:6px">Never shared</div><ul style="margin:0;padding-left:18px;font-size:13px;display:flex;flex-direction:column;gap:4px"><li>Name, phone number, email</li><li>Individual browsing history</li><li>Individual user identity or IDs</li><li>Row-level logs or cohort exports</li></ul></div></div>
     <div class="note" style="margin-top:14px">Role-based access: Advertiser users see only their own account. Ad Ops can edit inventory and pricing. Only the Data Governance role can change the controls on the left; every change is written to the audit log.</div>`)}</div>
  ${panel('Audit log', `<div class="tbl-wrap" style="max-height:420px;overflow-y:auto"><table><thead><tr><th>Time (IST)</th><th>Actor</th><th>Role</th><th>Action</th><th>Detail</th></tr></thead><tbody>${AUDIT.map(r=>`<tr><td class="mono">${r[0]}</td><td class="mono">${esc(r[1])}</td><td><span class="tag">${r[2]}</span></td><td><b>${esc(r[3])}</b></td><td class="ink2">${esc(r[4])}</td></tr>`).join('')}</tbody></table></div>`, {pad:false, sub:'append-only, retained 7 years'})}`; };
ACT['save-gov'] = () => { audit('dpo@torque','Governance','Updated data controls',`k=${S.gov.k}, report k=${S.gov.repK}, retention=${S.gov.retention}d, consent=${S.gov.consent}`); toast('Controls saved and logged'); render(); };

/* model switch sets sensible default bid */
const _set = ACT.set; ACT.set = el => { if (el.dataset.path==='draft.model'){ S.draft.bid = {CPM:260,CPC:12,CPL:450,Sponsorship:400000}[el.dataset.val]; } _set(el); };

/* boot */
S.simResult = decide(S.sim, {rand:()=>0.1});
/* first render happens at the end of 06_channels.js */
