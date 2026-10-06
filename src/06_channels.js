/* =========================================================
   CHANNELS — take Torque cohorts off-site (YouTube, Meta) and
   onto a partner publisher network + open exchange.
   Loaded after 05_admin.js; extends the wizard, forecast,
   reports, navigation and admin console.
   ========================================================= */
document.head.insertAdjacentHTML('beforeend', `<style>
.chrow{display:inline-flex;gap:4px;align-items:center;margin-left:6px;vertical-align:middle}
.chrow .msi{font-size:16px;color:var(--ink-2)}
.chtag{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;padding:2px 10px 2px 6px;border-radius:99px;border:1px solid var(--line);color:var(--ink);white-space:nowrap}
.chtag .msi{font-size:16px}
.chcard{border:1px solid var(--line);border-radius:8px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;background:var(--surface)}
.chcard h3{margin:0;font-family:var(--display);font-size:15px;font-weight:500;display:flex;align-items:center;gap:8px}
.flow{display:flex;flex-wrap:wrap;gap:0;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.flow .st{flex:1 1 150px;padding:12px 14px;border-right:1px solid var(--line);display:flex;flex-direction:column;gap:4px;background:var(--surface)}
.flow .st:last-child{border-right:0}
.flow .st .msi{color:var(--accent)}
.flow .st b{font-size:13.5px;font-weight:500}
.flow .st span{font-size:12.5px;color:var(--ink-2)}
.vmock{position:relative;aspect-ratio:16/9;width:100%;max-width:420px;border-radius:8px;overflow:hidden;color:#fff;font-family:var(--display);display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}
.vmock .hl{font-size:22px;font-weight:700;line-height:1.1}
.vmock .adlab{position:absolute;left:10px;bottom:10px;font-size:11px;background:#000a;padding:2px 6px;border-radius:3px;font-family:var(--body)}
.vmock .skip{position:absolute;right:0;bottom:14px;font-size:12px;background:#000c;padding:6px 12px;font-family:var(--body);border:1px solid #fff5;border-right:0}
.vmock .prog{position:absolute;left:0;bottom:0;height:3px;width:28%;background:#F2B233}
.fmock{width:100%;max-width:320px;border:1px solid var(--line);border-radius:8px;background:var(--surface);overflow:hidden;font-size:13px}
.fmock .hd{display:flex;gap:8px;align-items:center;padding:10px}
.fmock .av{width:32px;height:32px;border-radius:50%;flex:none}
.fmock .hd small{display:block;color:var(--ink-2);font-size:11.5px}
.fmock .tx{padding:0 10px 10px;color:var(--ink)}
.fmock .img{aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--display);font-weight:700;font-size:22px;padding:24px;text-align:center}
.fmock .ft{display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--sunk);gap:8px}
.fmock .ft small{color:var(--ink-2);font-size:11px;display:block}
.fmock .ft .b{background:var(--line);border-radius:4px;padding:6px 10px;font-weight:500;white-space:nowrap}
</style>`);

/* ---------- channel catalogue ---------- */
const CH = {
  owned:  {name:'Torque sites',      icon:'language',      desc:'CarDekho, BikeDekho and ZigWheels — our own pages, first-party cohorts, full control.', color:'var(--c1)'},
  youtube:{name:'YouTube',           icon:'smart_display', desc:'Cohorts sent as hashed, consented IDs (Customer Match via Data Manager API). Runs as Demand Gen: in-stream, Shorts and feeds.', color:'var(--c2)'},
  meta:   {name:'Meta',              icon:'diversity_3',   desc:'Facebook and Instagram via Custom Audiences built from the same consented cohorts.', color:'var(--c3)'},
  network:{name:'Publisher network', icon:'hub',           desc:'Partner blogs and sites running the Torque tag, plus the open exchange via OpenRTB.', color:'var(--c4)'},
};
const CH_ORDER = ['owned','youtube','meta','network'];
const OFFSITE = {
  consent:.58,        // share of cohort users who consented to off-site ad personalisation
  identifiable:.46,   // share with a hashed email / phone on file (logged-in, lead, app)
  idSync:.38,         // share recognised on partner sites via Torque ID sync
  match:{youtube:.52, meta:.61},
  perUser:{youtube:7, meta:9, network:12},    // monthly ad opportunities per matched user
  media:{youtube:95, meta:125, network:70, exchange:48},  // ₹ CPM, sample
  dataFee:40,          // ₹ CPM Torque audience fee on off-site delivery
  mgmt:.15,            // managed-service fee on media
  minMatched:10000,
};
const NET_CATS = ['Auto','Finance','Tech','Travel','Lifestyle','News','Sports','Parenting'];
const NET_PUBS = [
  {id:'p01', name:'MotorHead Journal',  domain:'motorheadjournal.example', cat:'Auto',      uv:1.9e6, pv:7.4e6,  safety:96, status:'Live',    share:.70, since:'2026-04-02', ctx:.62},
  {id:'p02', name:'Two Wheel Tales',    domain:'twowheeltales.example',    cat:'Auto',      uv:1.1e6, pv:4.2e6,  safety:94, status:'Live',    share:.70, since:'2026-05-11', ctx:.58},
  {id:'p03', name:'EV Pulse India',     domain:'evpulse.example',          cat:'Auto',      uv:0.6e6, pv:2.1e6,  safety:98, status:'Live',    share:.72, since:'2026-06-20', ctx:.66},
  {id:'p04', name:'MoneyMint',          domain:'moneymint.example',        cat:'Finance',   uv:3.2e6, pv:11.8e6, safety:95, status:'Live',    share:.68, since:'2026-03-15', ctx:.18},
  {id:'p05', name:'Gadget Gully',       domain:'gadgetgully.example',      cat:'Tech',      uv:4.4e6, pv:15.5e6, safety:92, status:'Live',    share:.65, since:'2026-02-08', ctx:.09},
  {id:'p06', name:'Trip With Tia',      domain:'tripwithtia.example',      cat:'Travel',    uv:1.4e6, pv:4.9e6,  safety:97, status:'Live',    share:.70, since:'2026-05-30', ctx:.14},
  {id:'p07', name:'Desi Road Trips',    domain:'desiroadtrips.example',    cat:'Travel',    uv:0.8e6, pv:2.6e6,  safety:95, status:'Live',    share:.70, since:'2026-07-04', ctx:.31},
  {id:'p08', name:'Urban Home & Style', domain:'urbanhomestyle.example',   cat:'Lifestyle', uv:2.6e6, pv:8.3e6,  safety:93, status:'Live',    share:.65, since:'2026-04-19', ctx:.05},
  {id:'p09', name:'Metro Morning News', domain:'metromorning.example',     cat:'News',      uv:6.8e6, pv:31.0e6, safety:84, status:'Live',    share:.60, since:'2026-01-27', ctx:.04},
  {id:'p10', name:'Cricket Corner',     domain:'cricketcorner.example',    cat:'Sports',    uv:5.1e6, pv:22.4e6, safety:90, status:'Live',    share:.62, since:'2026-03-03', ctx:.03},
  {id:'p11', name:'Parent Pages',       domain:'parentpages.example',      cat:'Parenting', uv:1.2e6, pv:3.8e6,  safety:98, status:'Live',    share:.70, since:'2026-06-02', ctx:.06},
  {id:'p12', name:'Torque & Tyres',     domain:'torquetyres.example',      cat:'Auto',      uv:0.4e6, pv:1.3e6,  safety:91, status:'In review', share:.70, since:'2026-09-18', ctx:.70},
  {id:'p13', name:'Byte Street',        domain:'bytestreet.example',       cat:'Tech',      uv:0.9e6, pv:3.1e6,  safety:0,  status:'In review', share:.65, since:'2026-09-21', ctx:.08},
];
const EXCHANGE = {name:'Open exchange (OpenRTB)', sites:'40,000+ sites and apps in India (sample)', imps:1.4e9, cpm:48};
const SSPS = [
  ['Google Ad Manager (AdX)', 'OpenRTB 2.6 · Authorized Buyers seat', 'Planned', '620M'],
  ['PubMatic',                'OpenRTB 2.6',                          'Planned', '310M'],
  ['Magnite',                 'OpenRTB 2.6',                          'Planned', '240M'],
  ['InMobi Exchange',         'OpenRTB 2.5 · in-app',                 'Planned', '230M'],
];
const netLive = () => NET_PUBS.filter(p=>p.status==='Live');
const chIcons = c => `<span class="chrow" title="${(c.channels||['owned']).map(x=>CH[x].name).join(', ')}">${(c.channels||['owned']).map(x=>`<span class="msi">${CH[x].icon}</span>`).join('')}</span>`;
const chTag = ch => `<span class="chtag"><span class="msi" style="color:${CH[ch].color}">${CH[ch].icon}</span>${CH[ch].name}</span>`;

