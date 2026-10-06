/* =========================================================
   TORQUE — first-party automotive ad platform (prototype)
   Everything below runs in the browser on generated sample data.
   ========================================================= */
const TODAY = new Date('2026-09-23T12:00:00+05:30');
const DAY = 86400000;
const K_ANON = 1000;          // minimum users for any targetable audience
const REPORT_K = 100;         // minimum impressions before a report row is shown

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function rng(seed){ let s = 0; for (const c of String(seed)) s = (s*31 + c.charCodeAt(0)) >>> 0; return () => { s = (s*1664525 + 1013904223) >>> 0; return s/4294967296; }; }
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const sum = a => a.reduce((x,y)=>x+y,0);
function fmtN(n){ n = +n||0; if (n>=1e7) return (n/1e6).toFixed(1).replace(/\.0$/,'')+'M'; if (n>=1e6) return (n/1e6).toFixed(1).replace(/\.0$/,'')+'M'; if (n>=1e3) return (n/1e3).toFixed(n>=1e5?0:1).replace(/\.0$/,'')+'K'; return Math.round(n).toLocaleString('en-IN'); }
function fmtINR(n){ n = +n||0; const a=Math.abs(n); if (a>=1e7) return '₹'+(n/1e7).toFixed(2).replace(/\.?0+$/,'')+'Cr'; if (a>=1e5) return '₹'+(n/1e5).toFixed(2).replace(/\.?0+$/,'')+'L'; if (a>=1e3) return '₹'+(n/1e3).toFixed(1).replace(/\.0$/,'')+'K'; return '₹'+n.toFixed(n<100&&n%1?2:0); }
const fmtINRx = n => '₹'+Math.round(n).toLocaleString('en-IN');
const pct = (n,d=1) => (isFinite(n)? (n*100).toFixed(d):'0')+'%';
const dstr = d => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
const iso = d => new Date(d).toISOString().slice(0,10);
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,2600); }

/* ---------- properties & traffic (sample) ---------- */
const SITES = {
  cd:{ id:'cd', name:'CarDekho',  uv:28e6,  pv:196e6, car:1,   bike:0 },
  bd:{ id:'bd', name:'BikeDekho', uv:6.4e6, pv:31e6,  car:0,   bike:1 },
  zw:{ id:'zw', name:'ZigWheels', uv:9.2e6, pv:47e6,  car:.68, bike:.32 },
};
const PAGE_TYPES = {
  cd:[['home','Homepage',.07],['listing','Car listing',.15],['model','Car model / detail',.30],['search','Search',.07],['compare','Comparison',.08],['used','Used-car pages',.17],['offers','Offers',.07],['emi','EMI / finance',.09]],
  bd:[['home','Homepage',.09],['listing','Bike listing',.20],['model','Bike model / detail',.38],['compare','Comparison',.10],['search','Search',.10],['offers','Offers',.13]],
  zw:[['carpages','Car pages',.33],['bikepages','Bike pages',.19],['compare','Comparison',.10],['search','Search',.08],['ev','EV pages',.09],['reviews','Reviews',.21]],
};
const pageName = (site, pt) => (PAGE_TYPES[site].find(p=>p[0]===pt)||[pt,pt])[1];

const FORMATS = {
  '300x250':{w:300,h:250,kind:'Display',dev:'both'}, '300x600':{w:300,h:600,kind:'Display',dev:'desktop'},
  '728x90':{w:728,h:90,kind:'Display',dev:'desktop'}, '970x250':{w:970,h:250,kind:'Display',dev:'desktop'},
  '320x50':{w:320,h:50,kind:'Display',dev:'mobile'}, '320x100':{w:320,h:100,kind:'Display',dev:'mobile'},
  'native':{w:300,h:250,kind:'Native',dev:'both'}, 'expandable':{w:970,h:250,kind:'Rich media',dev:'desktop'},
  'video':{w:640,h:360,kind:'Rich media',dev:'both'}, 'carousel':{w:300,h:250,kind:'Rich media',dev:'both'},
};
const GEOS = ['Delhi NCR','Mumbai','Bengaluru','Chennai','Hyderabad','Pune','Kolkata','Ahmedabad','Jaipur','Lucknow','Chandigarh','Rest of India'];
const GEO_SHARE = [.14,.11,.10,.06,.07,.06,.05,.04,.035,.03,.025,.29];

