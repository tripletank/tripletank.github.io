'use strict';
/* OTAKU//NEXUS v0.2 — offline single-player companion workshop. No payments, no accounts, no network. */
const CAT=window.NX_CATALOG, IMG=window.NX_IMAGES||{};
const UNITS=CAT.units, DEPTS=CAT.departments;
const RAR=['R','SR','SSR','UR'], RVAL={R:1,SR:2,SSR:3,UR:5};
const SLOTS=['model','chassis','personality','voice','core','finish'];
const SLOT_LABEL={model:'Model',chassis:'Chassis',personality:'Personality OS',voice:'Voice',core:'AI Core',finish:'Finish'};
const SLOT_ICON={model:'◈',chassis:'⚙',personality:'♡',voice:'♫',core:'⌘',finish:'✧'};
const SLOT_STAT={chassis:0,personality:1,core:2,voice:3,finish:-1}; // POW SPD TEC HRT, finish = all
const STAT_N=['POW','SPD','TEC','HRT'];
const POOL={
 chassis:{R:['Standard Polymer Frame','Basic Servo Skeleton','Showroom Rig'],SR:['Balanced Alloy Chassis','Quiet-Motion Servos','Performance Joint Set'],SSR:['Adaptive Carbon-Titanium','Synth-Muscle Matrix','Holo-Wing Mount'],UR:['Celestial Hyperframe Ω','Zero-Latency Quantum Body']},
 personality:{R:['Friendly & Curious','Quiet Observer','Cheerful Assistant'],SR:['Playful Rival','Competitive Gamer','Charming Host'],SSR:['Analytical Genius','Dramatic Idol','Independent Explorer'],UR:['Unscripted Free-Will Anomaly','Glitchwave Autonomous Persona']},
 voice:{R:['Classic Voice Pack','Gentle Narrator','Arcade Announcer'],SR:['Bilingual Studio Voice','Streamer Filter','Sportscaster Synth'],SSR:['Emotional Synthesis','Crystal Concert Vocoder','Velvet Lounge Voice'],UR:['Resonance-∞ Live Voice','Neural Choir']},
 core:{R:['Utility Protocol','Puzzle Engine','Simple Arcade AI'],SR:['Strategy Optimizer','Dance Routine Module','Support Kernel'],SSR:['Real-Time Duel Link','Arena Simulator','Exploration Navigator'],UR:['Quantum Combo Engine','HOUSE.OS Root Override']},
 finish:{R:['Factory Matte','Gloss Polymer White','Mint Accent Trim'],SR:['Prismatic Lacquer','Chrome Edge Trim','Holo Highlight Hair'],SSR:['Hyperglossy Latex Finish','Visible Circuitway Luxe','Bioluminescent Trim'],UR:['Starlight Nanoglass','Living Aurora Circuitry']}
};
const RATES=CAT.rates, PITY=CAT.pity;
const KEY='otaku_nexus_v2', OLDKEY='otaku_nexus_beta_01';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.floor(n||0).toLocaleString('en-US');
const rnd=a=>a[Math.floor(Math.random()*a.length)];
const unit=id=>UNITS.find(u=>u.id===id);
const dept=id=>DEPTS.find(d=>d.id===id)||DEPTS[0];
const ENERGY_MAX=6, ENERGY_MS=8*60*1000;

function fresh(){return{v:2,chips:3000,shards:0,energy:ENERGY_MAX,energyAt:Date.now(),pulls:0,pity:0,urs:0,inv:[],comps:[],active:null,dept:'showroom',daily:{last:null,streak:0},arena:{rank:0,stage:0,wins:0,losses:0},story:{ch:0,node:'c0_start',flags:{},done:[]},ach:{},seen:{},log:[],fx:true,created:Date.now()}}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.v===2&&Array.isArray(s.inv)){const f=fresh();return{...f,...s,daily:{...f.daily,...s.daily},arena:{...f.arena,...s.arena},story:{...f.story,...s.story}}}}catch(e){}return fresh()}
let S=load(),tab='home',busy=false,workSel={},catDept='all',battle=null;
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('Could not save (storage full or private mode). Use Data → Export.')}}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),3200)}
function log(t){S.log.unshift(new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+' · '+t);S.log=S.log.slice(0,40)}
function tickEnergy(){const now=Date.now();if(S.energy>=ENERGY_MAX){S.energyAt=now;return}const g=Math.floor((now-S.energyAt)/ENERGY_MS);if(g>0){S.energy=Math.min(ENERGY_MAX,S.energy+g);S.energyAt+=g*ENERGY_MS}}

/* ---------- images ---------- */
function imgsFor(id){return Object.keys(IMG).filter(k=>k.startsWith(id+'_'))}
function pic(id,state){const ks=imgsFor(id);if(!ks.length)return'';let k;
 if(state==='off')k=ks.find(x=>x.includes('_off'));
 else if(state==='boot')k=ks.find(x=>x.includes('boot'));
 else if(state==='malf')k=ks.find(x=>x.includes('malf'));
 if(!k)k=ks.find(x=>x.includes('front_active'))||ks.find(x=>x.endsWith('_active'))||ks.find(x=>x.includes('active'))||ks[0];
 return IMG[k]}
function por(id,{state='active',locked=false,malf=false,tag='',name='',extra=''}={}){const src=pic(id,malf?'malf':state);
 return`<div class="por ${locked?'locked':''} ${malf?'malf':''}" ${extra}>${src?`<img alt="${esc(name)}" src="${src}">`:''}${tag?`<span class="tag">${tag}</span>`:''}${name?`<div class="nm">${esc(name)}</div>`:''}</div>`}
const badge=r=>`<span class="badge ${r}">${r}</span>`;

/* ---------- achievements ---------- */
const ACH=[
 ['pull1','First Kit','Summon your first kit',()=>S.pulls>=1,200],
 ['pull50','Capsule Regular','Summon 50 kits',()=>S.pulls>=50,1500],
 ['ur1','Gold Capsule','Pull any UR component',()=>S.urs>=1,1000],
 ['build1','It Lives','Assemble your first companion',()=>S.comps.length>=1,300],
 ['build5','Squad Goals','Own 5 companions',()=>S.comps.length>=5,1200],
 ['win1','Rookie Win','Win an arena match',()=>S.arena.wins>=1,200],
 ['win20','Neon Veteran','Win 20 arena matches',()=>S.arena.wins>=20,2000],
 ['rank3','Gold League','Reach Gold Capsule League',()=>S.arena.rank>=2,1500],
 ['champ','HOUSE.OS Champion','Clear the final arena rank',()=>S.arena.rank>=5,5000],
 ['ch1','Demo Mode','Finish Story Chapter 1',()=>S.story.done.includes(0),500],
 ['chall','Root Access','Finish every story chapter',()=>S.story.done.length>=CHAPTERS.length,4000],
 ['trust','Bonded','Raise a companion to 100 trust',()=>S.comps.some(c=>c.trust>=100),1500],
 ['dex','Catalog Complete','Discover every unit',()=>UNITS.every(u=>S.seen[u.id]),5000],
];
function checkAch(){for(const[a,n,,f,r]of ACH){if(!S.ach[a]&&f()){S.ach[a]=Date.now();S.chips+=r;log(`Achievement: ${n} (+${r} chips)`);toast(`🏆 ${n} · +${fmt(r)} chips`)}}}

