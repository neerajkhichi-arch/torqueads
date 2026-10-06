/* =================== UI framework =================== */
const S = {
  searchQ:'',
  console:'adv', view:'campaigns', advId:'v1', campFilter:'all',
  wiz:0, draft:null,
  audDraft:{ name:'SUV or EV, ₹15–25L, researching', sites:['cd','zw'], aud:{groups:[
    {rules:[{dim:'body_car',vals:['SUV']},{dim:'price_car',vals:['15-20','20-30']},{dim:'recency',vals:['30d']},{dim:'intent',vals:['onroad','compare','reviews']}]},
    {rules:[{dim:'fuel',vals:['EV']},{dim:'price_car',vals:['10-15','15-20']}]} ]}},
  fcSel:{ aud:'pkg:suv', sites:['cd'], pageTypes:['model'], devices:[], priceFocus:'15-20' },
  rep:{ cid:'C-1041', dim:'price', range:'all' },
  crPreview:'C-1041',
  invFilter:{ site:'all', dev:'all', kind:'all' },
  sim:{ site:'cd', pt:'model', vehicle:'car', price:18, body:'SUV', fuel:'Petrol', brand:'Hyundai', model:'Creta', market:'new', intents:['onroad','compare'], device:'mobile', geo:'Delhi NCR', tier:'metro', repeat:true, cookie:'visitor-7f3a21' },
  simResult:null, bulk:null,
  gov:{ k:K_ANON, repK:REPORT_K, retention:90, aggRetention:25, consent:true, gpc:true, sensitive:true },
  conv:[
    {name:'Test drive booked', type:'Lead', value:1500, window:30, src:'Pixel on thank-you page', count:412},
    {name:'On-road price request', type:'Lead', value:600, window:14, src:'Torque lead form', count:1284},
    {name:'Brochure download', type:'Engagement', value:0, window:7, src:'Pixel event', count:2710},
  ],
  utm:{ url:'https://example.com/terrain', source:'torque', medium:'display', campaign:'terrain_launch', content:'{placement}_{size}' },
};

/* ---------- small components ---------- */
const siteTag = id => `<span class="tag site-${id}">${SITES[id].name}</span>`;
const pill = st => `<span class="pill ${st}">${STATUS_LABEL[st]}</span>`;
function kpis(list){ return `<div class="kpis">${list.map(([l,v,d])=>`<div class="kpi"><span class="l">${l}</span><span class="v">${v}</span>${d?`<span class="d">${d}</span>`:''}</div>`).join('')}</div>`; }
function panel(title, body, {sub='', actions='', pad=true}={}){ return `<section class="panel"><header><h2>${title}</h2>${sub?`<span class="sub">${sub}</span>`:''}<span class="sp"></span>${actions}</header>${pad?`<div class="body">${body}</div>`:body}</section>`; }
function bar(v, {mark=null, cls=''}={}){ return `<div class="bar ${cls}"><i style="width:${clamp(v,0,1)*100}%"></i>${mark!=null?`<span class="mark" style="left:${clamp(mark,0,1)*100}%"></span>`:''}</div>`; }
function seg(bindPath, opts, cur, rr='1'){ return `<div class="seg" role="group">${opts.map(([v,l])=>`<button data-act="set" data-path="${bindPath}" data-val="${esc(v)}" data-rr="${rr}" aria-pressed="${String(cur)===String(v)}">${l}</button>`).join('')}</div>`; }
function chips(path, options, selected){ return `<div class="row" style="gap:6px">${options.map(([v,l])=>`<button class="chipv" data-act="toggle" data-path="${path}" data-val="${esc(v)}" aria-pressed="${selected.includes(v)}">${l}</button>`).join('')}</div>`; }