/* ---------- existing sample campaigns get channels ---------- */
const CH_SEED = {
  'C-1041':{channels:['owned','youtube'], split:{owned:65,youtube:35}},
  'C-1042':{channels:['owned','meta','network'], split:{owned:50,meta:30,network:20}, net:{cats:['Auto','Tech'],exchange:false,safety:'strict'}},
  'C-1044':{channels:['owned','youtube','meta'], split:{owned:50,youtube:30,meta:20}},
  'C-1045':{channels:['owned','network'], split:{owned:60,network:40}, net:{cats:['Auto','Finance','News'],exchange:true,safety:'standard'}},
};
CAMPAIGNS.forEach(c=>{ Object.assign(c, {channels:['owned'], split:{owned:100}, yt:{formats:['instream','bumper']}, meta:{platforms:['fb','ig'],placements:['feed','reels']}, net:{cats:['Auto'],exchange:false,safety:'strict'}}, CH_SEED[c.id]||{}); });

/* ---------- reach & forecast per channel ---------- */
const cohortPool = aud => estimateAudience(aud, ['cd','bd','zw']).users;
function effSplit(d){
  const chs = d.channels||['owned']; const raw = chs.map(ch=>Math.max(0, +(d.split?.[ch])||0)); const tot = sum(raw);
  const out = {}; chs.forEach((ch,i)=> out[ch] = tot ? raw[i]/tot : 1/chs.length); return out;
}
function chAudience(ch, d){
  const pool = cohortPool(d.audience);
  if (ch==='owned') return estimateAudience(d.audience, d.sites?.length? d.sites : ['cd','bd','zw']).users;
  if (ch==='youtube'||ch==='meta') return pool * OFFSITE.consent * OFFSITE.identifiable * OFFSITE.match[ch];
  // network: cohort users recognised on partner sites + contextual auto-intent readers
  const cats = d.net?.cats?.length ? d.net.cats : NET_CATS;
  const pubs = netLive().filter(p=>cats.includes(p.cat));
  const recognised = pool * OFFSITE.consent * OFFSITE.idSync * (sum(pubs.map(p=>p.uv))/sum(netLive().map(p=>p.uv))) * (d.net?.exchange? 2.1 : 1);
  const contextual = sum(pubs.map(p=>p.uv*p.ctx)) * .25;
  return recognised + contextual;
}
function chCpm(ch, d){
  if (ch==='youtube'||ch==='meta') return OFFSITE.media[ch]*(1+OFFSITE.mgmt) + OFFSITE.dataFee;
  if (ch==='network') return (d.net?.exchange ? (OFFSITE.media.network+OFFSITE.media.exchange)/2 : OFFSITE.media.network) + OFFSITE.dataFee*.5;
  return d.model==='CPM' ? d.bid : 250;
}
function forecastChannels(d){
  ensureDraftChannels(d); const sp = effSplit(d); const days = Math.max(1, Math.round((new Date(d.end)-new Date(d.start))/DAY)+1);
  const rows = (d.channels||['owned']).map(ch=>{
    const budget = d.budget * sp[ch];
    if (ch==='owned'){ const f = forecast(Object.assign({}, d, {budget})); return {ch, users:f.users, avail:f.availMonthly*days/30, imps:f.estImps, reach:f.estReach, budget, cpm: f.estImps? budget/f.estImps*1000 : 0, ok:f.ok, canDeliver:f.canDeliver}; }
    const users = chAudience(ch, d); const cpm = chCpm(ch, d);
    const avail = users * OFFSITE.perUser[ch] * days/30;
    const want = budget/cpm*1000; const imps = Math.min(want, avail*.6);
    const reach = Math.min(users*.85, imps/Math.max(2.2, Math.min(d.freq.n*days*.12, 6)));
    const ok = ch==='network' ? users>=K_ANON : users>=OFFSITE.minMatched;
    return {ch, users, avail, imps, reach, budget, cpm, ok, canDeliver: want <= avail*.6*1.02};
  });
  const pool = Math.max(cohortPool(d.audience), ...rows.map(r=>r.users));
  const union = pool * (1 - rows.reduce((a,r)=>a*(1-clamp(r.reach/pool,0,1)), 1));
  return {rows, reach: union, imps: sum(rows.map(r=>r.imps)), days};
}

