/* =================== ADVERTISER CONSOLE =================== */
function newDraft(extra={}){
  return Object.assign({ name:'Apex Terrain — Festive push', adv:S.advId, objective:'Awareness', sites:['cd','zw'], audSrc:'package', audienceName:'SUV Audience', audience:clone(PACKAGES[5].aud),
    pageTypes:['model','compare','carpages'], devices:['mobile','desktop'], formats:['300x250','970x250','native','320x100'], geos:[],
    start:'2026-10-01', end:'2026-10-30', budget:1000000, daily:40000, model:'CPM', bid:260, freq:{n:3,per:'day'}, priority:5, paused:false,
    creative:{type:'banner', headline:'The Terrain. Built for every road.', sub:'Ex-showroom from ₹21.9L*', cta:'Book a test drive', c1:'#1B2B3A', c2:'#0A6F6A', url:'https://example.com/terrain', img:null}, pvFmt:'300x250' }, extra);
}

/* ---- Campaigns ---- */
VIEWS.campaigns = () => {
  const list = myCampaigns();
  const act = list.filter(c=>['live','limited'].includes(status(c)));
  const tot = k => sum(list.map(c=>c.stats[k]));
  const imps=tot('imps'), clicks=tot('clicks');
  const q=(S.campQ||'').toLowerCase();
  const filt = list.filter(c=> (S.campFilter==='all' || (S.campFilter==='live' ? ['live','limited'].includes(status(c)) : status(c)===S.campFilter)) && (!q || (c.name+' '+c.id+' '+c.audienceName).toLowerCase().includes(q)));
  S.sel = S.sel.filter(id=>filt.some(c=>c.id===id));
  const ft = k => sum(filt.map(c=>c.stats[k]));
  const allSel = filt.length && S.sel.length===filt.length;
  return kpis([
    ['Active campaigns', act.length, `${list.length} total`],
    ['Cost (flight to date)', fmtINR(tot('spend')), `of ${fmtINR(sum(list.map(c=>c.budget)))} booked`],
    ['Impressions', fmtN(imps), `${fmtN(tot('reach'))} unique users`],
    ['Clicks', fmtN(clicks), pct(clicks/imps,2)+' CTR'],
    ['Conversions', fmtN(tot('conv')), pct(tot('conv')/clicks,1)+' conv. rate'],
  ]) + `<section class="panel">
   <div class="tbar"><div class="filter"><span class="msi">filter_alt</span><input id="camp-q" type="text" placeholder="Add filter" aria-label="Filter campaigns" value="${esc(S.campQ)}" data-bind="campQ" data-live="1"></div>
     <button class="btn pri" data-act="new-camp"><span class="msi s20">add</span>New campaign</button><span class="vdiv"></span>
     <button class="tool" data-act="go" data-v="reports"><span class="msi">bar_chart</span><span>Reports</span></button>
     <button class="tool" data-act="go" data-v="inventory"><span class="msi">query_stats</span><span>Forecast</span></button></div>
   ${S.sel.length?`<div class="selbar"><b>${S.sel.length} selected</b><span style="flex:1"></span><button class="btn sm" data-act="bulk-state" data-v="pause"><span class="msi s18">pause</span>Pause</button><button class="btn sm" data-act="bulk-state" data-v="enable"><span class="msi s18">play_arrow</span>Enable</button><button class="btn sm ghost" data-act="sel-none">Clear</button></div>`:''}
   <div class="tbl-wrap"><table><thead><tr><th class="cb"><input type="checkbox" id="sel-all" aria-label="Select all" ${allSel?'checked':''} data-act-change="sel-all"></th><th style="min-width:230px">Campaign</th><th>Status</th><th class="n">Budget</th><th>Websites</th><th>Audience</th><th style="min-width:170px">Pacing</th><th class="n m" title="Number of times your ad was shown">Impr.</th><th class="n m" title="Clicks">Clicks</th><th class="n m" title="Clicks ÷ impressions">CTR</th><th class="n m" title="Average cost per click">Avg. CPC</th><th class="n m" title="Total spend">Cost</th><th class="n m" title="Leads and defined conversions">Conversions</th></tr></thead><tbody>
    <tr class="total"><td class="cb"></td><td colspan="3">Total: ${S.campFilter==='all'&&!q?'All campaigns':'Filtered campaigns'}</td><td></td><td></td><td></td><td class="n">${fmtN(ft('imps'))}</td><td class="n">${fmtN(ft('clicks'))}</td><td class="n">${pct(ft('clicks')/ft('imps')||0,2)}</td><td class="n">${ft('clicks')?'₹'+(ft('spend')/ft('clicks')).toFixed(2):'—'}</td><td class="n">${fmtINR(ft('spend'))}</td><td class="n">${fmtN(ft('conv'))}</td></tr>
    ${filt.map(c=>{ const st=status(c), p=pacing(c); const fr=p.f.total? p.f.elapsed/p.f.total:0;
      return `<tr><td class="cb"><input type="checkbox" id="sel-${c.id}" aria-label="Select ${esc(c.name)}" ${S.sel.includes(c.id)?'checked':''} data-act-change="sel-one" data-id="${c.id}"></td>
      <td><button class="cname" data-act="open-rep" data-id="${c.id}">${esc(c.name)}</button><div class="muted" style="font-size:12.5px">${c.id} · ${esc(c.objective)}${typeof chIcons==='function'?chIcons(c):''}</div></td>
      <td>${pill(st)}</td><td class="n">${fmtINRx(c.daily)}/day</td><td><div class="row" style="gap:4px;flex-wrap:nowrap">${c.sites.map(siteTag).join('')}</div></td>
      <td style="max-width:190px">${esc(c.audienceName)}</td>
      <td><div class="row" style="justify-content:space-between;font-size:12.5px;gap:6px"><span>${fmtINR(c.stats.spend)} / ${fmtINR(c.budget)}</span><span class="muted">${st==='sched'?'starts '+dstr(c.start):p.state.split(' —')[0]}</span></div>${bar(c.stats.spend/c.budget,{mark:fr,cls:p.pace<.9&&st!=='sched'?'warn':''})}</td>
      <td class="n">${fmtN(c.stats.imps)}</td><td class="n">${fmtN(c.stats.clicks)}</td><td class="n">${pct(c.stats.ctr,2)}</td><td class="n">${c.stats.clicks?'₹'+(c.stats.spend/c.stats.clicks).toFixed(2):'—'}</td><td class="n">${fmtINR(c.stats.spend)}</td><td class="n">${fmtN(c.stats.conv)}</td></tr>`; }).join('') || `<tr><td></td><td colspan="12" class="muted">No campaigns match this view.</td></tr>`}
    </tbody></table></div></section>
    <p class="muted" style="margin:0;font-size:12.5px">The black tick on each pacing bar marks where spend should be today.</p>`;
};
ACT_CHANGE['sel-one'] = el => { const id=el.dataset.id; const i=S.sel.indexOf(id); el.checked? (i<0&&S.sel.push(id)) : (i>=0&&S.sel.splice(i,1)); render(); };
ACT_CHANGE['sel-all'] = el => { S.sel = el.checked ? $$ids() : []; render(); };
const $$ids = () => [...document.querySelectorAll('[data-act-change="sel-one"]')].map(x=>x.dataset.id);
ACT['sel-none'] = () => { S.sel=[]; render(); };
ACT['bulk-state'] = el => { const p = el.dataset.v==='pause'; S.sel.forEach(id=>{ const c=CAMPAIGNS.find(x=>x.id===id); c.paused=p; audit('marketing@'+advName(c.adv).split(' ')[0].toLowerCase(),'Advertiser',p?'Paused campaign':'Enabled campaign',c.id+' · '+c.name); }); toast(`${S.sel.length} campaign${S.sel.length>1?'s':''} ${p?'paused':'enabled'}`); S.sel=[]; render(); };
ACT['open-rep'] = el => { S.rep.cid = el.dataset.id; go('reports'); };
ACT.pause = el => { const c=CAMPAIGNS.find(x=>x.id===el.dataset.id); c.paused=!c.paused; audit(S.console==='adv'?'marketing@'+advName(c.adv).split(' ')[0].toLowerCase():'ops@torque', S.console==='adv'?'Advertiser':'Admin', c.paused?'Paused campaign':'Resumed campaign', c.id+' · '+c.name); toast(c.paused?'Campaign paused':'Campaign resumed'); render(); };