/* Inventory: generated per site × page type × device × position */
const SLOT_TEMPLATES = {
  desktop:[['Top leaderboard','728x90',.95,1],['Billboard','970x250',.6,1.6],['Right rail MPU','300x250',.9,1.2],['Half-page','300x600',.55,1.8],['In-feed native','native',.7,1.3],['Expandable masthead','expandable',.25,2.4],['In-article video','video',.3,3.0]],
  mobile:[['Sticky footer','320x50',.98,.7],['Top banner','320x100',.85,1],['In-content MPU','300x250',.9,1.25],['In-feed native','native',.8,1.35],['Native carousel','carousel',.35,1.8],['Outstream video','video',.35,2.8]],
};
const HOME_LIKE = new Set(['home','listing','carpages','bikepages','ev']);
const INVENTORY = [];
(function buildInventory(){
  const r = rng('inv');
  for (const s of Object.values(SITES)) for (const [pt,,share] of PAGE_TYPES[s.id]) for (const dev of ['desktop','mobile']) {
    const devShare = dev==='mobile' ? .78 : .22;
    for (const [pos,fmt,fill,prem] of SLOT_TEMPLATES[dev]) {
      if ((fmt==='970x250'||fmt==='expandable') && !HOME_LIKE.has(pt)) continue;
      if (fmt==='300x600' && !['model','reviews','carpages','bikepages','compare'].includes(pt)) continue;
      if (fmt==='video' && !['model','reviews','carpages','bikepages','ev','home'].includes(pt)) continue;
      const imps = Math.round(s.pv * share * devShare * fill);
      const pagePrem = {model:1.25,compare:1.35,emi:1.4,offers:1.3,used:1.05,home:1.15,ev:1.3,reviews:1.1}[pt]||1;
      const floor = Math.round(55 * prem * pagePrem * (s.id==='cd'?1.1:s.id==='zw'?.9:.85));
      INVENTORY.push({ id:`${s.id}-${pt}-${dev[0]}-${fmt}-${pos.replace(/\W+/g,'').slice(0,6).toLowerCase()}`, site:s.id, pt, dev, pos, fmt,
        imps, floor, sold: clamp(.35 + r()*.5 + (prem>2?.1:0),0,.97), active:true });
    }
  }
})();

/* ---------- audience taxonomy ---------- */
/* each dimension: scope (car/bike/any), values with share of that scope's users (30-day window) */
const DIMS = {
  vehicle:   {label:'Vehicle type', scope:'any', multi:false, vals:{car:['Car',.74], bike:['Two-wheeler',.26]}},
  price_car: {label:'Car price segment', scope:'car', vals:{'u5':['Under ₹5L',.14],'5-10':['₹5–10L',.30],'10-15':['₹10–15L',.21],'15-20':['₹15–20L',.13],'20-30':['₹20–30L',.10],'30-50':['₹30–50L',.07],'50+':['₹50L+',.05]}},
  price_bike:{label:'Bike price segment', scope:'bike', vals:{'u1':['Under ₹1L',.46],'1-2':['₹1–2L',.30],'2-3':['₹2–3L',.12],'3-5':['₹3–5L',.08],'5+':['₹5L+',.04]}},
  body_car:  {label:'Car body type', scope:'car', vals:{SUV:['SUV',.41],Hatchback:['Hatchback',.24],Sedan:['Sedan',.14],MUV:['MUV / MPV',.10],Luxury:['Luxury',.06],Pickup:['Pickup',.02]}},
  body_bike: {label:'Bike category', scope:'bike', vals:{Commuter:['Commuter',.38],Scooter:['Scooter',.27],Sports:['Sports',.14],Cruiser:['Cruiser',.12],Adventure:['Adventure',.05],Premium:['Premium (₹3L+)',.12]}},
  fuel:      {label:'Fuel / powertrain', scope:'any', vals:{EV:['Electric (EV)',.12],Petrol:['Petrol',.58],Diesel:['Diesel',.17],CNG:['CNG',.08],Hybrid:['Hybrid',.05]}},
  market:    {label:'Market', scope:'any', vals:{new:['New vehicle shoppers',.71],used:['Used vehicle shoppers',.29]}},
  brand:     {label:'Brand researched', scope:'any', vals:{Maruti:['Maruti Suzuki',.24],Hyundai:['Hyundai',.15],Tata:['Tata Motors',.14],Mahindra:['Mahindra',.13],Kia:['Kia',.07],Toyota:['Toyota',.07],Honda:['Honda',.05],MG:['MG',.03],Skoda:['Skoda / VW',.03],BMW:['BMW',.015],Mercedes:['Mercedes-Benz',.015],Hero:['Hero',.07],TVS:['TVS',.06],Bajaj:['Bajaj',.06],RE:['Royal Enfield',.05],Ather:['Ather',.015],OlaE:['Ola Electric',.02],KTM:['KTM',.015]}},
  model:     {label:'Model considered', scope:'any', vals:{Creta:['Hyundai Creta',.05],Nexon:['Tata Nexon',.045],XUV700:['Mahindra XUV700',.035],ScorpioN:['Mahindra Scorpio-N',.035],Seltos:['Kia Seltos',.03],Brezza:['Maruti Brezza',.04],Swift:['Maruti Swift',.045],GrandVitara:['Maruti Grand Vitara',.03],City:['Honda City',.015],Fortuner:['Toyota Fortuner',.02],Classic350:['RE Classic 350',.02],Apache:['TVS Apache RTR 160',.018],Activa:['Honda Activa',.035],Rizta:['Ather Rizta',.008]}},
  intent:    {label:'Research activity', scope:'any', vals:{onroad:['Checked on-road price',.34],compare:['Compared vehicles',.22],emi:['Used EMI / finance tools',.18],offers:['Checked offers',.15],dealer:['Dealer locator',.06],testdrive:['Booked test drive',.02],lead:['Submitted a lead',.04],reviews:['Read reviews',.31]}},
  intent_lvl:{label:'Intent level', scope:'any', vals:{high:['High intent',.18],medium:['Medium intent',.35],low:['Low intent',.47]}},
  visitor:   {label:'Visitor type', scope:'any', vals:{repeat:['Repeat visitor',.41],new:['New visitor',.59]}},
  recency:   {label:'Last activity', scope:'any', vals:{'7d':['Within 7 days',.44],'14d':['Within 14 days',.66],'30d':['Within 30 days',1]}, single:true},
  tier:      {label:'City tier', scope:'any', vals:{metro:['Metro',.38],tier1:['Tier 1',.27],tier2:['Tier 2 and beyond',.35]}},
};
const dimLabel = (d,v) => (DIMS[d]?.vals[v]||[v])[0];