/* ---------- wizard: Channels step replaces Websites ---------- */
WIZ[1] = 'Channels';
const _newDraft = newDraft;
newDraft = (extra={}) => Object.assign(_newDraft({}), {
  channels:['owned','youtube'], split:{owned:60,youtube:25,meta:0,network:15},
  yt:{formats:['instream','bumper']}, meta:{platforms:['fb','ig'],placements:['feed','reels']},
  net:{cats:['Auto','Finance'], exchange:false, safety:'strict'}, offsite:{headline:'', primary:'Built for every road. Book a test drive at your nearest dealer.'} }, extra);
function ensureDraftChannels(d){ d.channels ||= ['owned']; d.split ||= {owned:100}; d.yt ||= {formats:['instream']}; d.meta ||= {platforms:['fb','ig'],placements:['feed']}; d.net ||= {cats:['Auto'],exchange:false,safety:'strict'}; d.offsite ||= {primary:''};
  d.channels.forEach(ch=>{ if (!(+d.split[ch]>0)) d.split[ch] = ch==='owned'?60:20; }); }

WIZ_STEPS[1] = d => { ensureDraftChannels(d); const has = ch => d.channels.includes(ch);
  const card = ch => { const u = chAudience(ch, d); return `<button class="opt" data-act="toggle" data-path="draft.channels" data-val="${ch}" aria-pressed="${has(ch)}"><b style="display:flex;gap:8px;align-items:center"><span class="msi" style="color:${CH[ch].color}">${CH[ch].icon}</span>${CH[ch].name}</b><small>${CH[ch].desc}</small><small style="color:var(--ink)">${fmtN(u)} reachable in this audience</small></button>`; };
  return `<p class="muted" style="margin:0">Run the same audience on our own sites and take it further — to YouTube, Meta and partner publishers. Your audience list is never shared with you or other advertisers; Torque runs the off-site buys in its own managed accounts.</p>
  <div class="opt-grid">${CH_ORDER.map(card).join('')}</div>
  ${has('owned')?`<div class="chcard"><h3>${msi('language','s20')} Torque sites</h3>${chips('draft.sites',Object.values(SITES).map(s=>[s.id,`${s.name} <span class="muted">· ${fmtN(s.uv)} users</span>`]),d.sites)}</div>`:''}
  ${has('youtube')?`<div class="chcard"><h3>${msi('smart_display','s20')} YouTube formats</h3>${chips('draft.yt.formats',[['instream','In-stream'],['shorts','Shorts'],['infeed','In-feed'],['bumper','Bumper (6 s)']],d.yt.formats)}<p class="muted" style="margin:0;font-size:12.5px">Bought as a Demand Gen campaign in Torque's Google Ads account; Google places the ads across the YouTube surfaces you select.</p>${''}</div>`:''}
  ${has('meta')?`<div class="chcard"><h3>${msi('diversity_3','s20')} Meta placements</h3>${chips('draft.meta.platforms',[['fb','Facebook'],['ig','Instagram']],d.meta.platforms)}${chips('draft.meta.placements',[['feed','Feed'],['stories','Stories'],['reels','Reels']],d.meta.placements)}</div>`:''}
  ${has('network')?`<div class="chcard"><h3>${msi('hub','s20')} Publisher network</h3><div class="f"><span>Content categories</span>${chips('draft.net.cats',NET_CATS.map(c=>[c,`${c} <span class="muted">· ${netLive().filter(p=>p.cat===c).length}</span>`]),d.net.cats)}</div>
     <label class="chk" for="net-ex"><input id="net-ex" type="checkbox" data-bind="draft.net.exchange" data-rr="1" ${d.net.exchange?'checked':''}> Also buy the open exchange (OpenRTB) — ${EXCHANGE.sites}</label>
     <div class="row"><span class="muted" style="font-size:13px">Brand safety</span>${seg('draft.net.safety',[['strict','Strict'],['standard','Standard']],d.net.safety)}</div></div>`:''}
  ${(has('youtube')||has('meta'))?`<div class="note">Off-site reach counts only users who <b>consented to off-site ad personalisation</b> and have a hashed ID we can match (${pct(OFFSITE.consent,0)} × ${pct(OFFSITE.identifiable,0)} of the cohort, then the platform match rate). Minimum ${fmtN(OFFSITE.minMatched)} matched users per platform.</div>`:''}`;
};
ACT.wiz = el => { const i=+el.dataset.i; if (i<0||i>=WIZ.length) return; const d=S.draft; ensureDraftChannels(d);
  if (S.wiz===1 && i>1){ if (!d.channels.length){ toast('Choose at least one channel'); return; } if (d.channels.includes('owned') && !d.sites.length){ toast('Pick at least one Torque site, or turn Torque sites off'); return; } if (d.channels.includes('network') && !d.net.cats.length && !d.net.exchange){ toast('Pick at least one publisher category'); return; } }
  S.wiz=i; render(); };

/* Inventory step: owned-site pages only */
const _inv = WIZ_STEPS[3];
WIZ_STEPS[3] = d => { ensureDraftChannels(d); const offs = d.channels.filter(c=>c!=='owned');
  const offNote = offs.length ? `<div class="note">Off-site placements (${offs.map(c=>CH[c].name).join(', ')}) are set in the Channels step. Geography below applies to every channel.</div>` : '';
  if (!d.channels.includes('owned')) return offNote + `<div><div class="eyebrow" style="margin-bottom:6px">Geography <span class="muted" style="font-weight:400">(none selected = all India)</span></div>${chips('draft.geos',GEOS.map(g=>[g,g]),d.geos)}</div>`;
  return offNote + _inv(d); };

/* Budget step: add channel split */
const _bud = WIZ_STEPS[4];
WIZ_STEPS[4] = d => { ensureDraftChannels(d); const sp = effSplit(d);
  const split = d.channels.length>1 ? `<div class="chcard"><h3>${msi('donut_large','s20')} Budget split by channel</h3>
    <div class="tbl-wrap"><table><thead><tr><th>Channel</th><th class="n">Share (%)</th><th class="n">Budget</th><th class="n">Buying CPM</th></tr></thead><tbody>
    ${d.channels.map(ch=>`<tr><td>${chTag(ch)}</td><td class="n"><input type="number" min="0" max="100" id="sp-${ch}" aria-label="${CH[ch].name} share" value="${Math.round((+d.split[ch]||0))}" data-bind="draft.split.${ch}" data-live="fc" data-rr="1" style="width:90px;text-align:right;height:34px"></td><td class="n">${fmtINR(d.budget*sp[ch])}</td><td class="n">₹${Math.round(chCpm(ch,d))}</td></tr>`).join('')}</tbody></table></div>
    <p class="muted" style="margin:0;font-size:12.5px">Shares are normalised to 100%. Off-site CPM = platform media + ${pct(OFFSITE.mgmt,0)} management fee + ₹${OFFSITE.dataFee} Torque audience fee. ${d.model!=='CPM'&&d.model!=='Sponsorship'?`Your ${d.model} price applies to Torque sites; off-site channels are bought on CPM and reported against the same goal.`:''}</p></div>` : '';
  return _bud(d) + split; };

/* Creative step: add off-site previews */
const _cr = WIZ_STEPS[6];
function videoMock(cr){ return `<div class="vmock" style="background:linear-gradient(120deg,${cr.c1},${cr.c2})"><span class="hl">${esc(cr.headline)}</span><span class="adlab">Ad · 0:06</span><span class="skip">Skip ▸</span><span class="prog"></span></div>`; }
function feedMock(cr, text){ return `<div class="fmock"><div class="hd"><span class="av" style="background:linear-gradient(120deg,${cr.c1},${cr.c2})"></span><span><b>${esc(advName(S.advId))}</b><small>Sponsored</small></span></div><div class="tx">${esc(text||cr.sub)}</div><div class="img" style="background:linear-gradient(120deg,${cr.c1},${cr.c2})">${esc(cr.headline)}</div><div class="ft"><span><small>${esc((cr.url||'').replace(/^https?:\/\//,'').split('/')[0])}</small>${esc(cr.sub)}</span><span class="b">${esc(cr.cta)}</span></div></div>`; }
WIZ_STEPS[6] = d => { ensureDraftChannels(d); const yt=d.channels.includes('youtube'), mt=d.channels.includes('meta');
  if (!yt && !mt) return _cr(d);
  return _cr(d) + `<div class="chcard"><h3>${msi('ios_share','s20')} Off-site creative</h3>
    <div class="grid g2"><div class="stack">${mt?`<label class="f" for="os-pt">Primary text (Meta)<textarea id="os-pt" maxlength="200" data-bind="draft.offsite.primary" data-live="1">${esc(d.offsite.primary)}</textarea></label>`:''}
      ${yt?`<label class="f" for="os-vid">Video for YouTube (MP4, 6–30 s)<input id="os-vid" type="file" accept="video/mp4"></label>`:''}
      <p class="muted" style="margin:0;font-size:12.5px">Headline, call to action and landing page are reused from above. Each platform reviews ads against its own policies before they run.</p></div>
    <div class="row" style="align-items:flex-start;gap:16px">${yt?`<div class="stack" style="gap:6px;flex:1 1 260px"><span class="eyebrow">YouTube in-stream</span>${videoMock(d.creative)}</div>`:''}${mt?`<div class="stack" style="gap:6px;flex:0 1 300px"><span class="eyebrow">Meta feed</span>${feedMock(d.creative, d.offsite.primary)}</div>`:''}</div></div></div>`; };

/* Review step: add channels */
const _rev = WIZ_STEPS[7];
WIZ_STEPS[7] = d => { ensureDraftChannels(d); const fc=forecastChannels(d); const sp=effSplit(d);
  return `<div class="chcard"><h3>${msi('hub','s20')} Channels</h3><div class="tbl-wrap"><table><thead><tr><th>Channel</th><th class="n">Budget</th><th class="n">Est. reach</th><th class="n">Est. impressions</th><th>Status</th></tr></thead><tbody>${fc.rows.map(r=>`<tr><td>${chTag(r.ch)}</td><td class="n">${fmtINR(d.budget*sp[r.ch])}</td><td class="n">${fmtN(r.reach)}</td><td class="n">${fmtN(r.imps)}</td><td>${r.ok?(r.canDeliver?'<span class="pill live">Ready</span>':'<span class="pill limited">Budget exceeds supply</span>'):'<span class="pill bad">Audience too small</span>'}</td></tr>`).join('')}</tbody></table></div></div>` + _rev(d); };

/* Forecast side panel: per channel */
forecastPanel = function(){
  const d=S.draft; if (!d) return ''; ensureDraftChannels(d);
  const fc = forecastChannels(d); const f = forecast(d);
  const bad = fc.rows.filter(r=>!r.ok), short = fc.rows.filter(r=>r.ok && !r.canDeliver);
  const verdict = !f.ok ? `<div class="note bad">This audience has fewer than ${K_ANON.toLocaleString('en-IN')} users. Broaden it — narrow audiences can't be targeted, to protect user privacy.</div>`
    : bad.length ? `<div class="note bad">${bad.map(r=>CH[r.ch].name).join(', ')}: audience too small to activate. Broaden the audience or remove the channel.</div>`
    : short.length ? `<div class="note warn">${short.map(r=>CH[r.ch].name).join(', ')} can't spend its full share. Move budget to another channel or widen targeting.</div>`
    : `<div class="note good">Deliverable across ${fc.rows.length} channel${fc.rows.length>1?'s':''}.</div>`;
  return `<header><h2>Delivery forecast</h2><span class="sp"></span><span class="sub">updates live</span></header><div class="body stack">
    <div><div class="eyebrow">Estimated reach, all channels</div><div class="big">${fmtN(fc.reach)}</div><div class="muted" style="font-size:12px">${fmtN(fc.imps)} impressions · ${fc.days} days · de-duplicated across channels</div></div>
    <div class="stack" style="gap:10px">${fc.rows.map(r=>`<div style="display:grid;grid-template-columns:auto 1fr auto;gap:4px 10px;align-items:center;font-size:13px"><span class="msi s20" style="color:${CH[r.ch].color}">${CH[r.ch].icon}</span><span>${CH[r.ch].name}</span><b style="font-weight:500">${fmtN(r.reach)}</b><span></span><span class="muted" style="font-size:12px">${fmtN(r.users)} in audience · ${fmtN(r.imps)} impr.</span><span class="muted" style="font-size:12px">${fmtINR(r.budget)}</span></div>`).join('')}</div>
    <div class="funnel">${[['Selected audience', esc(d.audienceName)],['Torque-site placements', d.channels.includes('owned')?`${f.invCount} on ${d.sites.map(s=>SITES[s].name).join(', ')}`:'—'],['Flight', `${dstr(d.start)} – ${dstr(d.end)}`]].map(([l,v])=>`<div class="fr"><span class="muted">${l}</span><b style="text-align:right">${v}</b></div>`).join('')}</div>
    ${verdict}
    <p class="muted" style="font-size:11.5px;margin:0">Advertisers only ever see aggregated counts. Off-site figures assume consent, ID coverage and platform match rates shown in Reach planner.</p></div>`;
};

/* ---------- reports: channel breakdown ---------- */
BREAKDOWNS.channel = ['Channel', c => (c.channels||['owned']).map(ch=>[CH[ch].name, effSplit(c)[ch]])];

/* ---------- navigation ---------- */
ADV_RAIL.splice(1, 0, {key:'channels', icon:'hub', label:'Channels', items:[['reach','Reach planner'],['offsite','YouTube & Meta'],['network-adv','Publisher network']]});
ADM_RAIL[1].items.splice(1, 0, ['network','Publisher network']);
ADM_RAIL[2].items.splice(1, 0, ['activation','Audience activation']);
Object.assign(VIEW_TITLE, {reach:'Reach planner', offsite:'YouTube & Meta', 'network-adv':'Publisher network', network:'Publisher network', activation:'Audience activation'});
S.rp = {aud:'pkg:suv'}; S.netAdv = {cat:'all'}; S.pubForm = {name:'', domain:'', cat:'Auto', pv:''};

/* ---------- ADVERTISER: Reach planner ---------- */
function audFromKey(k){ return k.startsWith('pkg:') ? PACKAGES.find(p=>'pkg:'+p.id===k) : AUDIENCES.find(a=>'aud:'+a.id===k); }
VIEWS.reach = () => {
  const src = audFromKey(S.rp.aud)||PACKAGES[0];
  const d = newDraft({audience:clone(src.aud), audienceName:src.name, channels:CH_ORDER.slice(), net:{cats:NET_CATS.slice(),exchange:true,safety:'standard'}, sites:['cd','bd','zw'], budget:1e12});
  const pool = cohortPool(src.aud);
  const rows = CH_ORDER.map(ch=>{ const users = chAudience(ch,d); const cpm = chCpm(ch,d); const imps = ch==='owned' ? forecast(Object.assign({},d,{budget:1e12})).availMonthly : users*OFFSITE.perUser[ch];
    const rate = ch==='owned'?1 : ch==='network'? users/pool : OFFSITE.match[ch];
    const min = ch==='owned'? K_ANON : ch==='network'? K_ANON : OFFSITE.minMatched;
    return {ch, users, cpm, imps, rate, ok: users>=min}; });
  const opts=[...PACKAGES.map(p=>['pkg:'+p.id,p.name]),...AUDIENCES.map(a=>['aud:'+a.id,a.name])];
  return `<div class="row"><label class="f" for="rp-aud" style="min-width:300px">Audience<select id="rp-aud" data-bind="rp.aud" data-rr="1">${opts.map(([v,l])=>`<option value="${v}" ${v===S.rp.aud?'selected':''}>${esc(l)}</option>`).join('')}</select></label></div>
  ${kpis([['Cohort on Torque sites',fmtN(pool),'30-day users, 3 sites'],['Consented for off-site',fmtN(pool*OFFSITE.consent),pct(OFFSITE.consent,0)+' of cohort'],['Matchable (hashed ID)',fmtN(pool*OFFSITE.consent*OFFSITE.identifiable),pct(OFFSITE.identifiable,0)+' have ID on file'],['Max reach, all channels',fmtN(forecastChannels(Object.assign({},d,{budget:5e7})).reach),'with ₹5Cr, 30 days']])}
  ${panel('Where this audience can run', `<div class="tbl-wrap"><table><thead><tr><th>Channel</th><th class="n m">Reachable users</th><th class="n m">Match / coverage</th><th class="n m">Monthly impressions</th><th class="n m">Buying CPM</th><th>Formats</th><th>Status</th></tr></thead><tbody>
    ${rows.map(r=>`<tr><td>${chTag(r.ch)}</td><td class="n">${fmtN(r.users)}</td><td class="n">${pct(r.rate,0)}</td><td class="n">${fmtN(r.imps)}</td><td class="n">₹${Math.round(r.cpm)}</td><td class="ink2" style="font-size:12.5px">${{owned:'Display, native, video, rich media',youtube:'In-stream, bumper, Shorts, in-feed',meta:'Feed, Stories, Reels',network:'Display, native, video'}[r.ch]}</td><td>${r.ok?'<span class="pill live">Available</span>':'<span class="pill bad">Too small</span>'}</td></tr>`).join('')}</tbody></table></div>`, {pad:false, actions:`<button class="btn pri" data-act="rp-plan">Plan a campaign on all channels</button>`})}
  ${panel('How your audience travels — without leaving Torque', `<div class="flow">${[
    ['person_search','Cohort built','Page views on our 3 sites → price, body type, intent'],
    ['verified_user','Consent check','Only users who opted in to off-site personalisation'],
    ['tag','Hashed IDs','SHA-256 email / phone, or Torque ID for partner sites'],
    ['join','Platform match','Google / Meta match inside their systems'],
    ['campaign','Torque-managed buy','Runs in Torque\'s ad accounts on your behalf'],
    ['bar_chart','Aggregated reporting','Reach, views, clicks, leads — never the list']].map(([i,t,s])=>`<div class="st"><span class="msi">${i}</span><b>${t}</b><span>${s}</span></div>`).join('')}</div>`)}`;
};
ACT['rp-plan'] = () => { const src=audFromKey(S.rp.aud); S.draft=newDraft({audience:clone(src.aud), audienceName:src.name, audSrc:'custom', channels:CH_ORDER.slice(), split:{owned:45,youtube:20,meta:20,network:15}}); S.wiz=1; go('create'); };

/* ---------- ADVERTISER: YouTube & Meta ---------- */
VIEWS.offsite = () => {
  const list = myCampaigns().filter(c=>c.channels.some(ch=>ch==='youtube'||ch==='meta'));
  const lines = list.flatMap(c=>c.channels.filter(ch=>ch==='youtube'||ch==='meta').map(ch=>{ const sp=effSplit(c)[ch]; const r=rng(c.id+ch); const st=status(c);
    const imps=Math.round(c.stats.imps*sp*(ch==='youtube'?.55:.8)); const matched=chAudience(ch,c);
    return {c, ch, st, matched, imps, spend:c.stats.spend*sp, views: ch==='youtube'? Math.round(imps*(.28+r()*.08)) : 0, clicks: Math.round(imps*(ch==='meta'?.011:.004)*(0.9+r()*.2)), sync: st==='sched'?'Scheduled':'Synced · today 06:00'}; }));
  return `<div class="note">Off-site campaigns run in Torque-managed Google Ads and Meta accounts, using your Torque cohort. You approve creative and budget here; Torque handles audience sync, platform setup and optimisation.</div>
  ${lines.length ? panel('Off-site line items', `<div class="tbl-wrap"><table><thead><tr><th>Campaign</th><th>Channel</th><th>Status</th><th>Audience sync</th><th class="n m">Matched users</th><th class="n m">Impr.</th><th class="n m">Views</th><th class="n m">Clicks</th><th class="n m">Cost</th></tr></thead><tbody>
    ${lines.map(l=>`<tr><td><button class="cname" data-act="open-rep" data-id="${l.c.id}">${esc(l.c.name)}</button><div class="muted" style="font-size:12.5px">${esc(l.c.audienceName)}</div></td><td>${chTag(l.ch)}</td><td>${pill(l.st)}</td><td>${l.sync}</td><td class="n">${fmtN(l.matched)}</td><td class="n">${fmtN(l.imps)}</td><td class="n">${l.views?fmtN(l.views):'—'}</td><td class="n">${fmtN(l.clicks)}</td><td class="n">${fmtINR(l.spend)}</td></tr>`).join('')}</tbody></table></div>`, {pad:false})
    : `<div class="panel"><div class="body stack"><b>No YouTube or Meta campaigns yet</b><span class="muted">Add YouTube or Meta in the Channels step of a new campaign to reach your cohort off-site.</span><div><button class="btn pri" data-act="rp-plan">Plan an off-site campaign</button></div></div></div>`}
  <div class="grid g2">${panel('YouTube', `<div class="stack"><div class="row" style="gap:6px">${['Skippable in-stream','Bumper (6 s)','Shorts','In-feed video'].map(t=>`<span class="tag">${t}</span>`).join('')}</div><p class="muted" style="margin:0">Bought on CPM or CPV. Reported as impressions, views, view rate and clicks.</p></div>`)}
    ${panel('Meta', `<div class="stack"><div class="row" style="gap:6px">${['Facebook Feed','Instagram Feed','Stories','Reels'].map(t=>`<span class="tag">${t}</span>`).join('')}</div><p class="muted" style="margin:0">Bought on CPM. Loans, insurance and similar ads may fall under Meta's special ad category rules, which limit audience targeting — Torque checks this before launch.</p></div>`)}</div>`;
};

/* ---------- ADVERTISER: Publisher network ---------- */
VIEWS['network-adv'] = () => {
  const cat=S.netAdv.cat; const pubs=netLive().filter(p=>cat==='all'||p.cat===cat);
  const tot = sum(netLive().map(p=>p.pv*2.4));
  return kpis([['Partner publishers',netLive().length,`${NET_CATS.length} content categories`],['Monthly impressions',fmtN(tot),'direct, Torque tag'],['Open exchange',fmtN(EXCHANGE.imps),'monthly, via OpenRTB'],['Avg. brand safety',Math.round(sum(netLive().map(p=>p.safety))/netLive().length)+'/100','verified quarterly']])
  + panel('Publishers', `<div class="tbar"><div class="filter" style="gap:8px;flex-wrap:wrap">${['all',...NET_CATS].map(c=>`<button class="chipv" data-act="set" data-path="netAdv.cat" data-val="${c}" aria-pressed="${cat===c}">${c==='all'?'All categories':c}</button>`).join('')}</div></div>
    <div class="tbl-wrap"><table><thead><tr><th>Publisher</th><th>Category</th><th class="n m">Monthly users</th><th class="n m">Monthly impr.</th><th class="n m">Auto-intent readers</th><th class="n m">Brand safety</th><th class="n m">Floor CPM</th></tr></thead><tbody>
    ${pubs.map(p=>`<tr><td><b style="font-weight:500">${p.name}</b><div class="muted mono">${p.domain}</div></td><td><span class="tag">${p.cat}</span></td><td class="n">${fmtN(p.uv)}</td><td class="n">${fmtN(p.pv*2.4)}</td><td class="n">${pct(p.ctx,0)}</td><td class="n">${p.safety}</td><td class="n">₹${Math.round(OFFSITE.media.network*(0.8+p.ctx*.6))}</td></tr>`).join('')}
    <tr class="total"><td><b style="font-weight:500">${EXCHANGE.name}</b><div class="muted">${EXCHANGE.sites}</div></td><td><span class="tag">All</span></td><td class="n">—</td><td class="n">${fmtN(EXCHANGE.imps)}</td><td class="n">contextual</td><td class="n">pre-bid filtered</td><td class="n">₹${EXCHANGE.cpm}</td></tr></tbody></table></div>`,
    {pad:false, actions:`<button class="btn pri" data-act="net-plan">Use in a campaign</button>`})
  + `<div class="note">How targeting works on partner sites: readers already in your Torque cohort are recognised through a consented Torque ID sync; everyone else is targeted by page context (auto, finance, travel content). Sample publishers shown — names are placeholders.</div>`;
};
ACT['net-plan'] = () => { const cat=S.netAdv.cat; S.draft=newDraft({channels:['network'], split:{network:100}, net:{cats:cat==='all'?NET_CATS.slice():[cat], exchange:false, safety:'strict'}}); S.wiz=1; go('create'); };

/* ---------- ADMIN: Publisher network ---------- */
VIEWS.network = () => {
  const live=netLive(); const pend=NET_PUBS.filter(p=>p.status!=='Live');
  const imps=sum(live.map(p=>p.pv*2.4)); const fill=.41; const rev=imps*fill*OFFSITE.media.network/1000*23/30;
  const f=S.pubForm;
  return kpis([['Live publishers',live.length,`${pend.length} in review`],['Monthly impressions',fmtN(imps),'Torque tag, direct'],['Fill rate',pct(fill,0),'rest to house / backfill'],['Gross revenue MTD',fmtINR(rev),'network'],['Publisher payouts MTD',fmtINR(sum(live.map(p=>p.pv*2.4*fill*OFFSITE.media.network/1000*p.share))*23/30),'rev share 60–72%']])
  + panel('Partner publishers', `<div class="tbl-wrap"><table><thead><tr><th>Publisher</th><th>Category</th><th>Status</th><th class="n">Monthly users</th><th class="n">Monthly impr.</th><th class="n">Brand safety</th><th class="n">Rev share</th><th>Checks</th><th></th></tr></thead><tbody>
    ${NET_PUBS.map(p=>`<tr><td><b style="font-weight:500">${p.name}</b><div class="muted mono">${p.domain}</div></td><td><span class="tag">${p.cat}</span></td><td><span class="pill ${p.status==='Live'?'live':'limited'}">${p.status}</span></td><td class="n">${fmtN(p.uv)}</td><td class="n">${fmtN(p.pv*2.4)}</td><td class="n">${p.safety||'pending'}</td><td class="n">${pct(p.share,0)}</td>
      <td style="font-size:12.5px">${p.status==='Live'?'<span class="ok">✓</span> ads.txt · <span class="ok">✓</span> tag · <span class="ok">✓</span> content':'<span class="ok">✓</span> ads.txt · <span class="no">✕</span> tag · … content'}</td><td>${p.status!=='Live'?`<button class="btn sm" data-act="pub-approve" data-id="${p.id}">Approve</button>`:''}</td></tr>`).join('')}</tbody></table></div>`, {pad:false})
  + `<div class="grid g2">${panel('Onboard a publisher', `<div class="stack"><div class="grid g2" style="gap:10px"><label class="f" for="pf-n">Site name<input id="pf-n" type="text" data-bind="pubForm.name" value="${esc(f.name)}" placeholder="e.g. Highway Diaries"></label><label class="f" for="pf-d">Domain<input id="pf-d" type="text" data-bind="pubForm.domain" value="${esc(f.domain)}" placeholder="highwaydiaries.in"></label>
      <label class="f" for="pf-c">Category<select id="pf-c" data-bind="pubForm.cat">${NET_CATS.map(c=>`<option ${c===f.cat?'selected':''}>${c}</option>`).join('')}</select></label><label class="f" for="pf-pv">Monthly page views<input id="pf-pv" type="number" data-bind="pubForm.pv" value="${esc(f.pv)}" placeholder="500000"></label></div>
      <div class="note">Next steps sent to the publisher: add the Torque line to <span class="mono">ads.txt</span>, install the Torque tag, pass content and brand-safety review (usually 2–3 days). Monthly payouts by bank transfer at the agreed revenue share.</div>
      <div><button class="btn pri" data-act="pub-add">Send invite</button></div></div>`)}
    ${panel('Exchange connections (OpenRTB)', `<div class="tbl-wrap"><table><thead><tr><th>Exchange</th><th>Protocol</th><th>Status</th><th class="n">India monthly impr. (est.)</th></tr></thead><tbody>${SSPS.map(s=>`<tr><td><b style="font-weight:500">${s[0]}</b></td><td class="ink2" style="font-size:12.5px">${s[1]}</td><td><span class="pill sched">${s[2]}</span></td><td class="n">${s[3]}</td></tr>`).join('')}</tbody></table></div><div class="body" style="padding-top:0"><p class="muted" style="margin:0;font-size:12.5px">Torque bids as a buyer (DSP seat) into these exchanges, applying the same audience, frequency and brand-safety rules. Volumes are placeholders pending integration.</p></div>`, {pad:false})}</div>`;
};
ACT['pub-approve'] = el => { const p=NET_PUBS.find(x=>x.id===el.dataset.id); p.status='Live'; p.safety=p.safety||93; audit('ops@torque','Admin','Approved publisher',`${p.name} (${p.domain})`); toast(p.name+' is live on the network'); render(); };
ACT['pub-add'] = () => { const f=S.pubForm; if (!f.name.trim()||!f.domain.trim()){ toast('Add a site name and domain'); return; }
  NET_PUBS.push({id:'p'+(NET_PUBS.length+1), name:f.name.trim(), domain:f.domain.trim(), cat:f.cat, uv:(+f.pv||300000)/3.5, pv:+f.pv||300000, safety:0, status:'In review', share:.65, since:iso(TODAY), ctx:f.cat==='Auto'?.6:.08});
  audit('ops@torque','Admin','Invited publisher',`${f.name} (${f.domain}) · ${f.cat}`); S.pubForm={name:'',domain:'',cat:'Auto',pv:''}; toast('Invite sent — publisher added as In review'); render(); };

/* ---------- ADMIN: Audience activation ---------- */
const SYNCS = [];
(function seedSyncs(){ const r=rng('sync');
  [...AUDIENCES.slice(0,3).map(a=>[a.name,a.aud]), ...[PACKAGES[4],PACKAGES[5],PACKAGES[2]].map(p=>[p.name,p.aud])].forEach(([name,aud],i)=>{
    ['youtube','meta'].forEach((ch,j)=>{ if ((i+j)%3===2) return; const up = cohortPool(aud)*OFFSITE.consent*OFFSITE.identifiable; const rate = OFFSITE.match[ch]*(0.9+r()*.2);
      SYNCS.push({name, ch, uploaded:up, matched:up*rate, rate, last:`Today ${String(4+i).padStart(2,'0')}:${j?'30':'00'}`, status: up*rate<OFFSITE.minMatched?'Below minimum':'Active'}); }); }); })();
VIEWS.activation = () => kpis([['Destinations','2','YouTube (Data Manager API), Meta (Marketing API)'],['Audiences synced',SYNCS.length,'refreshed daily'],['IDs uploaded',fmtN(sum(SYNCS.map(s=>s.uploaded))),'hashed, consented'],['Avg. match rate',pct(sum(SYNCS.map(s=>s.rate))/SYNCS.length,0),''],['Opt-outs applied (24h)','3,412','removed on next sync']])
  + `<div class="grid g2">${['youtube','meta'].map(ch=>`<div class="chcard"><h3><span class="msi" style="color:${CH[ch].color}">${CH[ch].icon}</span>${CH[ch].name}<span style="flex:1"></span><span class="pill live">Connected</span></h3><div class="muted" style="font-size:13px">${ch==='youtube'?'Customer Match lists in the Torque Google Ads manager account. Uploaded via the Data Manager API (new Google Ads API uploads blocked since 1 Apr 2026); SHA-256 normalised email and phone.':'Custom Audiences in the Torque Business Manager. POST /{audience_id}/users via Marketing API, max 10,000 records per call, matched within ~24 h; SHA-256 normalised email and phone.'}</div><div class="row" style="font-size:13px"><span>Lists: <b style="font-weight:500">${SYNCS.filter(s=>s.ch===ch).length}</b></span><span>Matched users: <b style="font-weight:500">${fmtN(sum(SYNCS.filter(s=>s.ch===ch).map(s=>s.matched)))}</b></span><span>Refresh: daily 04:00 IST</span></div></div>`).join('')}</div>`
  + panel('Synced audiences', `<div class="tbl-wrap"><table><thead><tr><th>Cohort</th><th>Destination</th><th class="n">Uploaded (consented)</th><th class="n">Matched</th><th class="n">Match rate</th><th>Last sync</th><th>Status</th><th></th></tr></thead><tbody>
    ${SYNCS.map((s,i)=>`<tr><td><b style="font-weight:500">${esc(s.name)}</b></td><td>${chTag(s.ch)}</td><td class="n">${fmtN(s.uploaded)}</td><td class="n">${fmtN(s.matched)}</td><td class="n">${pct(s.rate,0)}</td><td>${s.last}</td><td><span class="pill ${s.status==='Active'?'live':'limited'}">${s.status}</span></td><td><button class="btn sm ghost" data-act="sync-now" data-i="${i}">Sync now</button></td></tr>`).join('')}</tbody></table></div>`, {pad:false, sub:'Lists live only in Torque-owned accounts; advertisers never receive them'})
  + `<div class="note"><b>Rules applied on every sync:</b> only users with off-site consent · withdrawn consent removed within 24 hours · no sensitive categories · list must match ≥ ${fmtN(OFFSITE.minMatched)} users before a campaign can use it · lists deleted on the platform 30 days after last use.</div>`;
ACT['sync-now'] = el => { const s=SYNCS[+el.dataset.i]; const d=new Date(); s.last=`Today ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; audit('system','Governance','Synced audience',`${s.name} → ${CH[s.ch].name} · ${fmtN(s.matched)} matched`); toast(`${s.name} synced to ${CH[s.ch].name}`); render(); };

/* ---------- ADMIN: extend existing pages ---------- */
const _ov = VIEWS.overview;
VIEWS.overview = () => { const by = CH_ORDER.map(ch=>[CH[ch].name, sum(CAMPAIGNS.map(c=>(effSplit(c)[ch]||0)*c.stats.spend))]);
  const netRev = sum(netLive().map(p=>p.pv*2.4*.41*OFFSITE.media.network/1000))*23/30;
  by[3][1] += netRev;
  return _ov() + `<div class="grid g2">${panel('Revenue by channel (MTD)', hbars(by,{fmt:fmtINR}), {sub:'Torque sites include direct campaigns only in this view'})}${panel('Off-site & network at a glance', `<div class="stack" style="gap:10px;font-size:13.5px">${[['Audiences synced to YouTube / Meta', SYNCS.length, 'activation'],['Partner publishers live', netLive().length, 'network'],['Publishers in review', NET_PUBS.filter(p=>p.status!=='Live').length, 'network'],['Exchange connections planned', SSPS.length, 'network']].map(([l,v,go_])=>`<div class="row" style="justify-content:space-between"><span>${l}</span><span class="row"><b style="font-weight:500">${v}</b><button class="btn sm ghost" data-act="go" data-v="${go_}">Open</button></span></div>`).join('')}</div>`)}</div>`; };

const _pr = VIEWS.pricing;
VIEWS.pricing = () => _pr() + panel('Off-site and network pricing', `<div class="tbl-wrap"><table><thead><tr><th>Channel</th><th>What the advertiser pays</th><th class="n">Sample buying CPM</th></tr></thead><tbody>
  <tr><td>${chTag('youtube')}</td><td>Platform media at cost + ${pct(OFFSITE.mgmt,0)} management fee + ₹${OFFSITE.dataFee} CPM audience fee</td><td class="n">₹${Math.round(OFFSITE.media.youtube*(1+OFFSITE.mgmt)+OFFSITE.dataFee)}</td></tr>
  <tr><td>${chTag('meta')}</td><td>Platform media at cost + ${pct(OFFSITE.mgmt,0)} management fee + ₹${OFFSITE.dataFee} CPM audience fee</td><td class="n">₹${Math.round(OFFSITE.media.meta*(1+OFFSITE.mgmt)+OFFSITE.dataFee)}</td></tr>
  <tr><td>${chTag('network')}</td><td>Network CPM (publisher gets 60–72%) + ₹${OFFSITE.dataFee/2} CPM when cohort-targeted</td><td class="n">₹${Math.round(OFFSITE.media.network+OFFSITE.dataFee/2)}</td></tr>
  <tr><td><span class="chtag"><span class="msi">public</span>Open exchange</span></td><td>Clearing price + Torque margin + audience fee</td><td class="n">₹${Math.round(OFFSITE.media.exchange+OFFSITE.dataFee/2)}</td></tr></tbody></table></div>`, {pad:false, sub:'sample rates — to be set by Sales / Yield'});

const _ar = VIEWS.arch;
VIEWS.arch = () => _ar() + panel('Channels architecture', `<div class="tbl-wrap"><table><tbody>${[
  ['Channel router','Splits a campaign into per-channel line items and budgets; re-balances daily in Phase 2','Campaign service'],
  ['Activation service','Builds consented, hashed ID lists per cohort; pushes to Google Data Manager API (Customer Match) and Meta Marketing API (Custom Audiences); daily refresh, opt-out purge','Worker · KMS for hashing salt'],
  ['Off-site buyer','Creates YouTube buys as Demand Gen campaigns (classic Video campaigns are read-only in the API) and Meta campaign → ad set → ad in Torque-owned accounts','Google Ads API · Meta Marketing API'],
  ['Reporting sync','Pulls impressions, views, clicks, cost and conversions hourly into unified reporting','Google Ads API reporting · Meta Insights API'],
  ['Pixel route (optional)','Fires cohort events via Meta Pixel / Conversions API and Google tag so platforms build audiences from site visitors — larger reach, needs explicit consent','Meta CAPI · Google tag'],
  ['Publisher SDK / tag','Torque tag on partner sites calls the same /v1/decide API; ID sync with consent','Edge ad server'],
  ['Publisher portal','Onboarding, ads.txt check, brand-safety review, earnings, payouts','Web app · ledger'],
  ['DSP bidder','OpenRTB 2.6 bidder for exchange supply; same targeting, caps and pacing','Go · < 80 ms bid timeout'],
  ['Unified reporting','Normalises platform metrics into one schema (impr., views, clicks, conversions) by channel','ClickHouse'],
].map(r=>`<tr><td><b style="font-weight:500">${r[0]}</b></td><td class="ink2">${r[1]}</td><td class="mono muted">${r[2]}</td></tr>`).join('')}</tbody></table></div>`, {pad:false});

const _pv = VIEWS.privacy;
VIEWS.privacy = () => panel('Off-site activation controls', `<div class="stack"><label class="chk" for="gv-os"><input id="gv-os" type="checkbox" checked disabled> Separate consent purpose for “personalised ads on other platforms” — users can opt in to on-site cohorts but out of off-site sharing</label>
  <label class="chk" for="gv-os2"><input id="gv-os2" type="checkbox" checked disabled> Hash identifiers (SHA-256, normalised) before they leave Torque; raw email / phone never sent</label>
  <label class="chk" for="gv-os3"><input id="gv-os3" type="checkbox" checked disabled> Lists stay in Torque-owned platform accounts; never shared to advertiser accounts</label>
  <label class="chk" for="gv-os4"><input id="gv-os4" type="checkbox" checked disabled> Minimum ${fmtN(OFFSITE.minMatched)} matched users per list · withdrawn consent purged within 24 hours</label>
  <p class="muted" style="margin:0;font-size:12.5px">These need Legal / DPO sign-off and matching updates to the consent notice and platform data-processing terms before launch.</p></div>`) + _pv();

/* boot again so new nav appears */
render();