/* ---- Create campaign wizard ---- */
const OBJECTIVES = [['Awareness','Maximise reach among in-market automotive users.'],['Traffic','Drive visits to your site or model page.'],['Engagement','Video views, carousel swipes and rich-media interactions.'],['Lead Generation','Collect enquiries through your form or ours.'],['Product/Model Launch','High-impact placements and roadblocks for a launch window.'],['Test Drive','Drive test-drive bookings near your dealers.'],['Dealer Lead Generation','Local leads routed to specific dealerships.']];
const WIZ = ['Objective','Websites','Audience','Inventory','Budget','Frequency','Creative','Review'];
VIEWS.create = () => {
  if (!S.draft) S.draft = newDraft();
  const d = S.draft;
  const steps = `<div class="steps" role="tablist">${WIZ.map((w,i)=>`<button role="tab" data-act="wiz" data-i="${i}" ${i===S.wiz?'aria-current="step"':''} class="${i<S.wiz?'done':''}"><span class="k">${i<S.wiz?'<span class="msi s18">check</span>':i+1}</span>${w}</button>`).join('')}</div>`;
  const body = WIZ_STEPS[S.wiz](d);
  const nav = `<div class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding:12px 16px"><button class="btn" data-act="wiz" data-i="${S.wiz-1}" ${S.wiz===0?'disabled':''}>← Back</button>
    ${S.wiz<WIZ.length-1?`<button class="btn pri" data-act="wiz" data-i="${S.wiz+1}">Continue: ${WIZ[S.wiz+1]} →</button>`:`<button class="btn pri" data-act="launch" ${forecast(d).ok?'':'disabled'}>Launch campaign</button>`}</div>`;
  return `<div class="grid g-side"><section class="panel">${steps}<div class="body stack" style="gap:16px">${body}</div>${nav}</section><aside class="panel reach-card" id="fc">${forecastPanel()}</aside></div>`;
};
ACT.wiz = el => { const i=+el.dataset.i; if (i<0||i>=WIZ.length) return; if (S.wiz===1 && !S.draft.sites.length){ toast('Select at least one website'); return; } S.wiz=i; render(); };
ACT.launch = () => {
  const d=S.draft; const id='C-'+(1048+CAMPAIGNS.length-8);
  const c = Object.assign(clone(d), {id, adv:S.advId}); c.stats={spend:0,imps:0,clicks:0,conv:0,ctr:.01,videoViews:0,todaySpend:0,reach:0};
  CAMPAIGNS.unshift(c); audit('marketing@'+advName(S.advId).split(' ')[0].toLowerCase(),'Advertiser','Created campaign',`${id} · ${d.name} · ${fmtINR(d.budget)} ${d.model}`);
  S.draft=null; S.wiz=0; toast(`${id} submitted — creative review usually takes under 4 hours`); go('campaigns');
};

function forecastPanel(){
  const d=S.draft; if (!d) return '';
  const f=forecast(d);
  const verdict = !f.ok ? `<div class="note bad">This audience has fewer than ${K_ANON.toLocaleString('en-IN')} users. Broaden it — narrow audiences can't be targeted, to protect user privacy.</div>`
    : d.model==='Sponsorship' ? `<div class="note good">Fixed sponsorship: ${fmtN(f.deliverable)} impressions available on the selected placements for the flight.</div>`
    : f.canDeliver ? `<div class="note good">Deliverable. Your budget buys ~${fmtN(f.budgetImps)} impressions and ${fmtN(f.deliverable)} are available.</div>`
    : `<div class="note warn">At risk: budget needs ~${fmtN(f.budgetImps)} impressions but only ~${fmtN(f.deliverable)} are available. Add websites, pages or formats, relax frequency, or lower the budget.</div>`;
  const rows = [['Selected audience', esc(d.audienceName)],['Available users', fmtN(f.users)],['Available monthly impressions', fmtN(f.availMonthly)],['Selected inventory', `${f.invCount} placements on ${d.sites.map(s=>SITES[s].name).join(', ')}`],['Estimated reach', fmtN(f.estReach)],['Estimated impressions', fmtN(f.estImps)],['Flight', `${f.days} days · ${dstr(d.start)} – ${dstr(d.end)}`]];
  return `<header><h2>Delivery forecast</h2><span class="sp"></span><span class="sub">updates live</span></header><div class="body stack">
    <div><div class="eyebrow">Estimated reach</div><div class="big">${fmtN(f.estReach)}</div><div class="muted" style="font-size:12px">of ${fmtN(f.users)} users in this audience</div></div>
    <div class="funnel">${rows.map(([l,v])=>`<div class="fr"><span class="muted">${l}</span><b style="text-align:right;font-variant-numeric:tabular-nums">${v}</b></div>`).join('')}</div>
    <div class="funnel"><div class="fr"><span class="muted">Budget covers</span><span class="mono">${d.model==='Sponsorship'?'fixed':fmtN(f.budgetImps)} impr.</span>${bar(d.model==='Sponsorship'?1:Math.min(1,f.deliverable/f.budgetImps), {cls: f.canDeliver?'':'warn'})}</div></div>
    ${verdict}
    <p class="muted" style="font-size:11.5px;margin:0">Audience sizes are 30-day de-duplicated users across the selected sites. Advertisers only ever see aggregated counts.</p></div>`;
}