/* reach estimation ------------------------------------------------ */
function sitePool(sites, scope){
  let t = 0;
  for (const id of sites){ const s = SITES[id]; t += s.uv * (scope==='car'? s.car : scope==='bike'? s.bike : 1); }
  return t * (sites.length>1 ? .82 : 1);          // cross-site de-duplication
}
function groupScope(g){
  let sc = 'any';
  for (const r of g.rules){ if (r.neg) continue; const d = DIMS[r.dim]; if (!d) continue;
    if (d.scope!=='any') sc = d.scope;
    if (r.dim==='vehicle' && r.vals.length===1) sc = r.vals[0]; }
  return sc;
}
function ruleShare(r){ const d = DIMS[r.dim]; if (!d || !r.vals.length) return 1; const s = clamp(sum(r.vals.map(v=>d.vals[v]?.[1]||0)),0,1); return r.neg ? 1-s : s; }
function estimateAudience(aud, sites){
  sites = sites?.length ? sites : ['cd','bd','zw'];
  const all = sitePool(sites,'any');
  const groups = (aud?.groups||[]).filter(g=>g.rules.some(r=>r.vals.length));
  if (!groups.length) return { users: all, share:1, all };
  let notReached = 1;
  for (const g of groups){
    const sc = groupScope(g); const pool = sitePool(sites, sc);
    const shares = g.rules.filter(r=>r.vals.length && !(r.dim==='vehicle' && !r.neg)).map(ruleShare);
    let p = shares.reduce((a,b)=>a*b,1);
    if (shares.length>1) p = Math.min(p * Math.pow(1.45, shares.length-1), Math.min(...shares));   // intent signals co-occur
    notReached *= 1 - clamp(pool*p/all,0,1);
  }
  const users = all * (1-notReached);
  return { users, share: users/all, all };
}
/* ad opportunities per user per month on selected inventory */
function inventoryFor(sel){
  return INVENTORY.filter(i => i.active && sel.sites.includes(i.site)
    && (!sel.pageTypes?.length || sel.pageTypes.includes(i.pt))
    && (!sel.devices?.length || sel.devices.includes(i.dev))
    && (!sel.formats?.length || sel.formats.includes(i.fmt)));
}
function forecast(c){
  const est = estimateAudience(c.audience, c.sites);
  const inv = inventoryFor(c);
  const invImps = sum(inv.map(i=>i.imps));
  const siteAll = sum(c.sites.map(id=>SITES[id].pv*2.6));        // all ad opportunities on those sites
  const geoShare = c.geos?.length ? sum(c.geos.map(g=>GEO_SHARE[GEOS.indexOf(g)]||0)) : 1;
  const availImps = invImps * est.share * geoShare;
  const unsold = sum(inv.map(i=>i.imps*(1-i.sold))) * est.share * geoShare;
  const days = Math.max(1, Math.round((new Date(c.end)-new Date(c.start))/DAY)+1);
  const monthScale = days/30;
  const freqPerMonth = (c.freq?.n||3) * (c.freq?.per==='week'? 30/7 : c.freq?.per==='flight' ? 1/monthScale : 30) ;
  const pageShare = siteAll? invImps/siteAll : 0;
  const reachable = est.users * geoShare * clamp(pageShare*2.2,0.05,1);
  const budgetImps = c.model==='CPM' ? c.budget/c.bid*1000 : c.model==='CPC' ? c.budget/c.bid/0.011 : c.model==='CPL' ? c.budget/c.bid/0.011/0.035 : Infinity;
  const capImps = reachable * freqPerMonth * monthScale * .35;     // users rarely hit the cap every day
  const deliverable = Math.min(unsold*monthScale, capImps);
  const estImps = Math.min(deliverable, budgetImps);
  const estReach = Math.min(reachable, estImps / Math.max(1.3, Math.min(freqPerMonth*monthScale*.12, 6)));
  return { users: est.users*geoShare, availMonthly: availImps, unsoldMonthly: unsold, estImps, estReach, budgetImps, deliverable,
    ok: est.users*geoShare >= K_ANON, canDeliver: deliverable >= budgetImps*.95, days, invCount: inv.length };
}