/* line / area chart with hover crosshair */
function lineChart(id, labels, series, {h=200, fmt=fmtN}={}){
  const W=720, H=h, L=48, R=14, T=12, B=26;
  const max = Math.max(...series.flatMap(s=>s.vals))*1.1 || 1;
  const nice = (()=>{ const p=Math.pow(10,Math.floor(Math.log10(max))); const m=max/p; return (m<=2?2:m<=5?5:10)*p; })();
  const x = i => L + (W-L-R) * (labels.length<2?0:i/(labels.length-1));
  const y = v => T + (H-T-B) * (1 - v/nice);
  const ticks=[0,.25,.5,.75,1].map(f=>f*nice);
  let g = ticks.map(t=>`<line class="gl" x1="${L}" x2="${W-R}" y1="${y(t)}" y2="${y(t)}"/><text x="${L-6}" y="${y(t)+3}" text-anchor="end">${fmt(t)}</text>`).join('');
  const step = Math.ceil(labels.length/7);
  g += labels.map((l,i)=> (i%step===0 && labels.length-1-i>=step*.6)||i===labels.length-1 ? `<text x="${x(i)}" y="${H-8}" text-anchor="middle">${l}</text>`:'').join('');
  for (const s of series){
    const pts = s.vals.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    if (s.area) g += `<polygon points="${x(0)},${y(0)} ${pts} ${x(s.vals.length-1)},${y(0)}" fill="${s.color}" fill-opacity=".12"/>`;
    g += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    const li=s.vals.length-1; g += `<circle cx="${x(li)}" cy="${y(s.vals[li])}" r="4" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`;
  }
  g += `<line id="${id}-x" x1="0" x2="0" y1="${T}" y2="${H-B}" stroke="var(--ink-3)" stroke-dasharray="3 3" visibility="hidden"/>`;
  g += `<rect x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}" fill="transparent" data-chart="${id}"/>`;
  CHARTS[id] = {labels, series, x, L, W, R, fmt};
  return `<div style="position:relative"><svg class="chart" id="${id}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map(s=>s.name).join(', '))} over time">${g}</svg><div class="tip" id="${id}-tip" hidden></div></div>`;
}
const CHARTS = {};
document.addEventListener('pointermove', e=>{
  const r = e.target.closest?.('[data-chart]'); document.querySelectorAll('.tip').forEach(t=>{ if(!r || t.id!==r.dataset.chart+'-tip') t.hidden=true; });
  document.querySelectorAll('.chart line[id$="-x"]').forEach(l=>{ if(!r || l.id!==r.dataset.chart+'-x') l.setAttribute('visibility','hidden'); });
  if (!r) return; const c = CHARTS[r.dataset.chart]; const svg = r.ownerSVGElement; const bb = svg.getBoundingClientRect();
  const sx = (e.clientX-bb.left)/bb.width*c.W; const n=c.labels.length; const i = clamp(Math.round((sx-c.L)/((c.W-c.L-c.R)/(n-1||1))),0,n-1);
  const ln = $('#'+r.dataset.chart+'-x'); ln.setAttribute('x1',c.x(i)); ln.setAttribute('x2',c.x(i)); ln.setAttribute('visibility','visible');
  const tip = $('#'+r.dataset.chart+'-tip'); tip.hidden=false;
  tip.innerHTML = `<b>${c.labels[i]}</b>`+c.series.map(s=>`<div><i style="background:${s.color}"></i>${s.name}: <span>${c.fmt(s.vals[i])}</span></div>`).join('');
  const px = c.x(i)/c.W*bb.width; tip.style.left = Math.min(px+12, bb.width-150)+'px'; tip.style.top='8px';
});

/* horizontal bar list */
function hbars(rows, {fmt=fmtN, color='var(--c1)'}={}){
  const max = Math.max(...rows.map(r=>r[1]))||1;
  return `<div class="stack" style="gap:8px">${rows.map(([l,v,extra])=>`<div style="display:grid;grid-template-columns:minmax(90px,150px) 1fr auto;gap:10px;align-items:center;font-size:12.5px"><span class="ink2">${l}</span><div class="bar" style="height:10px"><i style="width:${v/max*100}%;background:${color}"></i></div><span class="mono" style="min-width:64px;text-align:right">${fmt(v)}${extra?` <span class="muted">${extra}</span>`:''}</span></div>`).join('')}</div>`;
}