const WIZ_STEPS = [
  d => `<label class="f" for="d-name">Campaign name<input id="d-name" type="text" data-bind="draft.name" value="${esc(d.name)}"></label>
    <div><div class="eyebrow" style="margin-bottom:8px">Objective</div><div class="opt-grid">${OBJECTIVES.map(([o,t])=>`<button class="opt" data-act="set" data-path="draft.objective" data-val="${o}" aria-pressed="${d.objective===o}"><b>${o}</b><small>${t}</small></button>`).join('')}</div></div>`,
  d => `<p class="muted" style="margin:0">Pick one or more owned properties. Users seen on more than one site are counted once.</p><div class="opt-grid">${Object.values(SITES).map(s=>`<button class="opt" data-act="toggle" data-path="draft.sites" data-val="${s.id}" aria-pressed="${d.sites.includes(s.id)}"><b>${s.name}</b><small>${fmtN(s.uv)} monthly users · ${fmtN(s.pv)} page views</small><small>${s.car&&s.bike?'Car + bike content':s.car?'New & used cars':'Bikes & scooters'}</small></button>`).join('')}</div>`,
  d => { const src=d.audSrc;
    const pk = PACKAGES.map(p=>{ const e=estimateAudience(p.aud,d.sites); return `<button class="opt" data-act="pick-aud" data-kind="pkg" data-id="${p.id}" aria-pressed="${d.audienceName===p.name}"><b>${p.name}</b><small>${p.desc}</small><small class="mono">${fmtN(e.users)} users · rate card ₹${p.cpm} CPM</small></button>`; }).join('');
    const sv = AUDIENCES.map(a=>{ const e=estimateAudience(a.aud,d.sites); return `<button class="opt" data-act="pick-aud" data-kind="aud" data-id="${a.id}" aria-pressed="${d.audienceName===a.name}"><b>${esc(a.name)}</b><small>${esc(a.note)}</small><small class="mono">${fmtN(e.users)} users</small></button>`; }).join('');
    return `<div class="row">${seg('draft.audSrc',[['package','Audience packages'],['saved','Saved audiences'],['custom','Build custom']],src)}</div>
      ${src==='package'?`<div class="opt-grid">${pk}</div>`: src==='saved'?`<div class="opt-grid">${sv}</div>`:`${builderHTML('draft.audience')}<div class="note">Current rule: ${esc(audSummary(d.audience))}</div>`}`; },
  d => { const pts = d.sites.flatMap(s=>PAGE_TYPES[s].map(p=>[p[0],p[1],s]));
    const uniq = []; pts.forEach(p=>{ if(!uniq.find(u=>u[0]===p[0])) uniq.push(p); });
    const fmts = Object.entries(FORMATS);
    return `<div><div class="eyebrow" style="margin-bottom:6px">Page types</div><div class="row" style="gap:6px"><button class="chipv" data-act="set-all-pages" aria-pressed="${!d.pageTypes.length}">All pages where the audience is present</button>${uniq.map(([v,l,s])=>`<button class="chipv" data-act="toggle" data-path="draft.pageTypes" data-val="${v}" aria-pressed="${d.pageTypes.includes(v)}">${l} <span class="muted">· ${SITES[s].name}</span></button>`).join('')}</div></div>
      <div><div class="eyebrow" style="margin-bottom:6px">Devices</div>${chips('draft.devices',[['mobile','Mobile'],['desktop','Desktop']],d.devices)}</div>
      <div><div class="eyebrow" style="margin-bottom:6px">Ad formats</div><div class="row" style="gap:6px">${fmts.map(([k,f])=>`<button class="chipv" data-act="toggle" data-path="draft.formats" data-val="${k}" aria-pressed="${d.formats.includes(k)}">${k==='native'?'Native card':k==='expandable'?'Expandable':k==='video'?'Video':k==='carousel'?'Carousel':k} <span class="muted">· ${f.kind}</span></button>`).join('')}</div></div>
      <div><div class="eyebrow" style="margin-bottom:6px">Geography <span class="muted" style="text-transform:none;letter-spacing:0">(none selected = all India)</span></div>${chips('draft.geos',GEOS.map(g=>[g,g]),d.geos)}</div>`; },
  d => { const days=Math.max(1,Math.round((new Date(d.end)-new Date(d.start))/DAY)+1); const inv=inventoryFor(d); const avgFloor = inv.length? sum(inv.map(i=>i.floor*i.imps))/sum(inv.map(i=>i.imps)) : 0;
    const bidLabel = {CPM:'Bid per 1,000 impressions (₹)',CPC:'Bid per click (₹)',CPL:'Price per lead (₹)',Sponsorship:'Fixed sponsorship fee (₹)'}[d.model];
    return `<div class="row">${seg('draft.model',[['CPM','CPM'],['CPC','CPC'],['CPL','CPA / lead'],['Sponsorship','Fixed sponsorship']],d.model)}</div>
      <div class="grid g2"><label class="f" for="d-bud">Total campaign budget (₹)<input id="d-bud" type="number" min="10000" step="10000" data-bind="draft.budget" data-live="fc" value="${d.budget}"></label>
      <label class="f" for="d-daily">Daily budget cap (₹)<input id="d-daily" type="number" min="0" step="1000" data-bind="draft.daily" data-live="fc" value="${d.daily}"></label>
      <label class="f" for="d-bid">${bidLabel}<input id="d-bid" type="number" min="1" data-bind="draft.bid" data-live="fc" value="${d.bid}"></label>
      <div class="grid g2" style="gap:10px"><label class="f" for="d-start">Start<input id="d-start" type="date" data-bind="draft.start" data-rr="1" value="${d.start}"></label><label class="f" for="d-end">End<input id="d-end" type="date" data-bind="draft.end" data-rr="1" value="${d.end}"></label></div></div>
      <div class="note">Even pacing target: <b>${fmtINRx(d.budget/days)}/day</b> over ${days} days. ${d.model==='CPM'?`Weighted floor on your selected placements is <b>₹${Math.round(avgFloor)}</b> CPM${d.bid<avgFloor?' — your bid is below floor on some placements and will lose those auctions':''}.`:''} Delivery stops automatically when spend reaches the total budget.</div>`; },
  d => `<div class="opt-grid">${[[1,'1 impression / user / day','Best for launches and sponsorships'],[3,'3 impressions / user / day','Recommended balance of reach and recall'],[5,'5 impressions / user / day','Maximise delivery on small audiences']].map(([n,l,t])=>`<button class="opt" data-act="freq" data-n="${n}" aria-pressed="${d.freq.n===n&&d.freq.per==='day'}"><b>${l}</b><small>${t}</small></button>`).join('')}</div>
     <div class="grid g3"><label class="f" for="d-fn">Custom cap — impressions<input id="d-fn" type="number" min="1" max="50" data-bind="draft.freq.n" data-rr="1" value="${d.freq.n}"></label>
     <label class="f" for="d-fp">per<select id="d-fp" data-bind="draft.freq.per" data-rr="1"><option value="day" ${d.freq.per==='day'?'selected':''}>day</option><option value="week" ${d.freq.per==='week'?'selected':''}>week</option><option value="flight" ${d.freq.per==='flight'?'selected':''}>campaign flight</option></select></label>
     <label class="f" for="d-pr">Delivery priority<select id="d-pr" data-bind="draft.priority" data-num="1" data-rr="fc">${[[3,'Standard'],[5,'Preferred'],[7,'High (premium rate)']].map(([v,l])=>`<option value="${v}" ${d.priority===v?'selected':''}>${l}</option>`).join('')}</select></label></div>
     <div class="note">Frequency is enforced per campaign on a rotating, hashed browser identifier. When a user reaches the cap the ad server picks the next eligible campaign, so the impression isn't wasted.</div>`,
  d => { const cr=d.creative; const dk = d.formats.find(f=>FORMATS[f].dev!=='mobile' && f!=='video')||'300x250'; const mb = d.formats.find(f=>FORMATS[f].dev!=='desktop' && f!=='video')||'300x250';
    return `<div class="grid g2"><div class="stack">
      <label class="f" for="cr-file">Upload banner, video or native image<input id="cr-file" type="file" accept="image/*,video/mp4" data-act-change="upload"></label>
      <label class="f" for="cr-hl">Headline<input id="cr-hl" type="text" maxlength="60" data-bind="draft.creative.headline" data-live="1" value="${esc(cr.headline)}"></label>
      <label class="f" for="cr-sub">Supporting line<input id="cr-sub" type="text" maxlength="80" data-bind="draft.creative.sub" data-live="1" value="${esc(cr.sub)}"></label>
      <div class="grid g2" style="gap:10px"><label class="f" for="cr-cta">Call to action<select id="cr-cta" data-bind="draft.creative.cta" data-rr="1">${['Book a test drive','Get on-road price','View offers','Check eligibility','Explore','Get quote','Learn more'].map(o=>`<option ${o===cr.cta?'selected':''}>${o}</option>`).join('')}</select></label>
      <div class="grid g2" style="gap:6px"><label class="f" for="cr-c1">Colour A<input id="cr-c1" type="color" data-bind="draft.creative.c1" data-rr="1" value="${cr.c1}" style="width:100%;height:34px"></label><label class="f" for="cr-c2">Colour B<input id="cr-c2" type="color" data-bind="draft.creative.c2" data-rr="1" value="${cr.c2}" style="width:100%;height:34px"></label></div></div>
      <label class="f" for="cr-url">Landing page URL<input id="cr-url" type="url" data-bind="draft.creative.url" data-live="1" value="${esc(cr.url)}"></label>
      <div class="note mono" style="word-break:break-all;font-size:11.5px">Click-through: ${esc(cr.url)}?utm_source=torque&amp;utm_medium=display&amp;utm_campaign=${esc((d.name||'campaign').toLowerCase().replace(/\W+/g,'_'))}&amp;utm_content={placement}_{size}</div>
      ${cr.img?'<button class="btn sm" data-act="clear-img">Remove uploaded image</button>':''}
    </div><div class="stack"><div class="eyebrow">Preview on ${SITES[d.sites[0]||'cd'].name}</div>${devicePreview(cr, dk, mb, d.sites[0]||'cd')}</div></div>`; },
  d => { const f=forecast(d); const rows=[['Name',esc(d.name)],['Objective',d.objective],['Websites',d.sites.map(siteTag).join(' ')],['Audience',`<b>${esc(d.audienceName)}</b><div class="muted" style="font-size:12px">${esc(audSummary(d.audience))}</div>`],['Inventory',`${d.pageTypes.length?d.pageTypes.map(p=>pageName(d.sites.find(s=>PAGE_TYPES[s].some(x=>x[0]===p))||'cd',p)).join(', '):'All pages'} · ${d.devices.join(' + ')} · ${d.formats.join(', ')}`],['Geography',d.geos.length?d.geos.join(', '):'All India'],['Budget',`${fmtINRx(d.budget)} total · ${fmtINRx(d.daily)}/day cap · ${d.model} ${d.model==='Sponsorship'?'':'₹'+d.bid}`],['Flight',`${dstr(d.start)} – ${dstr(d.end)} (${f.days} days)`],['Frequency',`${d.freq.n} per user per ${d.freq.per}`],['Landing page',esc(d.creative.url)]];
    return `<div class="tbl-wrap"><table><tbody>${rows.map(([k,v])=>`<tr><th style="width:150px;vertical-align:top">${k}</th><td>${v}</td></tr>`).join('')}</tbody></table></div>
     <div class="note">Launching sends creatives for policy review. The campaign starts delivering on its start date once approved.</div>`; },
];
ACT['pick-aud'] = el => { const d=S.draft; const src = el.dataset.kind==='pkg' ? PACKAGES.find(p=>p.id===el.dataset.id) : AUDIENCES.find(a=>a.id===el.dataset.id); d.audienceName=src.name; d.audience=clone(src.aud); render(); };
ACT['set-all-pages'] = () => { S.draft.pageTypes=[]; render(); };
ACT.freq = el => { S.draft.freq={n:+el.dataset.n, per:'day'}; render(); };
ACT['clear-img'] = () => { S.draft.creative.img=null; render(); };
ACT_CHANGE.upload = el => { const file=el.files[0]; if(!file) return; if (!file.type.startsWith('image/')){ toast('Video received — preview shows a poster frame'); return; } const r=new FileReader(); r.onload=()=>{ S.draft.creative.img=r.result; render(); }; r.readAsDataURL(file); };