/* ---------- predefined packages ---------- */
const PACKAGES = [
  {id:'mass', name:'Mass Auto Audience', desc:'All automotive visitors across the three sites.', sites:['cd','bd','zw'], cpm:140, aud:{groups:[]}},
  {id:'entry', name:'Entry Car Buyers', desc:'Researching cars priced below ₹10 lakh.', sites:['cd','zw'], cpm:190, aud:{groups:[{rules:[{dim:'price_car',vals:['u5','5-10']}]}]}},
  {id:'premium', name:'Premium Car Buyers', desc:'Researching cars priced above ₹20 lakh.', sites:['cd','zw'], cpm:320, aud:{groups:[{rules:[{dim:'price_car',vals:['20-30','30-50','50+']}]}]}},
  {id:'lux', name:'Luxury Audience', desc:'Researching cars priced above ₹50 lakh.', sites:['cd','zw'], cpm:520, aud:{groups:[{rules:[{dim:'price_car',vals:['50+']}]}]}},
  {id:'ev', name:'EV Audience', desc:'Researching electric cars and scooters.', sites:['cd','bd','zw'], cpm:280, aud:{groups:[{rules:[{dim:'fuel',vals:['EV']}]}]}},
  {id:'suv', name:'SUV Audience', desc:'Researching SUVs in any price segment.', sites:['cd','zw'], cpm:240, aud:{groups:[{rules:[{dim:'body_car',vals:['SUV']}]}]}},
  {id:'pbike', name:'Premium Bike Audience', desc:'Researching bikes priced above ₹3 lakh.', sites:['bd','zw'], cpm:260, aud:{groups:[{rules:[{dim:'price_bike',vals:['3-5','5+']}]}]}},
  {id:'used', name:'Used Car Audience', desc:'Actively researching used cars.', sites:['cd'], cpm:200, aud:{groups:[{rules:[{dim:'market',vals:['used']},{dim:'vehicle',vals:['car']}]}]}},
  {id:'hi', name:'Auto Intent — High', desc:'High-intent users: on-road price, EMI, offers or dealer activity in the last 14 days.', sites:['cd','bd','zw'], cpm:360, aud:{groups:[{rules:[{dim:'intent_lvl',vals:['high']},{dim:'recency',vals:['14d']}]}]}},
];

/* ---------- saved audiences ---------- */
const AUDIENCES = [
  {id:'a1', name:'Premium SUV Intenders', note:'SUV · ₹20–30L · researched · last 30 days', aud:{groups:[{rules:[{dim:'body_car',vals:['SUV']},{dim:'price_car',vals:['20-30']},{dim:'intent',vals:['onroad','compare','reviews']},{dim:'recency',vals:['30d']}]}]}},
  {id:'a2', name:'Mid-SUV or EV switchers', note:'SUV ₹15–20L OR EV ₹10–20L', aud:{groups:[{rules:[{dim:'body_car',vals:['SUV']},{dim:'price_car',vals:['15-20']},{dim:'recency',vals:['30d']}]},{rules:[{dim:'fuel',vals:['EV']},{dim:'price_car',vals:['10-15','15-20']}]}]}},
  {id:'a3', name:'Finance-ready hatchback buyers', note:'Hatchback · EMI tool · not used', aud:{groups:[{rules:[{dim:'body_car',vals:['Hatchback']},{dim:'intent',vals:['emi']},{dim:'market',vals:['used'],neg:true}]}]}},
  {id:'a4', name:'Creta / Seltos conquest', note:'Considering Creta or Seltos', aud:{groups:[{rules:[{dim:'model',vals:['Creta','Seltos']},{dim:'intent_lvl',vals:['high','medium']}]}]}},
];