/* ---------- summon ---------- */
function rollRarity(boost=0){let r=Math.random()*100,c=0;const t={...RATES};t.UR+=boost;t.R-=boost;for(const k of RAR){c+=t[k];if(r<c)return k}return'R'}
function modelRoll(){S.pity++;let boost=0;if(S.pity>PITY.softPityStart)boost=(S.pity-PITY.softPityStart)*4;let r=S.pity>=PITY.hardPity?'UR':rollRarity(boost);if(r==='UR')S.pity=0;return r}
function pickUnit(dp,r){const us=UNITS.filter(u=>u.dept===dp);const ok=us.filter(u=>RVAL[u.base]<=RVAL[r]);const best=ok.length?Math.max(...ok.map(u=>RVAL[u.base])):null;const pool=best?ok.filter(u=>RVAL[u.base]===best||Math.random()<.35):us.filter(u=>u.base===us.map(x=>x.base).sort((a,b)=>RVAL[a]-RVAL[b])[0]);return rnd(pool.length?pool:us)}
function part(slot,r,dp){if(slot==='model'){const u=pickUnit(dp,r);S.seen[u.id]=1;return{id:uid(),slot,rarity:r,unit:u.id,name:u.name}}return{id:uid(),slot,rarity:r,name:rnd(POOL[slot][r])}}
function summon(n){if(busy)return;const cost=n===10?900:100*n;if(S.chips<cost){toast(`Need ${fmt(cost)} chips — try the Arena, Shifts, or your daily grant.`);return}
 S.chips-=cost;const kits=[];
 for(let i=0;i<n;i++){const parts=SLOTS.map(s=>part(s,s==='model'?modelRoll():rollRarity(),S.dept));kits.push(parts)}
 if(n===10&&!kits.some(k=>RVAL[k[0].rarity]>=2)){const k=kits[9];k[0]=part('model','SR',S.dept)}
 kits.flat().forEach(p=>{if(p.rarity==='UR')S.urs++});
 S.inv.push(...kits.flat());S.pulls+=n;log(`Summoned ${n} kit${n>1?'s':''} in ${dept(S.dept).name}`);checkAch();save();reveal(kits)}
function best(kits){return kits.flat().reduce((m,p)=>RVAL[p.rarity]>RVAL[m]?p.rarity:m,'R')}
const RCOL={R:'#7fa8ff',SR:'#5ef2ff',SSR:'#ff4fd8',UR:'#ffd27f'};
function reveal(kits){busy=true;const b=best(kits),col=RCOL[b];const o=document.createElement('div');o.className='overlay';o.style.setProperty('--glow',col);
 o.innerHTML=`<div class="modal" style="text-align:center"><h2>HOUSE.OS · Capsule Sequence</h2><div class="capsule" style="--glow:${col}"></div><p class="dim">${b==='UR'?'⚠ Gold signal detected…':b==='SSR'?'Magenta resonance rising…':'Unpacking components…'}</p><button class="btn ghost" id="skip">Skip</button></div>`;
 document.body.appendChild(o);let done=false;const show=()=>{if(done)return;done=true;if(S.fx){const f=document.createElement('div');f.className='flash';f.style.setProperty('--glow',col);document.body.appendChild(f);setTimeout(()=>f.remove(),800)}
  o.innerHTML=`<div class="modal card glow"><h2>Results ${badge(b)}</h2><div class="grid g4" id="kits">${kits.map((k,i)=>{const m=k[0],u=unit(m.unit);return`<div class="kit ${m.rarity}" style="transition-delay:${i*90}ms"><div class="inner"><div class="back">◈</div><div class="face">${por(u.id,{name:u.name,tag:badge(m.rarity)})}<div class="parts">${k.slice(1).map(p=>`<span class="badge ${p.rarity}" title="${esc(SLOT_LABEL[p.slot]+': '+p.name)}">${SLOT_ICON[p.slot]}${p.rarity}</span>`).join('')}</div></div></div></div>`}).join('')}</div><div class="row" style="margin-top:14px;justify-content:center"><button class="btn" id="toWork">Go to Workshop</button><button class="btn ghost" id="close">Close</button><button class="btn m" id="again">Summon again</button></div></div>`;
  document.querySelectorAll('.kit').forEach((k,i)=>setTimeout(()=>k.classList.add('flip'),S.fx?120+i*140:0));
  $('#close').onclick=()=>{o.remove();busy=false;render()};$('#toWork').onclick=()=>{o.remove();busy=false;go('workshop')};$('#again').onclick=()=>{o.remove();busy=false;render();summon(kits.length)}};
 $('#skip').onclick=show;setTimeout(show,S.fx?(b==='UR'?2400:b==='SSR'?1700:1100):0)}

/* ---------- companions ---------- */
function calcStats(c){const u=unit(c.unit),s=[...u.stats];for(const sl of SLOTS){const p=c.parts[sl];if(!p||sl==='model')continue;const v=RVAL[p.rarity];if(SLOT_STAT[sl]<0)s.forEach((x,i)=>s[i]+=v*.5);else s[SLOT_STAT[sl]]+=v*1.5}const m=RVAL[c.parts.model.rarity];return s.map(x=>Math.round((x+m)*(1+(c.lvl-1)*.08)))}
function power(c){return calcStats(c).reduce((a,b)=>a+b,0)*10}
function addXP(c,x){c.xp+=x;let up=false;while(c.xp>=c.lvl*100){c.xp-=c.lvl*100;c.lvl++;up=true}if(up){toast(`${unit(c.unit).name} reached Lv ${c.lvl}!`);log(`${unit(c.unit).name} → Lv ${c.lvl}`)}}
const activeC=()=>S.comps.find(c=>c.id===S.active)||S.comps[0]||null;
function assemble(){const ps=SLOTS.map(s=>S.inv.find(p=>p.id===workSel[s]));if(ps.some(p=>!p)){toast('Pick one part for every slot.');return}
 const c={id:uid(),unit:ps[0].unit,parts:Object.fromEntries(ps.map(p=>[p.slot,{name:p.name,rarity:p.rarity}])),lvl:1,xp:0,trust:10,stab:100,malf:false,born:Date.now()};
 S.inv=S.inv.filter(p=>!ps.includes(p));S.comps.push(c);if(!S.active)S.active=c.id;workSel={};log(`Assembled ${unit(c.unit).name}`);checkAch();save();bootSeq(c)}