/* ---- Audiences ---- */
VIEWS.audiences = () => {
  const a=S.audDraft; const e=estimateAudience(a.aud, a.sites);
  const imps = e.users * sum(a.sites.map(s=>SITES[s].pv*2.6))/sum(a.sites.map(s=>SITES[s].uv)) ;
  const bySite = a.sites.map(s=>[SITES[s].name, estimateAudience(a.aud,[s]).users]);
  const byPrice = Object.entries(DIMS.price_car.vals).map(([k,[l]])=>{ const g=clone(a.aud); if(!g.groups.length) g.groups=[{rules:[]}]; g.groups.forEach(gr=>{ const r=gr.rules.find(r=>r.dim==='price_car'); if (r){ if(!r.vals.includes(k)) r.vals=['__none']; else r.vals=[k]; } else gr.rules.push({dim:'price_car',vals:[k]}); }); return [l, estimateAudience(g,a.sites.filter(s=>SITES[s].car)).users]; });
  const ok = e.users >= K_ANON;
  return `<div class="grid g-side"><div class="stack" style="gap:16px">
    ${panel('Build an audience', `<div class="stack"><div class="grid g2"><label class="f" for="ad-name">Audience name<input id="ad-name" type="text" data-bind="audDraft.name" value="${esc(a.name)}"></label>
       <div class="f"><span>Websites</span>${chips('audDraft.sites',Object.values(SITES).map(s=>[s.id,s.name]),a.sites)}</div></div>
       ${builderHTML('audDraft.aud')}
       <div class="note"><b>Logic:</b> ${esc(audSummary(a.aud))}</div></div>`, {sub:'Conditions inside a group are joined with AND; groups are joined with OR'})}
    ${panel('Saved audiences', `<div class="tbl-wrap"><table><thead><tr><th>Audience</th><th>Definition</th><th class="n">Users (all sites)</th><th></th></tr></thead><tbody>${AUDIENCES.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td class="ink2" style="font-size:12.5px">${esc(audSummary(x.aud))}</td><td class="n">${fmtN(estimateAudience(x.aud).users)}</td><td><button class="btn sm" data-act="edit-aud" data-id="${x.id}">Edit</button></td></tr>`).join('')}</tbody></table></div>`, {pad:false})}
  </div>
  <aside class="panel reach-card"><header><h2>Audience size</h2><span class="sp"></span><span class="sub">30-day users</span></header><div class="body stack">
    <div><div class="eyebrow">Estimated reach</div><div class="big">${fmtN(e.users)} users</div><div class="muted" style="font-size:12px">${pct(e.share)} of ${fmtN(e.all)} automotive users on the selected sites</div></div>
    <div><div class="eyebrow">Eligible monthly impressions</div><div class="big" style="font-size:22px">${fmtN(imps)}</div></div>
    ${bySite.length>1?`<div><div class="eyebrow" style="margin-bottom:6px">By website</div>${hbars(bySite)}</div>`:''}
    ${a.sites.some(s=>SITES[s].car)?`<div><div class="eyebrow" style="margin-bottom:6px">By car price segment</div>${hbars(byPrice.filter(r=>r[1]>0))}</div>`:''}
    ${ok?'':`<div class="note bad">Below the ${K_ANON.toLocaleString('en-IN')}-user privacy minimum. Remove a condition to save.</div>`}
    <button class="btn pri" data-act="save-aud" ${ok?'':'disabled'}>Save audience</button>
    <p class="muted" style="font-size:11.5px;margin:0">No names, phone numbers, emails or browsing histories are ever exposed — only cohort counts.</p></div></aside></div>`;
};
ACT['save-aud'] = () => { const a=S.audDraft; const e=estimateAudience(a.aud,a.sites); const ex=AUDIENCES.find(x=>x.name===a.name);
  if (ex) ex.aud=clone(a.aud); else AUDIENCES.push({id:'a'+(AUDIENCES.length+1), name:a.name, note:audSummary(a.aud).slice(0,60), aud:clone(a.aud)});
  audit('marketing@'+advName(S.advId).split(' ')[0].toLowerCase(),'Advertiser','Saved audience',`${a.name} · est. ${fmtN(e.users)} users`); toast('Audience saved'); render(); };
ACT['edit-aud'] = el => { const x=AUDIENCES.find(a=>a.id===el.dataset.id); S.audDraft={name:x.name, sites:['cd','bd','zw'], aud:clone(x.aud)}; render(); window.scrollTo({top:0}); };

/* ---- Packages ---- */
VIEWS.packages = () => `<p class="muted" style="margin:0;max-width:70ch">Ready-made cohorts you can buy directly. Prices are rate-card CPMs; audience size is 30-day de-duplicated users across the package's websites.</p>
  <div class="grid g3">${PACKAGES.map(p=>{ const e=estimateAudience(p.aud,p.sites); const imps = e.users*sum(p.sites.map(s=>SITES[s].pv*2.6))/sum(p.sites.map(s=>SITES[s].uv));
    return `<div class="pkg"><div class="row" style="justify-content:space-between"><h3>${p.name}</h3><span class="price">₹${p.cpm} CPM</span></div><p>${p.desc}</p><div class="row" style="gap:4px">${p.sites.map(siteTag).join('')}</div>
     <div class="meta"><span>${fmtN(e.users)} users</span><span>${fmtN(imps)} impr./month</span></div><button class="btn" data-act="use-pkg" data-id="${p.id}">Use in a campaign</button></div>`; }).join('')}</div>`;
ACT['use-pkg'] = el => { const p=PACKAGES.find(x=>x.id===el.dataset.id); S.draft=newDraft({sites:p.sites.slice(), audienceName:p.name, audience:clone(p.aud), bid:p.cpm, pageTypes:[]}); S.wiz=2; go('create'); };

/* ---- Inventory & forecasting (advertiser) ---- */
VIEWS.inventory = () => {
  const fs=S.fcSel; const opts=[...PACKAGES.map(p=>['pkg:'+p.id,p.name]),...AUDIENCES.map(a=>['aud:'+a.id,a.name])];
  const src = fs.aud.startsWith('pkg:')? PACKAGES.find(p=>'pkg:'+p.id===fs.aud) : AUDIENCES.find(a=>'aud:'+a.id===fs.aud);
  let aud = clone(src.aud);
  if (fs.priceFocus!=='any'){ if(!aud.groups.length) aud.groups=[{rules:[]}]; aud.groups.forEach(g=>{ const r=g.rules.find(r=>r.dim==='price_car'); if(r) r.vals=[fs.priceFocus]; else g.rules.push({dim:'price_car',vals:[fs.priceFocus]}); }); }
  const c = {sites:fs.sites.length?fs.sites:['cd'], audience:aud, pageTypes:fs.pageTypes, devices:fs.devices, formats:[], geos:[], start:'2026-10-01', end:'2026-10-30', budget:1e12, model:'CPM', bid:250, freq:{n:3,per:'day'}};
  const f=forecast(c); const full=estimateAudience(aud,c.sites);
  const audName = (fs.priceFocus!=='any'? dimLabel('price_car',fs.priceFocus)+' ':'') + src.name.replace(' Audience','') + (fs.priceFocus!=='any'&&!/Buyers|Intenders/.test(src.name)?' Buyers':'');
  const invName = `${c.sites.map(s=>SITES[s].name).join(' + ')} ${fs.pageTypes.length? fs.pageTypes.map(p=>pageName(c.sites.find(s=>PAGE_TYPES[s].some(x=>x[0]===p))||c.sites[0],p)).join(', ') : 'all pages'}`;
  const pts = []; c.sites.forEach(s=>PAGE_TYPES[s].forEach(p=>{ if(!pts.find(x=>x[0]===p[0])) pts.push([p[0],p[1]]); }));
  const inv = inventoryFor({sites:c.sites, pageTypes:[], devices:fs.devices});
  const byPt = pts.map(([pt,l])=>{ const rows=inv.filter(i=>i.pt===pt); const imps=sum(rows.map(i=>i.imps)); return [l, imps, sum(rows.map(i=>i.imps*(1-i.sold))), imps? sum(rows.map(i=>i.floor*i.imps))/imps : 0]; }).filter(r=>r[1]);
  return `<div class="grid g2">${panel('Forecast a buy', `<div class="stack">
      <label class="f" for="fc-aud">Audience<select id="fc-aud" data-bind="fcSel.aud" data-rr="1">${opts.map(([v,l])=>`<option value="${v}" ${v===fs.aud?'selected':''}>${esc(l)}</option>`).join('')}</select></label>
      <label class="f" for="fc-price">Car price focus<select id="fc-price" data-bind="fcSel.priceFocus" data-rr="1"><option value="any">Keep audience as defined</option>${Object.entries(DIMS.price_car.vals).map(([k,[l]])=>`<option value="${k}" ${k===fs.priceFocus?'selected':''}>${l}</option>`).join('')}</select></label>
      <div class="f"><span>Websites</span>${chips('fcSel.sites',Object.values(SITES).map(s=>[s.id,s.name]),fs.sites)}</div>
      <div class="f"><span>Page types (none = all)</span>${chips('fcSel.pageTypes',pts,fs.pageTypes)}</div>
      <div class="f"><span>Devices (none = all)</span>${chips('fcSel.devices',[['mobile','Mobile'],['desktop','Desktop']],fs.devices)}</div></div>`)}
    <section class="panel"><header><h2>Forecast</h2><span class="sp"></span><span class="sub">next 30 days · 3/user/day cap</span></header><div class="body stack">
      <div class="tbl-wrap"><table><tbody>
        <tr><th>Selected audience</th><td class="n"><b>${esc(audName)}</b></td></tr>
        <tr><th>Available users</th><td class="n">${fmtN(full.users)}</td></tr>
        <tr><th>Available monthly impressions</th><td class="n">${fmtN(f.availMonthly)}</td></tr>
        <tr><th>Selected inventory</th><td class="n">${esc(invName)}</td></tr>
        <tr><th>Estimated reach</th><td class="n">${fmtN(f.estReach)}</td></tr>
        <tr><th>Estimated impressions</th><td class="n"><b>${fmtN(f.estImps)}</b></td></tr>
        <tr><th>Unsold share</th><td class="n">${pct(f.unsoldMonthly/f.availMonthly||0,0)} still open</td></tr></tbody></table></div>
      ${f.ok?'':`<div class="note bad">Below privacy minimum of ${K_ANON} users.</div>`}
      <button class="btn pri" data-act="fc-to-camp">Create campaign with this targeting</button></div></section></div>
    ${panel('Inventory by page type', `<div class="tbl-wrap"><table><thead><tr><th>Page type</th><th class="n">Monthly impressions</th><th class="n">Unsold</th><th>Sell-through</th><th class="n">Avg. floor CPM</th></tr></thead><tbody>${byPt.map(([l,i,u,fl])=>`<tr><td>${l}</td><td class="n">${fmtN(i)}</td><td class="n">${fmtN(u)}</td><td style="width:180px">${bar(1-u/i)}</td><td class="n">₹${Math.round(fl)}</td></tr>`).join('')}</tbody></table></div>`, {pad:false, sub:c.sites.map(s=>SITES[s].name).join(' + ')})}`;
};
ACT['fc-to-camp'] = () => { const fs=S.fcSel; const src = fs.aud.startsWith('pkg:')? PACKAGES.find(p=>'pkg:'+p.id===fs.aud) : AUDIENCES.find(a=>'aud:'+a.id===fs.aud); const aud=clone(src.aud);
  if (fs.priceFocus!=='any'){ if(!aud.groups.length) aud.groups=[{rules:[]}]; aud.groups.forEach(g=>{ const r=g.rules.find(r=>r.dim==='price_car'); if(r) r.vals=[fs.priceFocus]; else g.rules.push({dim:'price_car',vals:[fs.priceFocus]}); }); }
  S.draft=newDraft({sites:fs.sites.slice(), audienceName:src.name, audience:aud, audSrc:'custom', pageTypes:fs.pageTypes.slice(), devices:fs.devices.length?fs.devices.slice():['mobile','desktop']}); S.wiz=4; go('create'); };

/* ---- Creatives ---- */
VIEWS.creatives = () => {
  const list=myCampaigns(); const cur=list.find(c=>c.id===S.crPreview)||list[0];
  if (!cur) return `<div class="note">No creatives yet.</div>`;
  const dk=cur.formats.find(f=>FORMATS[f].dev!=='mobile'&&f!=='video')||'300x250', mb=cur.formats.find(f=>FORMATS[f].dev!=='desktop'&&f!=='video')||'300x250';
  return `<div class="grid g-side">${panel('Preview: '+esc(cur.name), devicePreview(cur.creative, dk, mb, cur.sites[0]), {sub:'Desktop '+dk+' · Mobile '+mb})}
   ${panel('Creative library', `<div class="stack">${list.map((c,i)=>`<button class="opt" data-act="set" data-path="crPreview" data-val="${c.id}" aria-pressed="${c.id===cur.id}"><div class="row" style="justify-content:space-between"><b>${esc(c.creative.headline)}</b><span class="pill ${status(c)==='sched'?'sched':'live'}">${i%4===3?'In review':'Approved'}</span></div><small>${c.id} · ${c.formats.length} sizes · ${esc(c.creative.cta)}</small></button>`).join('')}</div>`)}</div>
   ${panel('Sizes in this campaign', `<div class="row" style="gap:18px;align-items:flex-start">${cur.formats.map(f=>`<div class="stack" style="gap:4px"><span class="mono muted">${f}</span>${creativeHTML(cur.creative,f,FORMATS[f].w>600?.45:FORMATS[f].h>300?.5:.7)}</div>`).join('')}</div>`)}`;
};

/* ---- Reports ---- */
const BREAKDOWNS = {
  price:['Price segment', c=>{ const bike=c.sites.every(s=>!SITES[s].car); const d=bike?'price_bike':'price_car'; const r=(c.audience.groups.flatMap(g=>g.rules).find(r=>r.dim===d)?.vals)||Object.keys(DIMS[d].vals); return r.map(v=>[dimLabel(d,v), DIMS[d].vals[v][1]]); }],
  category:['Vehicle category', c=>{ const bike=c.sites.every(s=>!SITES[s].car); const d=bike?'body_bike':'body_car'; return Object.entries(DIMS[d].vals).map(([k,[l,s]])=>[l,s]); }],
  site:['Website', c=>c.sites.map(s=>[SITES[s].name, SITES[s].pv])],
  device:['Device', c=>c.devices.map(d=>[d==='mobile'?'Mobile':'Desktop', d==='mobile'?.78:.22])],
  geo:['Geography', c=>(c.geos.length?c.geos:GEOS).map(g=>[g, GEO_SHARE[GEOS.indexOf(g)]])],
  visitor:['New vs returning', c=>[['New visitors',.59],['Returning visitors',.41]]],
  cohort:['Audience cohort', c=>[['High intent',.18],['Medium intent',.35],['Low intent',.47]]],
};
function breakdown(c, key){
  const r=rng(c.id+key); const parts=BREAKDOWNS[key][1](c); const tw=sum(parts.map(p=>p[1]));
  const rows = parts.map(([l,w],i)=>{ const lift = key==='cohort'? [1.7,1.05,.72][i] : key==='visitor'? [.88,1.18][i] : key==='price' ? .75 + i*.12 + r()*.25 : .7+r()*.6;
    const imps=Math.round(c.stats.imps*w/tw); const clicks=Math.round(imps*c.stats.ctr*lift); const spend=c.stats.spend*w/tw; const conv=Math.round(clicks*(c.stats.conv/(c.stats.clicks||1))*(0.8+r()*.4)); return {l, imps, clicks, spend, conv}; });
  return rows;
}
VIEWS.reports = () => {
  const list=myCampaigns(); if (!list.length) return '<div class="note">No campaigns yet.</div>';
  const c=list.find(x=>x.id===S.rep.cid)||list[0]; S.rep.cid=c.id; let st=c.stats; const f=flight(c);
  const days=Math.max(1,Math.floor(f.elapsed)); const r=rng(c.id+'d'); const labels=[], imps=[], clicks=[];
  for (let i=0;i<days;i++){ const dt=new Date(f.s.getTime()+i*DAY); labels.push(dstr(dt)); const w=(1+.25*Math.sin(i/2.2)+(r()-.5)*.25)*(dt.getDay()%6===0?.86:1); imps.push(w); }
  const tw=sum(imps)||1; for (let i=0;i<imps.length;i++){ imps[i]=Math.round(st.imps*imps[i]/tw); clicks.push(Math.round(imps[i]*st.ctr*(0.9+r()*.2))); }
  if (S.rep.range!=='all'){ const n=+S.rep.range; const tI=sum(imps)||1; const k=n<labels.length? n:labels.length; const sI=sum(imps.slice(-k)); const fac=sI/tI; labels.splice(0,labels.length-k); imps.splice(0,imps.length-k); clicks.splice(0,clicks.length-k);
    st = Object.assign({}, st, {imps:Math.round(st.imps*fac), clicks:Math.round(st.clicks*fac), spend:st.spend*fac, conv:Math.round(st.conv*fac), reach:Math.round(st.reach*Math.sqrt(fac)), videoViews:Math.round(st.videoViews*fac)}); S._fac=fac; } else S._fac=1;
  const rows=breakdown(c,S.rep.dim).map(x=>({...x, imps:Math.round(x.imps*S._fac), clicks:Math.round(x.clicks*S._fac), spend:x.spend*S._fac, conv:Math.round(x.conv*S._fac)})); const avgCtr=st.ctr;
  const shown=rows.filter(x=>x.imps>=REPORT_K), hidden=rows.length-shown.length;
  const cpm=st.imps? st.spend/st.imps*1000:0, cpc=st.clicks? st.spend/st.clicks:0; const leads = c.objective.match(/Lead|Test/)? st.conv : Math.round(st.conv*.4);
  const vv = st.videoViews;
  const ins = insights(c);
  return `  ${kpis([['Impressions',fmtN(st.imps),`${fmtN(st.reach)} reach`],['Clicks',fmtN(st.clicks),pct(st.ctr,2)+' CTR'],['Spend',fmtINR(st.spend),pct(st.spend/c.budget,0)+' of budget'],['eCPM · CPC',`₹${Math.round(cpm)}`,`₹${cpc.toFixed(1)} per click`],['Video views',vv?fmtN(vv):'—',vv?pct(.62,0)+' view-through':'no video'],['Conversions',fmtN(st.conv),pct(st.conv/(st.clicks||1),1)+' CVR'],['Leads',fmtN(leads),leads?fmtINRx(st.spend/leads)+' CPL':'']])}
  <div class="grid g2">${panel('Daily impressions', lineChart('ch-imp',labels,[{name:'Impressions',color:'var(--c1)',vals:imps,area:true}]), {sub:'hover for values'})}
  ${panel('Daily clicks', lineChart('ch-clk',labels,[{name:'Clicks',color:'var(--c2)',vals:clicks,area:true}]), {sub:'hover for values'})}</div>
  <div class="grid g-side">${panel('Performance by '+BREAKDOWNS[S.rep.dim][0].toLowerCase(), `<div class="tbl-wrap"><table><thead><tr><th>${BREAKDOWNS[S.rep.dim][0]}</th><th class="n">Impressions</th><th class="n">Clicks</th><th class="n">CTR</th><th>CTR vs avg.</th><th class="n">Spend</th><th class="n">Conv.</th></tr></thead><tbody>
    ${shown.map(x=>{ const ctr=x.clicks/x.imps; const idx=ctr/avgCtr; return `<tr><td>${esc(x.l)}</td><td class="n">${fmtN(x.imps)}</td><td class="n">${fmtN(x.clicks)}</td><td class="n">${pct(ctr,2)}</td><td style="width:150px"><div class="row" style="gap:6px;flex-wrap:nowrap">${bar(idx/2,{mark:.5,cls:idx<.9?'warn':''})}<span class="mono ${idx>=1.1?'up':idx<.9?'dn':''}">${idx.toFixed(2)}×</span></div></td><td class="n">${fmtINR(x.spend)}</td><td class="n">${fmtN(x.conv)}</td></tr>`; }).join('')}
    </tbody></table></div>${hidden?`<div class="body" style="padding-top:0"><div class="note">${hidden} row(s) under ${REPORT_K} impressions are hidden to keep reporting aggregated.</div></div>`:''}`, {pad:false, actions:`<select aria-label="Breakdown" data-bind="rep.dim" data-rr="1" style="width:auto">${Object.entries(BREAKDOWNS).map(([k,[l]])=>`<option value="${k}" ${k===S.rep.dim?'selected':''}>${l}</option>`).join('')}</select>`})}
  ${panel('Optimisation suggestions', `<div class="stack">${ins.map(i=>`<div class="insight"><b>${i.t}</b><p>${i.p}</p><span class="why">${i.why}</span>${i.act?`<div><button class="btn sm" data-act="${i.act}" data-id="${c.id}">${i.actL}</button></div>`:''}</div>`).join('')||'<div class="muted">Not enough data yet.</div>'}</div>`, {sub:'rule-based today, model-based in Phase 3'})}</div>`;
};
function insights(c){
  const out=[]; if (c.stats.imps<5000) return out;
  const pr=breakdown(c,'price').filter(x=>x.imps>=REPORT_K); const avg=c.stats.ctr;
  const best=pr.map(x=>({...x,idx:x.clicks/x.imps/avg})).sort((a,b)=>b.idx-a.idx)[0];
  if (best && best.idx>1.15) out.push({t:`Shift delivery toward ${best.l}`, p:`The ${best.l} cohort has ${best.idx.toFixed(1)}× the campaign's average CTR. Consider increasing delivery to this cohort.`, why:`CTR ${pct(best.clicks/best.imps,2)} vs ${pct(avg,2)} avg · ${fmtN(best.imps)} impressions`});
  const coh=breakdown(c,'cohort'); const hi=coh[0], lo=coh[2]; const r=(hi.clicks/hi.imps)/(lo.clicks/lo.imps);
  out.push({t:'High-intent users convert better', p:`High-intent users click ${r.toFixed(1)}× more than low-intent users. Adding a high-intent condition would lift CTR but shrink reach by ~${pct(1-.18,0)}.`, why:`${fmtN(hi.imps)} vs ${fmtN(lo.imps)} impressions compared`});
  const p=pacing(c); if (p.pace<.9 && status(c)!=='ended') out.push({t:'Campaign is behind pace', p:`Spend is at ${pct(p.pace,0)} of where it should be. Adding page types or relaxing frequency to 5/day would open ~${fmtN(forecast(c).unsoldMonthly*.3)} more impressions.`, why:`ideal ${fmtINR(p.ideal)} vs actual ${fmtINR(c.stats.spend)}`});
  const dv=breakdown(c,'device'); if (dv.length===2){ const [m,d]=dv; const rm=(m.clicks/m.imps)/(d.clicks/d.imps); if (Math.abs(rm-1)>.15) out.push({t:`${rm>1?'Mobile':'Desktop'} outperforms`, p:`${rm>1?'Mobile':'Desktop'} CTR is ${Math.max(rm,1/rm).toFixed(2)}× the other device. Consider a device bid adjustment.`, why:`mobile ${pct(m.clicks/m.imps,2)} · desktop ${pct(d.clicks/d.imps,2)}`}); }
  return out;
}