/* ---------- advertisers & campaigns ---------- */
const ADVERTISERS = [
  {id:'v1', name:'Apex Motors',            type:'OEM',           wallet:1850000, credit:5000000, status:'Active', kyc:'Verified', since:'2025-11-04', owner:'Ritika S.'},
  {id:'v2', name:'Voltra EV',               type:'OEM (EV)',      wallet:620000,  credit:2000000, status:'Active', kyc:'Verified', since:'2026-02-18', owner:'Aman K.'},
  {id:'v3', name:'Northstar Bank — Auto Loans', type:'BFSI',       wallet:940000,  credit:3000000, status:'Active', kyc:'Verified', since:'2026-01-09', owner:'Ritika S.'},
  {id:'v4', name:'Ridgeway Two-Wheelers',   type:'OEM (2W)',      wallet:310000,  credit:1000000, status:'Active', kyc:'Verified', since:'2026-03-22', owner:'Farhan M.'},
  {id:'v5', name:'SureCover Insurance',     type:'Insurance',     wallet:150000,  credit:500000,  status:'Active', kyc:'Verified', since:'2026-05-02', owner:'Aman K.'},
  {id:'v6', name:'Meridian Luxury Cars',    type:'Dealer group',  wallet:480000,  credit:1500000, status:'Active', kyc:'Verified', since:'2026-06-14', owner:'Farhan M.'},
  {id:'v7', name:'Crestline Tyres',         type:'Aftermarket',   wallet:0,       credit:0,       status:'Onboarding', kyc:'Pending', since:'2026-09-19', owner:'Ritika S.'},
];
const advName = id => ADVERTISERS.find(a=>a.id===id)?.name || id;