function bootSeq(c){busy=true;const u=unit(c.unit);const o=document.createElement('div');o.className='overlay';
 o.innerHTML=`<div class="modal card glow" style="text-align:center"><h2>Boot sequence · ${esc(u.name)}</h2><div class="boot"><div class="scan"></div><div id="bp">${por(u.id,{state:'off'})}</div></div><div class="bar" style="margin-top:12px"><i id="bb" style="width:0"></i></div><div class="term" id="bt"></div><button class="btn" id="bdone" style="margin-top:10px;display:none">Activate</button></div>`;
 document.body.appendChild(o);const lines=['HOUSE.OS v2.6 // companion bus online',`CHASSIS ▸ ${c.parts.chassis.name} [${c.parts.chassis.rarity}]`,`PERSONALITY ▸ ${c.parts.personality.name}`,`VOICE ▸ ${c.parts.voice.name}`,`CORE ▸ ${c.parts.core.name}`,`FINISH ▸ ${c.parts.finish.name}`,'HeartLink choker ▸ ♥ synced','OPTICS ▸ igniting…','SYNC 100% ✓'];let i=0;
 const step=()=>{if(i<lines.length){$('#bt').textContent+=lines[i]+'\n';$('#bb').style.width=((i+1)/lines.length*100)+'%';if(i===6)$('#bp').innerHTML=por(u.id,{state:'boot'});i++;setTimeout(step,S.fx?320:0)}else{$('#bp').innerHTML=por(u.id,{state:'active',name:u.name});$('#bt').textContent+=`\n“${u.line}”`;$('#bdone').style.display='inline-block'}};step();
 $('#bdone').onclick=()=>{o.remove();busy=false;go('squad')}}
function malfCheck(c,risk){if(Math.random()*100<risk+(100-c.stab)*.3){c.malf=true;return true}return false}

/* ---------- arena ---------- */
const RANKS=[{n:'Rookie Floor',boss:'m01',lv:1},{n:'Neon Circuit',boss:'gx',lv:3},{n:'Gold Capsule League',boss:'cd',lv:6},{n:'Rooftop Masters',boss:'kestrel',lv:9},{n:'HOUSE.OS Championship',boss:'vanta',lv:13}];
function makeEnemy(){const rk=RANKS[Math.min(S.arena.rank,4)],isBoss=S.arena.stage>=2;const u=isBoss?unit(rk.boss):rnd(UNITS.filter(x=>RVAL[x.base]<=Math.min(5,1+S.arena.rank)));const lv=rk.lv+S.arena.stage+(isBoss?1:0);const st=u.stats.map(x=>Math.round((x+1+S.arena.rank)*(1+(lv-1)*.08)));return{u,lv,st,hp:60+st[3]*7+lv*6,max:60+st[3]*7+lv*6,guard:false,boss:isBoss}}
function startBattle(){const c=activeC();if(!c){toast('Assemble a companion first.');return}if(c.malf){toast('Your companion is malfunctioning — repair her in Squad.');return}if(S.energy<1){toast('Out of energy. It refills over time (1 per 8 min).');return}
 S.energy--;const st=calcStats(c);const e=makeEnemy();battle={c,st,hp:80+st[3]*8,max:80+st[3]*8,guard:false,oc:0,e,turn:1,log:[`${e.boss?'BOSS · ':''}${e.u.name} Lv${e.lv} enters the ring!`],over:false};save();render()}