/* creative renderer */
function creativeHTML(cr, fmt, scale=1){
  const f = FORMATS[fmt]||FORMATS['300x250']; const w=f.w*scale, h=f.h*scale;
  const tall = h/w > 1.2, thin = h < 110*scale;
  const hlSize = Math.max(10, Math.min(thin? h*.34 : tall? w*.11 : Math.min(w*.07, h*.13), 34*scale));
  const inner = cr.img ? `<img src="${cr.img}" alt="${esc(cr.headline)}">`
    : `<div style="display:flex;${tall?'flex-direction:column;justify-content:space-between;align-items:flex-start':'align-items:center;justify-content:space-between'};width:100%;height:100%;gap:${6*scale}px;${tall?'padding:'+14*scale+'px 0':''}">
         <div style="display:flex;flex-direction:column;gap:${3*scale}px;min-width:0"><span class="hl" style="font-size:${hlSize}px">${esc(cr.headline)}</span>${thin&&h<60?'':`<span class="sub" style="font-size:${Math.max(9,hlSize*.45)}px">${esc(cr.sub)}</span>`}</div>
         <span class="cta" style="font-size:${Math.max(9,Math.min(12,hlSize*.5))}px">${esc(cr.cta)} →</span></div>`;
  return `<div class="adslot" style="width:${w}px;height:${h}px"><span class="adtag">Ad</span><div class="creative" style="background:linear-gradient(120deg,${cr.c1},${cr.c2});position:relative">${fmt==='video'?`<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${40*scale}px;height:${40*scale}px;border-radius:50%;background:#0008;display:grid;place-items:center;font-size:${16*scale}px">▶</span>`:''}${inner}</div></div>`;
}
function devicePreview(cr, fmtDesk, fmtMob, site='cd'){
  return `<div class="pv-wrap">
    <div class="device" style="flex:1 1 420px;max-width:620px"><div class="chrome"><i></i><i></i><i></i>&nbsp;${SITES[site].name.toLowerCase()}.com · desktop</div>
      <div class="page-mock"><div class="row" style="justify-content:space-between"><div class="ln" style="width:22%;height:10px"></div><div class="ln" style="width:40%"></div></div>
      <div style="display:flex;justify-content:center;overflow:hidden">${creativeHTML(cr, fmtDesk, fmtDesk==='970x250'||fmtDesk==='expandable'?.58:fmtDesk==='728x90'?.75:.7)}</div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px"><div class="stack" style="gap:6px"><div class="blk" style="height:90px"></div><div class="ln"></div><div class="ln" style="width:80%"></div><div class="ln" style="width:60%"></div></div><div class="blk" style="height:120px"></div></div></div></div>
    <div class="device" style="width:206px"><div class="chrome"><i></i>&nbsp;mobile</div>
      <div class="page-mock" style="height:340px;position:relative"><div class="ln" style="width:40%;height:10px"></div><div class="blk" style="height:80px"></div><div class="ln"></div><div class="ln" style="width:70%"></div>
      <div style="display:flex;justify-content:center">${creativeHTML(cr, fmtMob, fmtMob==='300x250'||fmtMob==='native'||fmtMob==='carousel'?.58:fmtMob==='video'?.29:.58)}</div><div class="ln"></div><div class="ln" style="width:60%"></div></div></div>
  </div>`;
}

/* ---------- audience builder component ---------- */
const DIM_ORDER = ['price_car','price_bike','body_car','body_bike','fuel','market','vehicle','brand','model','intent','intent_lvl','recency','visitor','tier'];
function builderHTML(path){
  const aud = getPath(S, path);
  return `<div class="stack">${aud.groups.map((g,gi)=>`
    ${gi?'<div class="row" style="justify-content:center"><span class="joiner">OR</span></div>':''}
    <div class="rgroup"><div class="gh"><span class="eyebrow">Group ${gi+1}</span><span>users must match every condition</span><span style="flex:1"></span>${aud.groups.length>1?`<button class="btn sm ghost" data-act="b-delgrp" data-path="${path}" data-g="${gi}">Remove group</button>`:''}</div>
    ${g.rules.map((r,ri)=>`<div class="rule">
        <select id="op-${path}-${gi}-${ri}" data-act-change="b-op" data-path="${path}" data-g="${gi}" data-r="${ri}" aria-label="Operator">
          <option value="and" ${!r.neg?'selected':''}>${ri? 'AND':'WHERE'}</option><option value="not" ${r.neg?'selected':''}>${ri?'AND NOT':'NOT'}</option></select>
        <select id="dim-${path}-${gi}-${ri}" data-act-change="b-dim" data-path="${path}" data-g="${gi}" data-r="${ri}" aria-label="Dimension">${DIM_ORDER.map(d=>`<option value="${d}" ${d===r.dim?'selected':''}>${DIMS[d].label}</option>`).join('')}</select>
        <div class="row" style="gap:5px">${Object.entries(DIMS[r.dim].vals).map(([v,[l]])=>`<button class="chipv" data-act="b-val" data-path="${path}" data-g="${gi}" data-r="${ri}" data-val="${v}" aria-pressed="${r.vals.includes(v)}">${l}</button>`).join('')}</div>
        <button class="x" data-act="b-delrule" data-path="${path}" data-g="${gi}" data-r="${ri}" aria-label="Remove condition"><span class="msi s20">close</span></button></div>`).join('')}
    <div><button class="btn sm" data-act="b-addrule" data-path="${path}" data-g="${gi}">+ Condition</button></div></div>`).join('')}
    <div><button class="btn sm" data-act="b-addgrp" data-path="${path}">+ OR group</button></div></div>`;
}
function audSummary(aud){
  const gs=(aud?.groups||[]).filter(g=>g.rules.some(r=>r.vals.length));
  if (!gs.length) return 'All automotive visitors';
  return gs.map(g=>g.rules.filter(r=>r.vals.length).map(r=>(r.neg?'NOT ':'')+r.vals.map(v=>dimLabel(r.dim,v)).join(' / ')).join(' AND ')).map(s=>'('+s+')').join(' OR ');
}