const mkCreative = (hl, sub, cta, c1, c2, url) => ({type:'banner', headline:hl, sub, cta, c1, c2, url, img:null});
const CAMPAIGNS = [
  {id:'C-1041', name:'Apex Terrain SUV — Launch', adv:'v1', objective:'Product/Model Launch', sites:['cd','zw'], audienceName:'Mid-SUV or EV switchers', audience:AUDIENCES[1].aud,
   pageTypes:['model','compare','carpages','home'], devices:['desktop','mobile'], formats:['970x250','300x250','300x600','native','video','320x100'], geos:[],
   start:'2026-09-01', end:'2026-09-30', budget:1000000, daily:40000, model:'CPM', bid:320, freq:{n:3,per:'day'}, priority:7, paused:false,
   creative:mkCreative('The Terrain. Built for every road.','Ex-showroom from ₹21.9L*','Book a test drive','#1B2B3A','#0A6F6A','https://example.com/terrain')},
  {id:'C-1042', name:'Voltra E3 — EV Conquest', adv:'v2', objective:'Lead Generation', sites:['cd','bd','zw'], audienceName:'EV Audience', audience:PACKAGES[4].aud,
   pageTypes:[], devices:['mobile','desktop'], formats:['300x250','native','320x50','320x100','carousel'], geos:['Delhi NCR','Mumbai','Bengaluru','Pune','Hyderabad'],
   start:'2026-09-05', end:'2026-10-20', budget:750000, daily:18000, model:'CPL', bid:450, freq:{n:5,per:'day'}, priority:6, paused:false,
   creative:mkCreative('Go electric for ₹1.9/km.','Voltra E3 · 410 km range','Get on-road price','#10302E','#35B7AE','https://example.com/e3')},
  {id:'C-1043', name:'Northstar Auto Loan — Festive', adv:'v3', objective:'Lead Generation', sites:['cd'], audienceName:'Finance-ready hatchback buyers', audience:AUDIENCES[2].aud,
   pageTypes:['emi','offers','model'], devices:['mobile','desktop'], formats:['300x250','native','320x100','728x90'], geos:[],
   start:'2026-09-10', end:'2026-10-31', budget:600000, daily:12000, model:'CPC', bid:14, freq:{n:3,per:'day'}, priority:5, paused:false,
   creative:mkCreative('Car loans from 8.6% p.a.','Approval in 30 minutes','Check eligibility','#2A2150','#3D5BA9','https://example.com/loan')},
  {id:'C-1044', name:'Ridgeway Storm 450 — Awareness', adv:'v4', objective:'Awareness', sites:['bd','zw'], audienceName:'Premium Bike Audience', audience:PACKAGES[6].aud,
   pageTypes:[], devices:['mobile','desktop'], formats:['300x250','320x50','320x100','video','728x90'], geos:[],
   start:'2026-09-15', end:'2026-10-15', budget:300000, daily:10000, model:'CPM', bid:260, freq:{n:3,per:'day'}, priority:5, paused:false,
   creative:mkCreative('Storm 450. Ride further.','Adventure-ready from ₹2.99L*','Explore','#3A1E12','#B5543A','https://example.com/storm')},
  {id:'C-1045', name:'SureCover — Renewal Reminder', adv:'v5', objective:'Traffic', sites:['cd','zw'], audienceName:'Mass Auto Audience', audience:{groups:[]},
   pageTypes:['used','offers','home','carpages'], devices:['mobile'], formats:['320x50','300x250','native'], geos:[],
   start:'2026-09-01', end:'2026-09-30', budget:150000, daily:5000, model:'CPC', bid:9, freq:{n:2,per:'day'}, priority:3, paused:false,
   creative:mkCreative('Renew car insurance in 2 min','Save up to 70% on premium','Get quote','#1E2F1A','#5B7B2E','https://example.com/renew')},
  {id:'C-1046', name:'Meridian — Luxury Homepage Takeover', adv:'v6', objective:'Awareness', sites:['cd'], audienceName:'Luxury Audience', audience:PACKAGES[3].aud,
   pageTypes:['home'], devices:['desktop','mobile'], formats:['970x250','expandable','320x100'], geos:['Delhi NCR','Mumbai','Bengaluru'],
   start:'2026-09-20', end:'2026-09-26', budget:420000, daily:60000, model:'Sponsorship', bid:420000, freq:{n:1,per:'day'}, priority:10, paused:false,
   creative:mkCreative('Luxury, delivered.','Private previews at Meridian','Book a preview','#1A1A1A','#6B5A3A','https://example.com/meridian')},
  {id:'C-1047', name:'Apex Hatch — Festive Offers', adv:'v1', objective:'Dealer Lead Generation', sites:['cd'], audienceName:'Entry Car Buyers', audience:PACKAGES[1].aud,
   pageTypes:['offers','listing','model'], devices:['mobile','desktop'], formats:['300x250','native','320x100'], geos:[],
   start:'2026-10-01', end:'2026-10-31', budget:800000, daily:26000, model:'CPM', bid:190, freq:{n:3,per:'day'}, priority:6, paused:false,
   creative:mkCreative('Festive offers on the Apex Hatch','Benefits up to ₹65,000','View offers','#3A2A12','#C9820C','https://example.com/hatch')},
  {id:'C-1039', name:'Voltra Scooter — Summer Test Ride', adv:'v2', objective:'Test Drive', sites:['bd'], audienceName:'EV Audience', audience:PACKAGES[4].aud,
   pageTypes:[], devices:['mobile'], formats:['320x50','300x250'], geos:[],
   start:'2026-06-01', end:'2026-07-15', budget:250000, daily:6000, model:'CPM', bid:220, freq:{n:3,per:'day'}, priority:5, paused:false,
   creative:mkCreative('Book a free test ride','Voltra S1 · 0 emissions','Book now','#10302E','#35B7AE','https://example.com/s1')},
];

/* delivery state (spend, impressions …) — seeded */
function flight(c){ const s=new Date(c.start+'T00:00:00+05:30'), e=new Date(c.end+'T23:59:59+05:30'); const total=Math.round((e-s)/DAY); const elapsed=clamp((TODAY-s)/DAY,0,total); return {s,e,total,elapsed,remaining:Math.max(0,total-elapsed)}; }
function status(c){ const f=flight(c); if (c.paused) return 'paused'; if (TODAY<f.s) return 'sched'; if (TODAY>f.e || c.stats.spend>=c.budget) return 'ended'; const p=pacing(c); if (p.pace<.8) return 'limited'; return 'live'; }
const STATUS_LABEL = {live:'Delivering',sched:'Scheduled',paused:'Paused',ended:'Completed',limited:'Under-delivering'};
function effBid(c){ // eCPM
  if (c.model==='CPM') return c.bid;
  if (c.model==='CPC') return c.bid * (c.stats?.ctr||.011) * 1000;
  if (c.model==='CPL') return c.bid * (c.stats?.ctr||.011) * .035 * 1000;
  if (c.model==='Sponsorship') return c.bid / Math.max(1,(forecast(c).estImps||1)) * 1000;
  return c.bid;
}
function seedStats(c){
  const r = rng(c.id); const f = flight(c);
  const paceBias = {'C-1041':1.02,'C-1042':.93,'C-1043':1.0,'C-1044':.71,'C-1045':1.08,'C-1046':1,'C-1039':1}[c.id]||1;
  const frac = f.total ? f.elapsed/f.total : 0;
  const spend = Math.min(c.budget, c.budget*frac*paceBias);
  const ctrBase = {CPM:.0085,CPC:.013,CPL:.012,Sponsorship:.007}[c.model] * (0.85+r()*.4);
  const cpm = c.model==='CPM'? c.bid : c.model==='Sponsorship'? 190 : c.model==='CPC' ? c.bid*ctrBase*1000 : c.bid*ctrBase*.035*1000;
  const imps = Math.round(spend/cpm*1000);
  const clicks = Math.round(imps*ctrBase);
  const conv = Math.round(clicks*(c.objective.includes('Lead')||c.objective==='Test Drive' ? .034+r()*.01 : .012));
  c.stats = { spend, imps, clicks, conv, ctr: imps? clicks/imps : ctrBase, videoViews: c.formats.includes('video')? Math.round(imps*.09):0, todaySpend: f.elapsed>0 && f.remaining>0 ? (c.daily*(.55+r()*.3)) : 0, reach: Math.round(imps/(2.4+r())) };
}
CAMPAIGNS.forEach(seedStats);