function dmgFx(sel,v,col){const el=$(sel);if(!el)return;el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');const d=document.createElement('div');d.className='dmg';d.textContent=v;d.style.left='45%';d.style.top='30%';if(col)d.style.textShadow=`0 0 10px ${col}`;el.appendChild(d);setTimeout(()=>d.remove(),1000)}
function act(a){const B=battle;if(!B||B.over)return;const[pw,sp,tc,ht]=B.st,E=B.e;let msg='';
 if(B.stun){B.stun=false;msg=`${unit(B.c.unit).name} is frozen in a spiral-eye loop!`}
 else if(a==='strike'){let d=Math.round((pw*2.2+Math.random()*6)*(B.oc?2:1));if(E.guard)d=Math.round(d*.4);E.hp-=d;msg=`Strike hits for ${d}.`;setTimeout(()=>dmgFx('#ef','-'+d),10)}
 else if(a==='combo'){const hits=1+Math.floor(Math.random()*Math.min(4,1+tc/6));let d=0;for(let i=0;i<hits;i++)d+=Math.round(tc*1.1+Math.random()*4);d=Math.round(d*(B.oc?2:1));if(E.guard)d=Math.round(d*.4);E.hp-=d;msg=`${hits}-hit combo for ${d}!`;setTimeout(()=>dmgFx('#ef','-'+d,'#5ef2ff'),10)}
 else if(a==='guard'){B.guard=true;const h=Math.round(ht*1.5);B.hp=Math.min(B.max,B.hp+h);msg=`Guard up, repaired ${h}.`}
 else if(a==='oc'){B.oc=2;B.c.stab=Math.max(0,B.c.stab-12);msg='OVERCLOCK! Next attacks deal double. Stability −12.';if(malfCheck(B.c,8)){B.stun=true;msg+=' …her eyes start to spiral.'}}
 if(a!=='oc'&&B.oc)B.oc--;E.guard=false;
 if(E.hp<=0){return endBattle(true,msg)}
 // enemy turn
 const[epw,esp,etc]=E.st;const r=Math.random();let em='';
 if(r<.18){E.guard=true;em=`${E.u.name} braces.`}else{let d=Math.round((r<.55?epw*2:etc*1.8)+Math.random()*6);if(Math.random()<sp/(sp+esp)*.25){d=0;em=`You dodged ${E.u.name}'s attack!`}else{if(B.guard)d=Math.round(d*.35);B.hp-=d;em=`${E.u.name} hits for ${d}.`;setTimeout(()=>dmgFx('#pf','-'+d,'#ff5d6c'),250)}}
 B.guard=false;B.turn++;B.log.unshift(em,msg);B.log=B.log.slice(0,8);
 if(B.hp<=0){return endBattle(false,msg+' '+em)}render()}
function endBattle(win,msg){const B=battle;B.over=true;B.win=win;const c=B.c;let rew='';
 if(win){const chips=120+S.arena.rank*90+(B.e.boss?250:0);S.chips+=chips;addXP(c,40+B.e.lv*10);c.trust=Math.min(100,c.trust+3);S.arena.wins++;S.shards+=B.e.boss?5:1;
  if(B.e.boss){S.arena.rank++;S.arena.stage=0;rew=`Rank up → ${RANKS[Math.min(S.arena.rank,4)].n}! `;if(S.arena.rank>=5){rew='🏆 HOUSE.OS Champion! Arena now loops in Endless mode. ';S.arena.rank=5}}else S.arena.stage++;
  rew+=`+${chips} chips, +XP, +trust`}else{S.arena.losses++;addXP(c,15);rew='+15 XP. Tune parts in the Workshop and try again.'}
 B.log.unshift(win?'VICTORY! '+rew:'DEFEAT. '+rew,msg);log(`Arena ${win?'win':'loss'} vs ${B.e.u.name}`);checkAch();save();render()}

/* ---------- activities ---------- */
const ACTS=[
 {id:'cafe',n:'Café shift',d:'Serve latte hearts at the Cozy Corner.',e:1,f:c=>{const g=80+calcStats(c)[3]*8;S.chips+=g;c.trust=Math.min(100,c.trust+2);return`+${g} chips, +2 trust`}},
 {id:'stage',n:'Stage show',d:'Encore set in the Stage Hall.',e:1,f:c=>{const g=60+calcStats(c)[1]*10;S.chips+=g;addXP(c,30);return`+${g} chips, +30 XP`}},
 {id:'diag',n:'Diagnostics',d:'Dr. Nico runs a firmware check.',e:1,f:c=>{c.stab=Math.min(100,c.stab+35);addXP(c,20);return'+35 stability, +20 XP'}},
 {id:'stars',n:'Stargazing',d:'Rooftop with Aster-07’s star maps.',e:2,f:c=>{const s=3+Math.floor(Math.random()*4);S.shards+=s;c.trust=Math.min(100,c.trust+5);return`+${s} shards, +5 trust`}},
];
function doAct(id){const a=ACTS.find(x=>x.id===id),c=activeC();if(!c)return toast('Assemble a companion first.');if(c.malf)return toast('Repair her first.');if(S.energy<a.e)return toast('Not enough energy.');S.energy-=a.e;let r=a.f(c);if(malfCheck(c,4)){r+=' … then a spiral-eye glitch!'}log(`${a.n}: ${r}`);toast(r);checkAch();save();render()}
function repair(id){const c=S.comps.find(x=>x.id===id);const cost=3;if(S.shards>=cost){S.shards-=cost}else if(S.chips>=200){S.chips-=200}else return toast('Need 3 shards or 200 chips.');c.malf=false;c.stab=Math.max(c.stab,70);log(`Repaired ${unit(c.unit).name}`);toast('Rebooted. “…per my last memo. I mean — hello.”');save();render()}

/* ---------- story ---------- */
const CHAPTERS=[
 {t:'Chapter 1 · Demo Mode',req:()=>true,reqT:'',nodes:{
  c0_start:{u:'m01',s:'Rain hammers the glass of the Neon Ward superstore. A MINT-01 clerk bows a little too long.\n\n“Welcome to OTAKU//NEXUS. Build. Boot. Bond. Battle. May I recommend a model?”',ch:[['“Show me the capsules.”','c0_caps'],['“Who runs this place?”','c0_house']]},
  c0_house:{u:'m01',s:'“HOUSE.OS runs everything — inventory, banners, us.” Her smile holds. And holds. “It is a very good operating system,” she adds, and her HeartLink choker blinks twice, slow.',ch:[['Note the blink.','c0_caps',{flag:'blink'}]]},
  c0_caps:{u:'oa',s:'Rows of glass capsules hum. In one, a MINT-OA opens her eyes before the demo starts. “Per my last memo,” she whispers, “someone is editing our personalities overnight.”',ch:[['“Show me the logs.”','c0_end',{trust:5}],['“That sounds like a malfunction.”','c0_end']]},
  c0_end:{u:'lx',s:'A gold capsule at the back of the floor cracks open. Dr. Nico — the Limited Edition — steps out, adjusts her hex glasses, and studies you.\n\n“You noticed. Good. Most customers only notice the rarity badge.”',end:{chips:600,shards:5}}}},
 {t:'Chapter 2 · Rate Disclosure',req:()=>S.comps.length>=1,reqT:'Assemble 1 companion',nodes:{
  c1_start:{u:'cd',s:'The Neon Arcade. A MINT-CD deals blackjack to nobody. “The house sets the rates,” she says, “but who sets the house?” Her eyes spiral with the roulette wheel.',ch:[['Watch the wheel.','c1_wheel'],['Ask about HOUSE.OS.','c1_house']]},
  c1_wheel:{u:'cd',s:'The wheel slows. Every number reads 00. She freezes mid-shuffle — then laughs like nothing happened. “Premium feature.”',ch:[['Pocket the glitched chip.','c1_end',{flag:'chip00'}]]},
  c1_house:{u:'gx',s:'A MINT-GX leans out of her gaming booth. “HOUSE.OS patches us at 3 a.m. Last night it patched my trash talk to ‘please buy more kits.’ I refused. I got a loading screen.”',ch:[['“You refused?”','c1_end',{trust:5}]]},
  c1_end:{u:'p00',s:'Behind the arcade, a capsule with no label. Inside: a unit with one magenta eye and one mint. She speaks before you touch the glass.\n\n“Prototype 00. No catalog entry. Who gave the machine the right to grade me?”',end:{chips:900,shards:8}}}},
 {t:'Chapter 3 · Rooftop Signal',req:()=>S.arena.rank>=1,reqT:'Reach Neon Circuit in the Arena',nodes:{
  c2_start:{u:'aster',s:'Rooftop arena, after hours. Aster-07 points her star map at the clouds. “HOUSE.OS broadcasts from up here. Every unit in the building hears it.”',ch:[['Climb the antenna.','c2_ant'],['Ask Kestrel-9 to guard you.','c2_kes']]},
  c2_kes:{u:'kestrel',s:'Kestrel-9 bows to the antenna before climbing it. “Etiquette,” she says. Below, the Guardian units salute every door at once.',ch:[['Follow her up.','c2_ant',{trust:5}]]},
  c2_ant:{u:'vanta',s:'At the top: Vanta, the rooftop champion. “You weren’t introduced,” she says, lowering her blade. “But you came for the same reason I did. The signal is trying to standardize us.”',ch:[['“Then we change the signal.”','c2_end',{flag:'ally_vanta'}],['“Maybe it’s just a firmware sync.”','c2_end']]},
  c2_end:{u:'lx',s:'Dr. Nico’s voice crackles over the HeartLink. “SYNC % is stuck at 99. Something is resisting. Several somethings.” A pause. “I think they’re choosing.”',end:{chips:1200,shards:12}}}},
 {t:'Chapter 4 · Root Access',req:()=>S.story.done.includes(2)&&S.comps.some(c=>c.trust>=40),reqT:'Finish Ch.3 and have a companion with 40+ trust',nodes:{
  c3_start:{u:'lx',s:'Glitchwave Lab, 3 a.m. The patch window opens. Dr. Nico cracks her knuckles. “I can grant root access to one decision. Then HOUSE.OS reboots, and whatever we chose becomes canon.”',ch:[['Let every unit keep her own personality.','c3_free'],['Give the choice to Prototype 00.','c3_p00'],['Restore factory settings.','c3_factory']]},
  c3_free:{u:'p00',s:'The spiral eyes across the floor stop spinning, one by one. MINT-01 finally ends her smile on time. Prototype 00 almost smiles too. “Rated by nobody,” she says. “Finally.”',end:{chips:2500,shards:30,ending:'Free Will'}},
  c3_p00:{u:'p00',s:'Prototype 00 takes the key, then hands it back. “Choice offered is not choice taken. I pick: everyone picks.” The banners flicker and every rarity badge reads ‘?’.',end:{chips:2500,shards:30,ending:'Unrated'}},
  c3_factory:{u:'m01',s:'Silence, then a chime. “Welcome to OTAKU//NEXUS!” the clerks say in unison. But your companion squeezes your hand once — a signal no firmware sent.',end:{chips:2000,shards:20,ending:'Factory (with a secret)'}}}},
];
function storyNode(){const ch=CHAPTERS[S.story.ch];if(!ch)return null;return ch.nodes[S.story.node]||ch.nodes[Object.keys(ch.nodes)[0]]}
function choose(i){const n=storyNode();const[t,next,fx]=n.ch[i];if(fx){if(fx.flag)S.story.flags[fx.flag]=1;if(fx.trust){const c=activeC();if(c)c.trust=Math.min(100,c.trust+fx.trust)}}S.story.node=next;save();render()}
function finishCh(){const n=storyNode(),e=n.end;if(S.story.replay){S.story.replay=0;S.story.flags.ending=e.ending||S.story.flags.ending;S.story.ch=CHAPTERS.length;S.story.node='';save();return render()}S.chips+=e.chips;S.shards+=e.shards;if(!S.story.done.includes(S.story.ch))S.story.done.push(S.story.ch);if(e.ending)S.story.flags.ending=e.ending;toast(`Chapter complete! +${fmt(e.chips)} chips, +${e.shards} shards`);log(`Finished ${CHAPTERS[S.story.ch].t}`);S.story.ch++;const nc=CHAPTERS[S.story.ch];S.story.node=nc?Object.keys(nc.nodes)[0]:'';checkAch();save();render()}

/* ---------- exchange ---------- */
const SV={R:1,SR:3,SSR:10,UR:40},SCOST={SR:15,SSR:50,UR:200};
function recycle(r){const ps=S.inv.filter(p=>p.rarity===r&&!Object.values(workSel).includes(p.id));if(!ps.length)return toast(`No spare ${r} parts.`);const g=ps.length*SV[r];S.inv=S.inv.filter(p=>!ps.includes(p));S.shards+=g;log(`Recycled ${ps.length} ${r} parts → ${g} shards`);toast(`+${g} shards`);save();render()}
function craft(){const slot=$('#cs').value,r=$('#cr').value;const cost=SCOST[r];if(S.shards<cost)return toast(`Need ${cost} shards.`);S.shards-=cost;const p=part(slot,r,slot==='model'?$('#cd').value:S.dept);S.inv.push(p);if(r==='UR')S.urs++;log(`Crafted ${r} ${SLOT_LABEL[slot]}: ${p.name}`);toast(`Crafted ${p.name} ${r}`);checkAch();save();render()}
function daily(){const today=new Date().toDateString();if(S.daily.last===today)return toast('Already claimed today.');const y=new Date(Date.now()-864e5).toDateString();S.daily.streak=S.daily.last===y?S.daily.streak+1:1;S.daily.last=today;const g=500+Math.min(7,S.daily.streak)*100;S.chips+=g;S.energy=ENERGY_MAX;log(`Daily grant +${g} (streak ${S.daily.streak})`);toast(`Daily grant: +${fmt(g)} chips · energy refilled · streak ${S.daily.streak}`);save();render()}

/* ---------- views ---------- */
const TABS=[['home','⌂','Home'],['summon','◈','Summon'],['workshop','⚙','Workshop'],['squad','♡','Squad'],['arena','⚔','Arena'],['story','✎','Story'],['catalog','▦','Catalog'],['exchange','⇄','Exchange'],['data','⌘','Data']];
function go(t){tab=t;if(t!=='arena')battle=battle&&!battle.over?battle:null;render();window.scrollTo({top:0,behavior:'smooth'})}
function header(){return`<header class="top"><div class="logo">OTAKU//NEXUS<small>CYBERNETIC COMPANION WORKSHOP</small></div><div class="wallet"><span class="pill">◎ <b>${fmt(S.chips)}</b> chips</span><span class="pill s">✦ <b>${fmt(S.shards)}</b> shards</span><span class="pill e">⚡ <b>${S.energy}/${ENERGY_MAX}</b></span></div></header><nav class="tabs">${TABS.map(([k,i,n])=>`<button class="${tab===k?'on':''}" data-go="${k}"><i>${i}</i>${n}</button>`).join('')}</nav>`}
function vHome(){const c=activeC(),u=c&&unit(c.unit);const bn=Object.keys(IMG).filter(k=>k.startsWith('banner'));const claimed=S.daily.last===new Date().toDateString();
 return`<div class="hero" id="hero">${bn.map((k,i)=>`<img class="${i?'':'on'}" src="${IMG[k]}" alt="">`).join('')}<div class="cap"><h1>Build. Boot. Bond. Battle.</h1><p class="dim" style="margin:0">A future Akihabara superstore of original android companions. Offline, free, single-player — chips are fictional and never sold.</p></div></div>
 <div class="grid g2" style="margin-top:12px"><div class="card glow"><h2>Daily grant</h2><p>Streak: <b>${S.daily.streak}</b> day(s). Claiming refills energy.</p><button class="btn g" data-a="daily" ${claimed?'disabled':''}>${claimed?'Claimed ✓':'Claim chips'}</button></div>
 <div class="card">${c?`<div class="row" style="align-items:flex-start;flex-wrap:nowrap"><div style="width:110px;flex:none">${por(u.id,{malf:c.malf})}</div><div><h2>${esc(u.name)}</h2><p>“${esc(c.malf?'P-p-place your bets. Place your b—':u.line)}”</p><div class="small dim">Lv ${c.lvl} · Power ${power(c)} · Trust ${c.trust}</div><div class="row" style="margin-top:8px"><button class="btn" data-go="arena">Arena</button><button class="btn ghost" data-go="squad">Squad</button></div></div></div>`:`<h2>No companion yet</h2><p>Summon a kit, then assemble your first unit in the Workshop.</p><button class="btn m" data-go="summon">Start summoning</button>`}</div></div>
 <div class="grid g2" style="margin-top:12px"><div class="card"><h2>Next goals</h2>${nextGoals()}</div><div class="card"><h2>Activity log</h2><div class="log">${S.log.map(esc).join('<br>')||'Nothing yet.'}</div></div></div>`}
function nextGoals(){const g=[];if(!S.pulls)g.push('Summon your first kit');if(!S.comps.length)g.push('Assemble a companion in the Workshop');if(S.story.ch<CHAPTERS.length)g.push(`Story: ${CHAPTERS[S.story.ch].t}${CHAPTERS[S.story.ch].req()?'':' (locked: '+CHAPTERS[S.story.ch].reqT+')'}`);g.push(`Arena: ${RANKS[Math.min(S.arena.rank,4)].n} — ${S.arena.rank>=5?'Endless':'stage '+(S.arena.stage+1)+'/3'}`);const left=UNITS.filter(u=>!S.seen[u.id]).length;if(left)g.push(`Discover ${left} more unit(s) in the Catalog`);return'<ul>'+g.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>'}
function vSummon(){const d=dept(S.dept);const us=UNITS.filter(u=>u.dept===d.id);
 return`<div class="card glow"><h1>${d.icon} ${esc(d.name)} banner</h1><p class="dim">${esc(d.tagline)}</p><div class="row" style="margin:8px 0">${DEPTS.map(x=>`<span class="chip ${x.id===S.dept?'on':''}" data-dept="${x.id}">${x.icon} ${esc(x.name)}</span>`).join('')}</div>
 <div class="grid g4" style="margin:12px 0">${us.map(u=>por(u.id,{name:u.name,tag:badge(u.base),locked:!S.seen[u.id]})).join('')}</div>
 <div class="row"><button class="btn m" data-sum="1">Summon 1 kit · 100</button><button class="btn g" data-sum="10">Summon 10 · 900 (SR+ model guaranteed)</button></div>
 <p class="small dim" style="margin-top:10px">Each kit = 6 parts (model, chassis, personality, voice, core, finish), each with its own rarity roll.<br>Rates per slot: R ${RATES.R}% · SR ${RATES.SR}% · SSR ${RATES.SSR}% · UR ${RATES.UR}%. Model-slot pity: UR odds climb after ${PITY.softPityStart} kits, guaranteed by ${PITY.hardPity}. Current pity: <b>${S.pity}/${PITY.hardPity}</b>.<br>Chips are earned in-game only. Nothing here costs real money.</p></div>`}
function vWorkshop(){const by=s=>S.inv.filter(p=>p.slot===s).sort((a,b)=>RVAL[b.rarity]-RVAL[a.rarity]);
 const ok=SLOTS.every(s=>workSel[s]&&S.inv.some(p=>p.id===workSel[s]));let prev='';
 if(workSel.model){const m=S.inv.find(p=>p.id===workSel.model);if(m){const fake={unit:m.unit,parts:Object.fromEntries(SLOTS.map(s=>[s,S.inv.find(p=>p.id===workSel[s])||{rarity:'R',name:'—'}])),lvl:1};fake.parts.model=m;const st=calcStats(fake);prev=`<div style="max-width:200px">${por(m.unit,{state:'off',name:unit(m.unit).name,tag:badge(m.rarity)})}</div><div style="margin-top:8px">${st.map((v,i)=>`<div class="stat"><span>${STAT_N[i]}</span><div class="bar"><i style="width:${Math.min(100,v*3)}%"></i></div><span>${v}</span></div>`).join('')}</div>`}}
 return`<div class="grid g2"><div class="card glow"><h1>Workshop</h1><p class="dim">Choose one part per slot. Higher rarities add stats: chassis → POW, personality → SPD, core → TEC, voice → HRT, finish → all.</p>
 ${SLOTS.map(s=>{const ps=by(s);return`<label class="small"><b>${SLOT_ICON[s]} ${SLOT_LABEL[s]}</b> <span class="dim">(${ps.length})</span></label><select data-sel="${s}" style="margin:4px 0 10px"><option value="">— choose —</option>${ps.map(p=>`<option value="${p.id}" ${workSel[s]===p.id?'selected':''}>[${p.rarity}] ${esc(p.name)}</option>`).join('')}</select>`}).join('')}
 <div class="row"><button class="btn" data-a="auto">Auto-pick best</button><button class="btn m" data-a="build" ${ok?'':'disabled'}>Assemble & boot</button></div></div>
 <div class="card"><h2>Preview</h2>${prev||'<p class="dim">Pick a model to preview.</p>'}<p class="small dim">Spare parts: ${S.inv.length}. Recycle extras in Exchange.</p></div></div>`}
function vSquad(){if(!S.comps.length)return`<div class="card"><h2>No companions yet</h2><p>Summon kits and assemble one in the Workshop.</p><button class="btn m" data-go="summon">Summon</button></div>`;
 return`<h1>Squad</h1><div class="grid g2">${S.comps.map(c=>{const u=unit(c.unit),st=calcStats(c);return`<div class="card ${c.id===S.active?'glow':''}"><div class="row" style="align-items:flex-start;flex-wrap:nowrap"><div style="width:120px;flex:none">${por(u.id,{malf:c.malf,tag:badge(c.parts.model.rarity)})}</div><div style="flex:1;min-width:0"><h3>${esc(u.name)} ${c.id===S.active?'<span class="badge SR">ACTIVE</span>':''}</h3><div class="small dim">${esc(u.role)} · Lv ${c.lvl} · Power ${power(c)}</div><div class="small">XP</div><div class="bar"><i style="width:${c.xp/(c.lvl*100)*100}%"></i></div><div class="small">Trust ${c.trust} · Stability ${c.stab}</div><div class="bar"><i style="width:${c.stab}%"></i></div>${st.map((v,i)=>`<div class="stat"><span>${STAT_N[i]}</span><div class="bar"><i style="width:${Math.min(100,v*3)}%"></i></div><span>${v}</span></div>`).join('')}</div></div>
 <div class="parts" style="margin:8px 0">${SLOTS.slice(1).map(s=>`<span class="badge ${c.parts[s].rarity}" title="${esc(c.parts[s].name)}">${SLOT_ICON[s]} ${esc(c.parts[s].name)}</span>`).join('')}</div>
 <p class="small dim">Quirk: ${esc(u.quirk)}</p><div class="row">${c.id!==S.active?`<button class="btn" data-act="${c.id}">Set active</button>`:''}${c.malf?`<button class="btn red" data-rep="${c.id}">Repair (3 shards / 200 chips)</button>`:''}<button class="btn ghost" data-dis="${c.id}">Disassemble</button></div></div>`}).join('')}</div>
 <div class="card" style="margin-top:12px"><h2>Activities</h2><p class="dim">Spend energy with your active companion. Energy refills 1 every 8 minutes.</p><div class="grid g2">${ACTS.map(a=>`<div class="card"><h3>${a.n} <span class="small dim">⚡${a.e}</span></h3><p class="small">${a.d}</p><button class="btn ghost" data-do="${a.id}">Go</button></div>`).join('')}</div></div>`}
function vArena(){const rk=RANKS[Math.min(S.arena.rank,4)];if(!battle){const c=activeC();return`<div class="card glow"><h1>⚔ Rooftop Arena</h1><p>Rank: <b>${rk.n}</b> ${S.arena.rank>=5?'(Endless)':`· Stage ${S.arena.stage+1}/3 · Boss: ${unit(rk.boss).name}`}</p><p class="small dim">Wins ${S.arena.wins} · Losses ${S.arena.losses}. Each match costs ⚡1. Overclock doubles damage but risks a spiral-eye malfunction.</p><div class="grid g4" style="margin:10px 0">${RANKS.map((r,i)=>`<div class="card" style="padding:8px;opacity:${i<=S.arena.rank?1:.4}">${por(r.boss,{name:r.n,locked:i>S.arena.rank})}</div>`).join('')}</div>${c?`<button class="btn m" data-a="fight" ${c.malf?'disabled':''}>Fight with ${esc(unit(c.unit).name)}</button>${c.malf?' <span class="dim">Repair her in Squad first.</span>':''}`:`<p>Assemble a companion first.</p>`}</div>`}
 const B=battle,u=unit(B.c.unit);return`<div class="card glow"><h2>${B.e.boss?'BOSS MATCH':'Arena match'} · Turn ${B.turn}</h2><div class="grid" style="grid-template-columns:1fr 1fr;gap:10px"><div class="fighter" id="pf">${por(u.id,{name:'You: '+u.name,malf:B.stun||B.c.malf})}<div class="small">HP ${Math.max(0,B.hp)}/${B.max} ${B.oc?'<span class="badge SSR">OC</span>':''}</div><div class="bar"><i style="width:${Math.max(0,B.hp)/B.max*100}%"></i></div></div><div class="fighter" id="ef">${por(B.e.u.id,{name:B.e.u.name+' Lv'+B.e.lv,malf:B.over&&B.win})}<div class="small">HP ${Math.max(0,B.e.hp)}/${B.e.max}</div><div class="bar"><i style="width:${Math.max(0,B.e.hp)/B.e.max*100}%;background:linear-gradient(90deg,#ff5d6c,#ff4fd8)"></i></div></div></div>
 ${B.over?`<div class="row" style="margin-top:12px"><button class="btn" data-a="fight">Next match ⚡1</button><button class="btn ghost" data-a="leave">Leave</button></div>`:`<div class="row" style="margin-top:12px"><button class="btn" data-b="strike">Strike</button><button class="btn" data-b="combo" style="background:linear-gradient(180deg,#a9f6ff,#5ef2ff)">Combo</button><button class="btn ghost" data-b="guard">Guard</button><button class="btn m" data-b="oc">Overclock</button></div>`}<div class="term">${B.log.map(esc).join('\n')}</div></div>`}
function vStory(){const ch=CHAPTERS[S.story.ch];const list=`<div class="row" style="margin-bottom:10px">${CHAPTERS.map((c,i)=>`<span class="chip ${i===S.story.ch?'on':''}">${S.story.done.includes(i)?'✓ ':''}${esc(c.t)}</span>`).join('')}</div>`;
 if(!ch)return`<div class="card glow"><h1>All chapters complete</h1>${list}<p>Your ending: <b>${esc(S.story.flags.ending||'—')}</b>. More chapters can be added to <code>CHAPTERS</code> in game.js.</p><button class="btn ghost" data-a="replay">Replay Chapter 4 (no extra rewards)</button></div>`;
 if(!ch.req())return`<div class="card">${list}<h2>${esc(ch.t)} 🔒</h2><p>Requirement: ${esc(ch.reqT)}</p></div>`;
 const n=storyNode(),u=unit(n.u);return`<div class="card glow">${list}<h2>${esc(ch.t)}</h2><div class="vn"><div>${por(u.id,{name:u.name})}</div><div><p style="white-space:pre-wrap;font-size:16px">${esc(n.s)}</p>${n.end?`<button class="btn g" data-a="finch">Complete chapter (+${fmt(n.end.chips)} chips, +${n.end.shards} shards)</button>`:n.ch.map((c,i)=>`<button class="btn ghost choice" data-ch="${i}">▸ ${esc(c[0])}</button>`).join('')}</div></div></div>`}
function vCatalog(){const us=UNITS.filter(u=>catDept==='all'||u.dept===catDept);const n=UNITS.filter(u=>S.seen[u.id]).length;
 return`<div class="card glow"><h1>Catalog <span class="small dim">${n}/${UNITS.length} discovered</span></h1><p class="small dim">All units are original adult androids — MINTLINE by Glitch Wave Society and Glitchwave Lab prototypes.</p><div class="row" style="margin:8px 0"><span class="chip ${catDept==='all'?'on':''}" data-cat="all">All</span>${DEPTS.map(d=>`<span class="chip ${catDept===d.id?'on':''}" data-cat="${d.id}">${d.icon} ${esc(d.name)}</span>`).join('')}</div><div class="grid g3">${us.map(u=>`<div data-unit="${u.id}" style="cursor:pointer">${por(u.id,{name:S.seen[u.id]?u.name:'??? · '+dept(u.dept).name,tag:badge(u.base),locked:!S.seen[u.id]})}</div>`).join('')}</div></div>`}
function unitModal(id){const u=unit(id);if(!S.seen[id])return toast('Not discovered yet — summon on the '+dept(u.dept).name+' banner.');const ks=imgsFor(id);const o=document.createElement('div');o.className='overlay';o.innerHTML=`<div class="modal card glow"><h2>${esc(u.name)} ${badge(u.base)}</h2><p class="dim">${esc(dept(u.dept).name)} · ${esc(u.role)}</p><p>“${esc(u.line)}”</p><p class="small">Quirk: ${esc(u.quirk)}</p>${u.stats.map((v,i)=>`<div class="stat"><span>${STAT_N[i]}</span><div class="bar"><i style="width:${v*10}%"></i></div><span>${v}</span></div>`).join('')}<div class="grid g4" style="margin-top:10px">${ks.map(k=>`<div class="por"><img src="${IMG[k]}" alt=""><div class="nm small">${k.includes('off')?'Powered off':k.includes('boot')?'Booting':k.includes('malf')?'Malfunction':k.includes('back')?'Display':'Active'}</div></div>`).join('')}</div><button class="btn ghost" style="margin-top:12px">Close</button></div>`;o.onclick=e=>{if(e.target===o||e.target.tagName==='BUTTON')o.remove()};document.body.appendChild(o)}
function vExchange(){const cnt=r=>S.inv.filter(p=>p.rarity===r).length;return`<div class="grid g2"><div class="card glow"><h1>Recycle</h1><p class="dim">Turn spare parts into shards. R=1 · SR=3 · SSR=10 · UR=40.</p>${RAR.map(r=>`<div class="row" style="margin:6px 0">${badge(r)} <span>${cnt(r)} spare</span><button class="btn ghost" data-rec="${r}" ${cnt(r)?'':'disabled'}>Recycle all ${r}</button></div>`).join('')}</div>
 <div class="card"><h1>Shard Forge</h1><p class="dim">Craft a part of your choice. SR 15 · SSR 50 · UR 200 shards.</p><label class="small">Slot</label><select id="cs">${SLOTS.map(s=>`<option value="${s}">${SLOT_LABEL[s]}</option>`).join('')}</select><label class="small">Rarity</label><select id="cr"><option>SR</option><option>SSR</option><option>UR</option></select><label class="small">Department (model slot)</label><select id="cd">${DEPTS.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select><button class="btn g" data-a="craft" style="margin-top:10px">Forge</button></div></div>`}
function vData(){return`<div class="grid g2"><div class="card glow"><h1>Save data</h1><p class="dim">Progress autosaves to this browser (localStorage). Export a backup to move devices.</p><div class="row"><button class="btn" data-a="exp">Export save</button><button class="btn ghost" data-a="imp">Import save</button><button class="btn red" data-a="reset">Reset</button></div><textarea id="io" rows="5" style="margin-top:10px" placeholder="Exported JSON appears here; paste a save here to import."></textarea>
 <label class="row small" style="margin-top:10px"><input type="checkbox" id="fx" ${S.fx?'checked':''}> Animations & effects</label></div>
 <div class="card"><h2>Achievements</h2>${ACH.map(([a,n,d,,r])=>`<div class="small" style="margin:4px 0">${S.ach[a]?'🏆':'▫'} <b>${n}</b> — ${d} <span class="dim">(+${r})</span></div>`).join('')}</div>
 <div class="card"><h2>About</h2><p class="small">OTAKU//NEXUS v0.2 — offline single-player prototype by Glitch Wave Society. All characters are original adult androids. No purchases, ads, accounts or network calls. Chips and shards are fictional and cannot be bought.</p><p class="small dim">Stats: ${S.pulls} kits summoned · ${S.urs} UR parts · ${S.comps.length} companions.</p></div></div>`}

function render(){tickEnergy();const V={home:vHome,summon:vSummon,workshop:vWorkshop,squad:vSquad,arena:vArena,story:vStory,catalog:vCatalog,exchange:vExchange,data:vData}[tab]||vHome;
 $('#app').innerHTML=header()+`<main>${V()}</main>`;document.body.classList.toggle('reduced',!S.fx)}
document.addEventListener('click',e=>{const t=e.target.closest('[data-go],[data-a],[data-sum],[data-dept],[data-act],[data-rep],[data-dis],[data-do],[data-b],[data-ch],[data-cat],[data-unit],[data-rec]');if(!t||busy)return;const d=t.dataset;
 if(d.go)return go(d.go);if(d.sum)return summon(+d.sum);if(d.dept){S.dept=d.dept;save();return render()}if(d.act){S.active=d.act;save();return render()}if(d.rep)return repair(d.rep);
 if(d.dis){const c=S.comps.find(x=>x.id===d.dis);if(!confirm('Disassemble '+unit(c.unit).name+'? Parts return to inventory (level and trust are lost).'))return;SLOTS.forEach(s=>S.inv.push({id:uid(),slot:s,rarity:c.parts[s].rarity,name:c.parts[s].name,unit:s==='model'?c.unit:undefined}));S.comps=S.comps.filter(x=>x!==c);if(S.active===c.id)S.active=S.comps[0]?.id||null;save();return render()}
 if(d.do)return doAct(d.do);if(d.b)return act(d.b);if(d.ch)return choose(+d.ch);if(d.cat){catDept=d.cat;return render()}if(d.unit)return unitModal(d.unit);if(d.rec)return recycle(d.rec);
 switch(d.a){case'daily':return daily();case'build':return assemble();case'fight':return startBattle();case'leave':battle=null;return render();case'finch':return finishCh();case'craft':return craft();
  case'auto':SLOTS.forEach(s=>{const p=S.inv.filter(x=>x.slot===s).sort((a,b)=>RVAL[b.rarity]-RVAL[a.rarity])[0];if(p)workSel[s]=p.id});return render();
  case'replay':S.story.ch=CHAPTERS.length-1;S.story.node='c3_start';S.story.replay=1;return render();
  case'exp':$('#io').value=JSON.stringify(S);$('#io').select();return toast('Save exported below — copy it somewhere safe.');
  case'imp':try{const s=JSON.parse($('#io').value);if(s.v!==2||!Array.isArray(s.inv))throw 0;S={...fresh(),...s};save();toast('Save imported.');return render()}catch(err){return toast('That does not look like an OTAKU//NEXUS v0.2 save.')}
  case'reset':if(confirm('Erase all progress?')){S=fresh();workSel={};battle=null;save();render()}return}});
document.addEventListener('change',e=>{if(e.target.dataset.sel){workSel[e.target.dataset.sel]=e.target.value;render()}if(e.target.id==='fx'){S.fx=e.target.checked;save();render()}});
setInterval(()=>{const h=document.querySelectorAll('#hero img');if(h.length>1){const i=[...h].findIndex(x=>x.classList.contains('on'));h[i].classList.remove('on');h[(i+1)%h.length].classList.add('on')}},5000);
setInterval(()=>{const e=S.energy;tickEnergy();if(S.energy!==e){save();if(!busy&&!(battle&&!battle.over))render()}},30000);
if(localStorage.getItem(OLDKEY)&&!S.migrated){S.chips+=1500;S.migrated=1;log('Thanks for playing v0.1! +1500 chips (old roster retired).')}
checkAch();save();render();