/* ---------- events ---------- */
const ACT = {
  go: el => go(el.dataset.v),
  'new-camp': () => { S.draft = newDraft(); S.wiz=0; go('create'); },
  set: el => { const v=el.dataset.val; const cur=getPath(S,el.dataset.path); setPath(S, el.dataset.path, typeof cur==='number'? +v : v); rr(el.dataset.rr); },
  toggle: el => { const arr=getPath(S,el.dataset.path); const v=el.dataset.val; const i=arr.indexOf(v); i>=0?arr.splice(i,1):arr.push(v); rr(el.dataset.rr||'1'); },
  'b-addrule': el => { getPath(S,el.dataset.path).groups[+el.dataset.g].rules.push({dim:'intent',vals:[]}); rr('1'); },
  'b-addgrp': el => { getPath(S,el.dataset.path).groups.push({rules:[{dim:'price_car',vals:[]}]}); rr('1'); },
  'b-delgrp': el => { getPath(S,el.dataset.path).groups.splice(+el.dataset.g,1); rr('1'); },
  'b-delrule': el => { const g=getPath(S,el.dataset.path).groups[+el.dataset.g]; g.rules.splice(+el.dataset.r,1); if(!g.rules.length) g.rules.push({dim:'price_car',vals:[]}); rr('1'); },
  'b-val': el => { const r=getPath(S,el.dataset.path).groups[+el.dataset.g].rules[+el.dataset.r]; const v=el.dataset.val; const d=DIMS[r.dim];
     if (d.single) r.vals=[v]; else { const i=r.vals.indexOf(v); i>=0?r.vals.splice(i,1):r.vals.push(v); } if (S.draft && el.dataset.path==='draft.audience') S.draft.audienceName='Custom audience'; rr('1'); },
};
const ACT_CHANGE = {
  'b-op': el => { getPath(S,el.dataset.path).groups[+el.dataset.g].rules[+el.dataset.r].neg = el.value==='not'; rr('1'); },
  'b-dim': el => { const r=getPath(S,el.dataset.path).groups[+el.dataset.g].rules[+el.dataset.r]; r.dim=el.value; r.vals=DIMS[el.value].single?['30d']:[]; rr('1'); },
};
function rr(mode){ if (mode==='0') return; if (mode==='pops'){ renderPops(); return; } if (mode==='fc'){ const f=$('#fc'); if (f) f.innerHTML=forecastPanel(); return; } render(); }
document.addEventListener('click', e=>{
  const sw = e.target.closest('#sw-adv,#sw-adm'); if (sw){ S.console = sw.id==='sw-adv'?'adv':'adm'; S.view = S.console==='adv'?'campaigns':'overview'; render(); return; }
  const el = e.target.closest('[data-act]'); if (!el) return; const f = ACT[el.dataset.act]; if (f){ e.preventDefault(); f(el, e); }
});
document.addEventListener('change', e=>{
  const el=e.target;
  if (el.dataset.actChange && ACT_CHANGE[el.dataset.actChange]) return ACT_CHANGE[el.dataset.actChange](el);
  if (el.dataset.bind){ let v = el.type==='checkbox'? el.checked : el.value; if (el.type==='number' || el.dataset.num) v=+v; setPath(S, el.dataset.bind, v); rr(el.dataset.rr||'0'); }
});
document.addEventListener('input', e=>{
  const el=e.target; if (!el.dataset.bind || el.tagName==='SELECT' || el.type==='checkbox') return;
  let v=el.value; if (el.type==='number'||el.type==='range') v=+v; setPath(S, el.dataset.bind, v);
  if (el.dataset.live) rr(el.dataset.live);
});