/* ---------- pacing engine ---------- */
function pacing(c){
  const f = flight(c); const st = c.stats;
  const ideal = f.total ? c.budget * f.elapsed / f.total : 0;
  const pace = ideal ? st.spend/ideal : 1;
  const remBudget = Math.max(0, c.budget - st.spend);
  const targetDaily = f.remaining>0 ? Math.min(c.daily||Infinity, remBudget / Math.max(1,f.remaining)) : 0;
  const fc = forecast(c);
  const availDailySpend = fc.unsoldMonthly/30 * effBid(c)/1000;
  const throttle = availDailySpend>0 ? clamp(targetDaily/availDailySpend,0.02,1) : 0;
  let state = 'On pace';
  if (pace<.9) state = 'Behind'; if (pace>1.1) state='Ahead';
  if (pace<.9 && c.daily && targetDaily>=c.daily) state='Behind — daily cap limits catch-up';
  if (remBudget<=0) state='Budget exhausted';
  return { ideal, pace, remBudget, targetDaily, throttle, availDailySpend, state, f };
}

/* ---------- ad decisioning ---------- */
const FREQ = new Map();        // key uid|campaign|date → count   (privacy-safe hashed ID)
const DELIVERY_LOG = [];
function hashId(s){ let h=2166136261; for (const c of s) { h^=c.charCodeAt(0); h=Math.imul(h,16777619);} return 'u_'+(h>>>0).toString(16).padStart(8,'0'); }