/* ---- Tracking & conversions ---- */
VIEWS.tracking = () => { const u=S.utm; const out=`${u.url}${u.url.includes('?')?'&':'?'}utm_source=${encodeURIComponent(u.source)}&utm_medium=${encodeURIComponent(u.medium)}&utm_campaign=${encodeURIComponent(u.campaign)}&utm_content=${u.content}`;
  return `<div class="grid g2">${panel('UTM builder', `<div class="stack"><label class="f" for="u-url">Landing page<input id="u-url" type="url" data-bind="utm.url" data-live="1" value="${esc(u.url)}"></label>
     <div class="grid g2" style="gap:10px">${['source','medium','campaign','content'].map(k=>`<label class="f" for="u-${k}">utm_${k}<input id="u-${k}" type="text" data-bind="utm.${k}" data-live="1" value="${esc(u[k])}"></label>`).join('')}</div>
     <pre class="code">${esc(out)}</pre><p class="muted" style="margin:0;font-size:12px">{placement} and {size} are filled in by the ad server at click time.</p></div>`)}
   ${panel('Conversion pixel', `<div class="stack"><p class="muted" style="margin:0">Place on your thank-you or confirmation page. The pixel sends only the event name and a click ID we issued — never user details.</p>
     <pre class="code">&lt;script async src="https://px.torque-ads.example/c.js"&gt;&lt;/script&gt;
&lt;script&gt;
  torque('init', '${S.advId.toUpperCase()}-7731');
  torque('track', 'test_drive_booked', { value: 1500 });
&lt;/script&gt;</pre><div class="eyebrow">Tracked events</div><div class="row" style="gap:6px">${['Ad impression','Viewable impression','Ad click','Landing-page visit','Lead','Conversion','Post-click activity (7d)'].map(t=>`<span class="tag">${t}</span>`).join('')}</div></div>`)}</div>
   ${panel('Conversion events', `<div class="tbl-wrap"><table><thead><tr><th>Event</th><th>Type</th><th class="n">Value</th><th class="n">Window</th><th>Source</th><th class="n">Last 30 days</th></tr></thead><tbody>${S.conv.map(e=>`<tr><td><b>${esc(e.name)}</b></td><td><span class="tag">${e.type}</span></td><td class="n">${e.value?fmtINRx(e.value):'—'}</td><td class="n">${e.window} days post-click</td><td class="ink2">${esc(e.src)}</td><td class="n">${fmtN(e.count)}</td></tr>`).join('')}</tbody></table></div>
    <div class="body row" style="border-top:1px solid var(--line)"><input id="ce-name" type="text" placeholder="New event, e.g. Finance application" aria-label="Event name" style="max-width:280px"><select id="ce-type" aria-label="Event type" style="width:auto"><option>Lead</option><option>Engagement</option><option>Purchase</option></select><input id="ce-win" type="number" value="30" aria-label="Attribution window in days" style="width:90px"><button class="btn" data-act="add-conv">Add event</button></div>`, {pad:false})}`; };