/* page context → audience attributes (what the classifier emits; never PII) */
function classify(req){
  const a = { site:[req.site], vehicle:[req.vehicle], market:[req.market], fuel:[req.fuel], brand:[req.brand], model:req.model?[req.model]:[],
              intent:req.intents.slice(), visitor:[req.repeat?'repeat':'new'], recency:['7d','14d','30d'], tier:[req.tier] };
  if (req.vehicle==='car'){
    const p=req.price; a.price_car=[p<5?'u5':p<10?'5-10':p<15?'10-15':p<20?'15-20':p<30?'20-30':p<50?'30-50':'50+'];
    a.body_car=[req.body]; if (p>=50 && req.body!=='Luxury') a.body_car.push('Luxury');
  } else {
    const p=req.price; a.price_bike=[p<1?'u1':p<2?'1-2':p<3?'2-3':p<5?'3-5':'5+']; a.body_bike=[req.body]; if (p>=3) a.body_bike.push('Premium');
  }
  const strong = req.intents.filter(i=>['onroad','emi','offers','dealer','testdrive','lead'].includes(i)).length;
  a.intent_lvl = [strong>=2 || (strong>=1 && req.repeat) ? 'high' : req.intents.length ? 'medium' : 'low'];
  return a;
}
function matchAudience(aud, attrs){
  const groups=(aud?.groups||[]).filter(g=>g.rules.some(r=>r.vals.length));
  if (!groups.length) return {ok:true, why:'Run of network'};
  for (const g of groups){
    let ok=true; for (const r of g.rules){ if(!r.vals.length) continue; const have=attrs[r.dim]||[]; const hit=r.vals.some(v=>have.includes(v)); if (r.neg?hit:!hit){ok=false;break;} }
    if (ok) return {ok:true, why:g.rules.filter(r=>r.vals.length).map(r=>(r.neg?'NOT ':'')+r.vals.map(v=>dimLabel(r.dim,v)).join('/')).join(' ∧ ')};
  }
  return {ok:false, why:'No audience group matched'};
}
function decide(req, opts={}){
  const t0 = performance.now();
  const attrs = classify(req);
  const uid = hashId(req.cookie||'anon');
  const day = iso(TODAY);
  const slotFormats = opts.slotFormats || (req.device==='mobile' ? ['300x250','320x50','320x100','native','carousel','video'] : ['728x90','970x250','300x250','300x600','native','expandable','video']);
  const rows = [];
  for (const c of CAMPAIGNS){
    const checks=[]; let ok=true; const fail=(k,why)=>{ checks.push([k,false,why]); ok=false; }; const pass=(k,why)=>checks.push([k,true,why]);
    const f=flight(c);
    c.paused ? fail('Status','Paused') : pass('Status','Active');
    if (ok) (TODAY>=f.s && TODAY<=f.e) ? pass('Flight',`${dstr(f.s)}–${dstr(f.e)}`) : fail('Flight', TODAY<f.s?'Starts '+dstr(f.s):'Ended '+dstr(f.e));
    if (ok) c.sites.includes(req.site) ? pass('Website',SITES[req.site].name) : fail('Website','Not targeting '+SITES[req.site].name);
    if (ok) (!c.pageTypes.length || c.pageTypes.includes(req.pt)) ? pass('Page', pageName(req.site,req.pt)) : fail('Page','Page type not selected');
    if (ok) (!c.devices.length || c.devices.includes(req.device)) ? pass('Device',req.device) : fail('Device','Device excluded');
    if (ok) (!c.geos.length || c.geos.includes(req.geo)) ? pass('Geo',req.geo) : fail('Geo','Outside geo targeting');
    if (ok) { const fm=c.formats.filter(x=>slotFormats.includes(x)); fm.length? pass('Format',fm[0]) : fail('Format','No creative fits slot'); }
    if (ok) { const m=matchAudience(c.audience,attrs); m.ok? pass('Audience',m.why) : fail('Audience',m.why); }
    if (ok) (c.stats.spend < c.budget) ? pass('Budget',fmtINR(c.budget-c.stats.spend)+' left') : fail('Budget','Budget exhausted');
    if (ok) (!c.daily || c.stats.todaySpend < c.daily) ? pass('Daily cap',fmtINR(c.stats.todaySpend)+' / '+fmtINR(c.daily)) : fail('Daily cap','Daily budget reached');
    if (ok) { const k=`${uid}|${c.id}|${day}`; const n=FREQ.get(k)||0; n < c.freq.n ? pass('Frequency',`${n}/${c.freq.n} today`) : fail('Frequency',`Cap reached (${n}/${c.freq.n})`); }
    let thr=1; if (ok && c.model!=='Sponsorship'){ const p=pacing(c); thr=p.throttle; const roll=(opts.rand||Math.random)(); roll<=thr ? pass('Pacing',`throttle ${pct(thr,0)} · roll ${roll.toFixed(2)}`) : fail('Pacing',`Held back to pace (throttle ${pct(thr,0)})`); }
    const ecpm = effBid(c);
    const score = ok ? (c.priority>=10 ? 1e9 : ecpm * (1 + c.priority/10)) : 0;
    rows.push({c, ok, checks, ecpm, score});
  }
  const eligible = rows.filter(r=>r.ok).sort((a,b)=>b.score-a.score);
  const win = eligible[0]||null;
  if (win && !opts.dry){
    const k=`${uid}|${win.c.id}|${day}`; FREQ.set(k,(FREQ.get(k)||0)+1);
    const price = win.c.model==='Sponsorship'? 0 : win.ecpm/1000;
    win.c.stats.imps++; win.c.stats.spend+=price; win.c.stats.todaySpend+=price;
  }
  const ms = performance.now()-t0;
  return { attrs, uid, rows, eligible, win, ms };
}

/* ---------- audit log ---------- */
const AUDIT = [
  ['2026-09-23 10:42','ritika.s@torque','Admin','Raised floor CPM','CarDekho · Car model · Billboard 970x250 → ₹121'],
  ['2026-09-23 09:15','ops@voltra','Advertiser','Viewed report','C-1042 · audience breakdown (aggregated)'],
  ['2026-09-22 18:03','aman.k@torque','Admin','Approved creative','C-1044 · Storm 450 video 16:9'],
  ['2026-09-22 16:27','system','Governance','Suppressed report rows','3 rows below k=100 impressions (C-1046)'],
  ['2026-09-22 11:10','marketing@apex','Advertiser','Saved audience','Premium SUV Intenders · est. 312K users'],
  ['2026-09-21 02:00','system','Governance','Retention purge','Raw event logs older than 90 days deleted (412M rows)'],
  ['2026-09-20 14:55','farhan.m@torque','Admin','Blocked audience rule','“Model considered” with <1,000 users rejected for C-1046'],
];
function audit(actor, role, action, detail){ const d=new Date(); AUDIT.unshift([`${iso(TODAY)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`, actor, role, action, detail]); }