ACT['add-conv'] = () => { const n=$('#ce-name').value.trim(); if(!n){ toast('Name the event first'); return; } S.conv.push({name:n,type:$('#ce-type').value,value:0,window:+$('#ce-win').value||30,src:'Pixel event',count:0}); audit('marketing@'+advName(S.advId).split(' ')[0].toLowerCase(),'Advertiser','Defined conversion event',n); toast('Conversion event added'); render(); };

/* ---- Billing ---- */
VIEWS.billing = () => { const a=ADVERTISERS.find(x=>x.id===S.advId); const list=myCampaigns(); const spend=sum(list.map(c=>c.stats.spend));
  const byModel = ['CPM','CPC','CPL','Sponsorship'].map(m=>[m==='CPL'?'CPA / lead':m, sum(list.filter(c=>c.model===m).map(c=>c.stats.spend))]).filter(r=>r[1]>0);
  const r=rng(a.id+'inv'); const inv=['Aug 2026','Jul 2026','Jun 2026','May 2026'].map((m,i)=>[`INV-${a.id.toUpperCase()}-${2608-i}`, m, Math.round(spend*(.6+r()*.5)), i===0?'Due 30 Sep':'Paid']);
  return kpis([['Prepaid balance',fmtINR(a.wallet),'auto-debits daily'],['Credit line',fmtINR(a.credit),'net-30 terms'],['September spend',fmtINR(spend),`${list.length} campaigns`],['GST (18%)',fmtINR(spend*.18),'added to invoice']])
   + `<div class="grid g2">${panel('Spend by commercial model', byModel.length?hbars(byModel,{fmt:fmtINR}):'<span class="muted">No spend yet</span>')}
     ${panel('Invoices', `<div class="tbl-wrap"><table><thead><tr><th>Invoice</th><th>Period</th><th class="n">Amount</th><th>Status</th></tr></thead><tbody>${inv.map(([n,m,v,s])=>`<tr><td class="mono">${n}</td><td>${m}</td><td class="n">${fmtINR(v)}</td><td><span class="pill ${s==='Paid'?'live':'limited'}">${s}</span></td></tr>`).join('')}</tbody></table></div>`, {pad:false})}</div>
   <div class="note">Billing is on delivered, verified units: impressions (CPM) counted when 50% of the ad is in view for 1 second, clicks after invalid-traffic filtering, leads after de-duplication.</div>`; };
