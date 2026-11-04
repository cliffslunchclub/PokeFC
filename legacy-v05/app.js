'use strict';
/* PokeFC — self-contained client-side prototype, no database or external APIs. */
const $=id=>document.getElementById(id);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const byId=id=>POKEMON.find(p=>p.id===Number(id))||null;
const escapeHTML=str=>String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const randomFrom=arr=>arr[Math.floor(Math.random()*arr.length)];
const randomShuffle=a=>a.slice().sort(()=>Math.random()-.5);
const FORMATIONS={
 '4-3-3':[
 ['GK',50,88],['LB',14,69],['CB',38,72],['CB',62,72],['RB',86,69],['CM',25,48],['CM',50,51],['CM',75,48],['LW',18,24],['ST',50,19],['RW',82,24]],
 '4-4-2':[
 ['GK',50,88],['LB',13,69],['CB',38,72],['CB',62,72],['RB',87,69],['LM',13,45],['CM',38,49],['CM',62,49],['RM',87,45],['ST',35,20],['ST',65,20]],
 '4-2-3-1':[
 ['GK',50,88],['LB',13,71],['CB',38,74],['CB',62,74],['RB',87,71],['CDM',35,56],['CDM',65,56],['LW',16,34],['CAM',50,37],['RW',84,34],['ST',50,17]],
 '3-5-2':[
 ['GK',50,88],['CB',23,70],['CB',50,74],['CB',77,70],['LWB',12,48],['RWB',88,48],['CM',35,52],['CM',65,52],['CAM',50,37],['ST',34,18],['ST',66,18]],
 '4-1-4-1':[
 ['GK',50,88],['LB',13,70],['CB',38,73],['CB',62,73],['RB',87,70],['CDM',50,57],['LM',12,42],['CM',38,42],['CM',62,42],['RM',88,42],['ST',50,18]]
};
const ROLE_LABELS={GK:'Goalkeeper',CB:'Centre-back',LB:'Left-back',RB:'Right-back',CM:'Central midfielder',CDM:'Defensive midfielder',CAM:'Attacking midfielder',LW:'Left winger',RW:'Right winger',LM:'Left midfielder',RM:'Right midfielder',ST:'Striker',LWB:'Left wing-back',RWB:'Right wing-back'};
// One six-attribute model across builder, draft, simulator and franchise.
// Order: PAC, SHO, PAS, DRI, DEF, PHY. Goalkeeper weights are agreed for sim.
const ROLE_WEIGHTS={
 GK:[.10,.05,.10,.10,.40,.25],
 CB:[.10,.02,.10,.08,.45,.25],
 LB:[.23,.02,.18,.17,.29,.11],RB:[.23,.02,.18,.17,.29,.11],
 LWB:[.27,.05,.18,.20,.20,.10],RWB:[.27,.05,.18,.20,.20,.10],
 CDM:[.13,.05,.23,.14,.31,.14],CM:[.16,.10,.28,.23,.12,.11],
 CAM:[.15,.22,.28,.25,.04,.06],
 LM:[.28,.15,.20,.24,.07,.06],RM:[.28,.15,.20,.24,.07,.06],
 LW:[.31,.24,.13,.27,.01,.04],RW:[.31,.24,.13,.27,.01,.04],
 ST:[.21,.35,.10,.20,.02,.12]
};
const RIVALS=[
 {name:'Pewter Rovers',abr:'PR',rating:65,style:'Solid back line'},
 {name:'Cerulean City FC',abr:'CC',rating:69,style:'Fluid movement'},
 {name:'Vermilion Athletic',abr:'VA',rating:72,style:'Electric counterplay'},
 {name:'Celadon United',abr:'CU',rating:75,style:'Possession specialists'},
 {name:'Fuchsia Rangers',abr:'FR',rating:77,style:'Disciplined shape'},
 {name:'Saffron City SC',abr:'SC',rating:81,style:'Creative midfield'},
 {name:'Cinnabar City',abr:'CI',rating:83,style:'All-out attacking'},
 {name:'Indigo Champions',abr:'IC',rating:89,style:'Championship favorites'},
 {name:'Lavender Wanderers',abr:'LW',rating:71,style:'Unpredictable tempo'},
 {name:'Viridian Forest FC',abr:'VF',rating:68,style:'High press'},
 {name:'Seafoam Wanderers',abr:'SW',rating:80,style:'Patient build-up'}
];
const KEY='futbol-xi-local-v1';
const getSaved=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return {}}};
const initial=getSaved();
const sample=[9,135,143,112,123,65,94,121,142,6,149];
const validLineup=a=>Array.isArray(a)&&a.length===11?a.map(v=>byId(v)?Number(v):null):sample.slice();
let state={name:typeof initial.name==='string'?initial.name:'Indigo Athletic',formation:FORMATIONS[initial.formation]?initial.formation:'4-3-3',lineup:validLineup(initial.lineup),clubs:Array.isArray(initial.clubs)?initial.clubs:[],seasonResults:[],selected:9};
let currentPage='builder';
let draft={lineup:Array(11).fill(null),round:0,rerolls:3,type:'',offers:[],selected:0,complete:false};
let toastTimeout;
const store=()=>{try{localStorage.setItem(KEY,JSON.stringify({name:state.name,formation:state.formation,lineup:state.lineup,clubs:state.clubs}))}catch{}};
function notify(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('show'),2700)}
function formationsSlots(){return FORMATIONS[state.formation]}
function fit(p,role){if(!p)return 0;const w=ROLE_WEIGHTS[role]||ROLE_WEIGHTS.CM;return Math.round(['pac','sho','pas','dri','def','phy'].reduce((v,key,i)=>v+p[key]*w[i],0))}
function colorOf(p){return TYPE_INFO[p?.types[0]||'normal'][0]}
function glyphOf(p){return TYPE_INFO[p?.types[0]||'normal'][1]}
function initialsOf(p){return p?.name.replace(/[^A-Za-z\s]/g,'').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'PK'}
function chemistry(lineup=state.lineup){let types=lineup.filter(Boolean).map(id=>byId(id)?.types[0]);return clamp(Math.round(new Set(types).size*7 + Math.max(0,types.length-6)*4),0,100)}
function squadRating(lineup=state.lineup,formation=state.formation){const filled=lineup.filter(Boolean).length;if(!filled)return null;let score=lineup.reduce((sum,id,i)=>sum+(id?fit(byId(id),FORMATIONS[formation][i][0]):0),0)/filled;return Math.round(score+chemistry(lineup)*.05)}
function teamStats(){const ps=state.lineup.filter(Boolean).map(byId);return {filled:ps.length,rate:squadRating(),pace:ps.length?Math.round(ps.reduce((a,p)=>a+p.pace,0)/ps.length):null,defense:ps.length?Math.round(ps.reduce((a,p)=>a+p.defense,0)/ps.length):null,chem:chemistry()}}
function setFormation(v){if(!FORMATIONS[v])return;state.formation=v;store();renderAll();notify(`Formation set to ${v}`)}
function slotMarkup(i,p,pos){const sel=state.selected===i;return `<button type="button" class="pitch-slot ${sel?'selected':''} ${!p?'empty':''}" style="left:${pos[1]}%;top:${pos[2]}%" data-slot="${i}" aria-label="${escapeHTML(pos[0])}: ${p?escapeHTML(p.name):'Empty'}. Select position"><div class="slot-avatar" style="--avatar-color:${p?colorOf(p):'#245d3e'}"><span class="slot-glyph">${p?glyphOf(p):''}</span><span class="slot-initials">${p?initialsOf(p):'+'}</span><span class="slot-pos">${pos[0]}</span></div><span class="slot-name">${p?escapeHTML(p.name):'ADD PLAYER'}</span>${p?`<span class="slot-fit">${fit(p,pos[0])} OVR</span>`:''}</button>`}
function renderPitch(){
 const slots=formationsSlots();$('pitchSlots').innerHTML=slots.map((pos,i)=>slotMarkup(i,byId(state.lineup[i]),pos)).join('');
 $('pitchCaption').textContent=`${state.formation} · CLICK A POSITION TO EDIT`;
 $('pitchSlots').querySelectorAll('[data-slot]').forEach(b=>b.addEventListener('click',()=>{state.selected=+b.dataset.slot;renderPitch();renderScouts()}));
 const stats=teamStats();$('teamRating').textContent=stats.rate??'—';$('filledTag').textContent=`${stats.filled}/11 PLAYERS`;
 $('chemistry').textContent=stats.chem;$('avgPace').textContent=stats.pace??'—';$('avgDefense').textContent=stats.defense??'—';
}
function renderFormationControls(){ $('formationControls').innerHTML=Object.keys(FORMATIONS).map(f=>`<button type="button" data-formation="${f}" class="formation-btn ${f===state.formation?'active':''}" aria-pressed="${f===state.formation}">${f}</button>`).join('');
 $('formationControls').querySelectorAll('[data-formation]').forEach(b=>b.addEventListener('click',()=>setFormation(b.dataset.formation))) }
function monAvatar(p){return `<span class="mini-mon" style="--mon-color:${colorOf(p)}"><span class="mini-glyph">${glyphOf(p)}</span>${initialsOf(p)}</span>`}
function typeTags(p){return p.types.map(t=>`<span class="type-tag">${glyphOf({types:[t]})} ${escapeHTML(t)}</span>`).join('')}
function renderScouts(){const slot=formationsSlots()[state.selected];const role=slot[0],p=byId(state.lineup[state.selected]);$('scoutHeading').textContent=ROLE_LABELS[role];$('scoutExplanation').textContent=p?'Selected for your starting XI. Find a replacement below.':'Choose the perfect Pokémon for this position.';$('selectedPositionTag').textContent=role;
 $('selectedPlayer').className=p?'selected-player':'selected-player empty-state';$('selectedPlayer').innerHTML=p?`${monAvatar(p)}<div class="selected-info"><strong>${escapeHTML(p.name)}</strong><span>${p.types.map(t=>t.toUpperCase()).join(' / ')} · #${String(p.id).padStart(3,'0')}</span></div><div class="selected-rate">${fit(p,role)}</div>`:'OPEN POSITION · NO PLAYER SELECTED';
 const raw=p?.baseStats;
 $('selectedBaseStats').innerHTML=p?`<div class="selected-attr-grid">${[['PAC',p.pac],['SHO',p.sho],['PAS',p.pas],['DRI',p.dri],['DEF',p.def],['PHY',p.phy]].map(([k,v])=>`<div class="selected-attr"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div><div class="selected-base-caption"><b>Pokémon base stats</b> · HP ${raw.hp} · ATK ${raw.attack} · DEF ${raw.defense} · SpA ${raw.spAttack} · SpD ${raw.spDefense} · SPE ${raw.speed} <br><b>Best roles:</b> ${Object.keys(ROLE_WEIGHTS).map(r=>[r,fit(p,r)]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(a=>a[0]+' '+a[1]).join(' · ')}</div>`:'';
 const q=$('searchInput').value.trim().toLowerCase();const type=$('typeFilter').value;
 const filtered=POKEMON.filter(p=>p.name.toLowerCase().includes(q)||String(p.id).includes(q)).filter(p=>type==='all'||p.types.includes(type)).sort((a,b)=>fit(b,role)-fit(a,role)||a.id-b.id);
 $('resultsCount').textContent=`${filtered.length} PROSPECT${filtered.length===1?'':'S'}`;
 $('scoutList').innerHTML=filtered.map(p=>{const used=state.lineup.includes(p.id);return `<button class="prospect ${used?'in-team':''}" data-poke="${p.id}" aria-label="Assign ${escapeHTML(p.name)} to ${role}">${monAvatar(p)}<span class="prospect-info"><span class="prospect-name">${escapeHTML(p.name)} <span class="prospect-id">#${String(p.id).padStart(3,'0')}</span></span><span class="prospect-meta">${typeTags(p)}${used?'<span class="type-tag">IN XI</span>':''}</span></span><span class="prospect-score ${used?'on-field':''}">${fit(p,role)}<small>FIT</small></span></button>`}).join('')||'<p class="empty-events">No Pokémon match your filters.</p>';
 $('scoutList').querySelectorAll('[data-poke]').forEach(el=>el.addEventListener('click',()=>selectPokemon(+el.dataset.poke)));
}
function selectPokemon(id){const old=state.lineup.indexOf(id),selected=state.selected;if(old!==-1&&old!==selected)state.lineup[old]=state.lineup[selected];state.lineup[selected]=id;store();renderPitch();renderScouts();notify(`${byId(id).name} selected for ${formationsSlots()[selected][0]}`)}
function chooseSample(){state.lineup=sample.slice();store();renderAll();notify('Sample starting XI restored')}
function randomize(){const pool=randomShuffle(POKEMON.filter(p=>!p.legendary));const used=new Set();state.lineup=formationsSlots().map(s=>{const choices=pool.filter(p=>!used.has(p.id)).sort((a,b)=>fit(b,s[0])-fit(a,s[0]));let pick=choices[Math.floor(Math.random()*Math.min(15,choices.length))];used.add(pick.id);return pick.id});store();renderAll();notify('A fresh starting XI is on the pitch')}
function clearPitch(){if(!confirm('Clear all 11 spots on your pitch? Saved clubs will not be affected.'))return;state.lineup=Array(11).fill(null);state.selected=0;store();renderAll();notify('Pitch cleared')}
function renderAll(){renderFormationControls();renderPitch();renderScouts();$('teamName').value=state.name;renderMatchStats();renderSaved()}
function saveClub(){let name=state.name.trim().slice(0,34)||'Untitled FC';if(!state.lineup.some(Boolean)){notify('Add at least one player before saving');return}const team={id:Date.now()+Math.random(),name,formation:state.formation,lineup:state.lineup.slice(),date:new Date().toLocaleDateString()};state.clubs.unshift(team);state.clubs=state.clubs.slice(0,35);store();renderSaved();notify(`${name} saved to My Teams`)}
function loadClub(id){const team=state.clubs.find(t=>String(t.id)===String(id));if(!team)return;state.name=team.name;state.formation=FORMATIONS[team.formation]?team.formation:'4-3-3';state.lineup=validLineup(team.lineup);state.selected=9;store();renderAll();showPage('builder');notify(`${team.name} loaded`)}
function deleteClub(id){const team=state.clubs.find(t=>String(t.id)===String(id));if(!team||!confirm(`Delete saved club "${team.name}"?`))return;state.clubs=state.clubs.filter(t=>String(t.id)!==String(id));store();renderSaved();notify('Saved club deleted')}
function renderSaved(){if(!state.clubs.length){$('savedClubs').innerHTML='<div class="saved-empty"><div style="font-size:36px">⚽</div><h2>No clubs in the archives yet</h2><p>Build your first starting XI, then choose Save Club.</p><button id="noClubsBtn" class="btn btn-primary">Build a club →</button></div>';$('noClubsBtn').onclick=()=>showPage('builder');return}
 $('savedClubs').innerHTML=state.clubs.map(t=>`<article class="saved-card"><div class="saved-card-top"><span>★ SAVED CLUB</span><span>${escapeHTML(t.date||'')}</span></div><h3>${escapeHTML(t.name)}</h3><p>${escapeHTML(t.formation)} &nbsp;·&nbsp; ${t.lineup.filter(Boolean).length}/11 PLAYERS &nbsp;·&nbsp; ${squadRating(t.lineup,t.formation)||'—'} OVR</p><div class="saved-avatars">${t.lineup.filter(Boolean).slice(0,7).map(id=>{const p=byId(id);return p?`<span style="--mon-color:${colorOf(p)}" title="${escapeHTML(p.name)}">${initialsOf(p)}</span>`:''}).join('')}</div><div class="saved-actions"><button class="btn btn-primary" data-load="${t.id}">Load team →</button><button class="btn btn-outline" data-delete="${t.id}">Delete</button></div></article>`).join('');$('savedClubs').querySelectorAll('[data-load]').forEach(el=>el.onclick=()=>loadClub(el.dataset.load));$('savedClubs').querySelectorAll('[data-delete]').forEach(el=>el.onclick=()=>deleteClub(el.dataset.delete));}
function showPage(page){if(!['builder','draft','franchise','arcade','match','teams'].includes(page))return;if(currentPage==='arcade'&&page!=='arcade')window.ArcadeMatchUI?.onHide();currentPage=page;document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id===page+'Page'));document.querySelectorAll('.nav-link').forEach(el=>{el.classList.toggle('active',el.dataset.page===page);el.setAttribute('aria-current',el.dataset.page===page?'page':'false')});if(page==='draft')renderDraft();if(page==='franchise')window.FranchiseUI?.render();if(page==='match')renderMatchStats();if(page==='arcade')window.ArcadeMatchUI?.onShow();if(page==='teams')renderSaved();window.scrollTo({top:0,behavior:'smooth'})}
function newDraft(){return FutbolDraftV05.restart()}
function rerollDraft(){return FutbolDraftV05.rerollDraft()}
function draftPick(id){return FutbolDraftV05.draftPick(id)}
function renderDraft(){return FutbolDraftV05.renderDraft()}
function encodeState(){return btoa(unescape(encodeURIComponent(JSON.stringify({n:state.name,f:state.formation,p:state.lineup})))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')}
function readShared(){const v=new URLSearchParams(location.search).get('s');if(!v||v.length>4000)return;try{const decoded=JSON.parse(decodeURIComponent(escape(atob(v.replace(/-/g,'+').replace(/_/g,'/')))));if(!FORMATIONS[decoded.f]||!Array.isArray(decoded.p)||decoded.p.length!==11)return;state.formation=decoded.f;state.lineup=validLineup(decoded.p);state.name=String(decoded.n||'Shared XI').slice(0,34);store();notify('Shared lineup loaded!')}catch{}}
async function copyShare(){const url=new URL(location.href);url.searchParams.set('s',encodeState());url.hash='';try{await navigator.clipboard.writeText(url.toString());notify('Shareable XI link copied!')}catch{const input=document.createElement('textarea');input.value=url.toString();document.body.appendChild(input);input.select();try{document.execCommand('copy');notify('Shareable XI link copied!')}catch{prompt('Copy your lineup link',url.toString())}input.remove()}}
function canvasPoster(){const c=$('exportCanvas');c.width=1400;c.height=1750;const ctx=c.getContext('2d');ctx.fillStyle='#091611';ctx.fillRect(0,0,c.width,c.height);
 ctx.fillStyle='#def569';ctx.font='900 76px Arial';ctx.fillText('PokeFC',85,128);ctx.fillStyle='#a8b8a8';ctx.font='700 24px Arial';ctx.fillText('THE IMPOSSIBLE STARTING ELEVEN',90,171);
 ctx.fillStyle='#ffffff';ctx.font='800 58px Arial';ctx.fillText(state.name.slice(0,26),90,260);ctx.fillStyle='#d8f46d';ctx.font='700 31px Arial';ctx.fillText(`${state.formation} FORMATION     •     ${state.lineup.filter(Boolean).length}/11 PLAYERS     •     ${squadRating()??'—'} OVR`,90,310);
 const x=100,y=345,w=1200,h=1280;for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#11583c':'#115039';ctx.fillRect(x,y+h/10*i,w,h/10)}ctx.strokeStyle='#aadfbb';ctx.lineWidth=3;ctx.strokeRect(x+20,y+18,w-40,h-36);ctx.beginPath();ctx.moveTo(x+20,y+h/2);ctx.lineTo(x+w-20,y+h/2);ctx.stroke();ctx.beginPath();ctx.arc(x+w/2,y+h/2,130,0,Math.PI*2);ctx.stroke();ctx.strokeRect(x+w*.23,y+18,w*.54,205);ctx.strokeRect(x+w*.23,y+h-223,w*.54,205);
 FORMATIONS[state.formation].forEach((pos,i)=>{const p=byId(state.lineup[i]);const px=x+w*pos[1]/100,py=y+h*pos[2]/100;ctx.fillStyle=p?colorOf(p):'#315f46';ctx.beginPath();ctx.arc(px,py,48,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p?'#e5f5e8':'#6f9a7a';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#08251b';ctx.font='900 24px Arial';ctx.textAlign='center';ctx.fillText(p?initialsOf(p):'+',px,py+8);ctx.fillStyle='#d9f46d';ctx.fillRect(px+28,py-42,40,25);ctx.fillStyle='#122e1a';ctx.font='900 15px Arial';ctx.fillText(pos[0],px+48,py-24);ctx.fillStyle='#061f16';ctx.fillRect(px-91,py+53,182,34);ctx.fillStyle='#f4fff5';ctx.font='800 21px Arial';ctx.fillText(p?p.name:'EMPTY SLOT',px,py+77);ctx.fillStyle='#def569';ctx.font='700 18px Arial';ctx.fillText(p?`${fit(p,pos[0])} OVR`:'',px,py+104)});ctx.textAlign='left';ctx.fillStyle='#779284';ctx.font='20px Arial';ctx.fillText('UNOFFICIAL FAN GAME · ORIGINAL RATINGS · GEN I',90,1695);return c}
function exportPNG(){const c=canvasPoster(),a=document.createElement('a');a.href=c.toDataURL('image/png');a.download=`futbol-xi-${state.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,25)}.png`;a.click();notify('Team poster exported')}
function poisson(lambda){let L=Math.exp(-lambda),k=0,p=1;do{k++;p*=Math.random()}while(p>L);return k-1}
function playMatch(rival,tactic='balanced'){
 const strength=squadRating()||40;let homeXg=clamp(1.42+(strength-rival.rating)*.040,.28,3.65),awayXg=clamp(1.26+(rival.rating-strength)*.036,.2,3.4);
 if(tactic==='attack'){homeXg+=.37;awayXg+=.26}else if(tactic==='defend'){homeXg-=.22;awayXg-=.35}else if(tactic==='counter'){homeXg+=.12;awayXg+=.04}
 const home=clamp(poisson(homeXg),0,8),away=clamp(poisson(awayXg),0,8);const possession=clamp(Math.round(50+(strength-rival.rating)*.52+(tactic==='attack'?6:tactic==='counter'?-5:0)+(Math.random()-.5)*15),26,74);
 const matchPlayers=state.lineup.map((id,i)=>({p:byId(id),role:FORMATIONS[state.formation][i][0]})).filter(x=>x.p);
 const attackers=matchPlayers.filter(x=>['ST','LW','RW','CAM','RM','LM','CM'].includes(x.role));const scorers=attackers.length?attackers:matchPlayers;
 const events=[];for(let i=0;i<home;i++){let scorer=randomFrom(scorers);events.push({min:Math.floor(Math.random()*89+1),home:true,name:scorer.p.name,description:'GOAL! A brilliant finish for '+state.name+'.'})}
 for(let i=0;i<away;i++)events.push({min:Math.floor(Math.random()*89+1),home:false,name:rival.name,description:'GOAL! '+rival.name+' hit the back of the net.'});events.sort((a,b)=>a.min-b.min);
 return {home,away,homeXg,awayXg,possession,events,homeShots:Math.round(homeXg*3+4+Math.random()*4),awayShots:Math.round(awayXg*3+4+Math.random()*4)};
}
function renderMatchStats(){const s=teamStats();$('homeClub').textContent=state.name;$('matchFilled').textContent=`${s.filled} / 11`;$('matchRating').textContent=s.rate??'—';$('matchChem').textContent=s.chem+'%';$('kickoffBtn').disabled=s.filled<11;$('seasonBtn').disabled=s.filled<11}
function showMatch(rival,m){$('homeGoals').textContent=m.home;$('awayGoals').textContent=m.away;$('awayClub').textContent=rival.name;$('awayCrest').textContent=rival.abr;$('homeClub').textContent=state.name;$('resultCaption').textContent=m.home>m.away?'FULL TIME · HOME WIN':m.home<m.away?'FULL TIME · AWAY WIN':'FULL TIME · DRAW';$('matchFacts').innerHTML=`<span>Possession <b>${m.possession}% – ${100-m.possession}%</b></span><span>Shots <b>${m.homeShots} – ${m.awayShots}</b></span><span>Expected goals <b>${m.homeXg.toFixed(1)} – ${m.awayXg.toFixed(1)}</b></span>`;$('matchEvents').innerHTML=m.events.length?m.events.map(e=>`<div class="match-event"><strong>${e.min}' ⚽</strong><span>${escapeHTML(e.description)} <b>${escapeHTML(e.name)}</b></span></div>`).join(''):'<p class="empty-events">Full time. A hard-fought 0–0 draw.</p>'}
function kickoff(){if(state.lineup.some(v=>!v)){notify('Fill every position before kickoff');return}const rival=RIVALS[Number($('opponentSelect').value)];showMatch(rival,playMatch(rival,$('tacticSelect').value));$('seasonResults').hidden=true;notify('Full-time whistle!')}
function simulateSeason(){if(state.lineup.some(v=>!v)){notify('Fill every position before starting a season');return}const fixtures=RIVALS.map(r=>({r,result:playMatch(r,$('tacticSelect').value)}));let win=0,draw=0,loss=0,gf=0,ga=0;fixtures.forEach(({result:m})=>{if(m.home>m.away)win++;else if(m.home===m.away)draw++;else loss++;gf+=m.home;ga+=m.away});const points=win*3+draw;let rank=points>=27?'CHAMPIONS':points>=22?'TITLE CONTENDERS':points>=16?'MID-TABLE':points>=10?'SURVIVORS':'RELEGATION BATTLE';const box=$('seasonResults');box.hidden=false;box.innerHTML=`<p class="eyebrow small">SEASON RECAP · ELEVEN MATCHES</p><h2>${escapeHTML(state.name)} — ${rank}</h2><div class="season-summary"><div><small>POINTS</small>${points}</div><div><small>W–D–L</small>${win}–${draw}–${loss}</div><div><small>GOALS</small>${gf}–${ga}</div></div><div class="fixtures">${fixtures.map(({r,result:m},i)=>`<div class="fixture"><span>MW ${String(i+1).padStart(2,'0')} · ${escapeHTML(r.name)}</span><strong>${m.home} – ${m.away}</strong></div>`).join('')}</div>`;showMatch(fixtures.at(-1).r,fixtures.at(-1).result);box.scrollIntoView({behavior:'smooth',block:'nearest'});notify(`${points} points from 11 matches`)}
function wire(){document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));$('teamName').oninput=e=>{state.name=e.target.value.slice(0,34);store();$('homeClub').textContent=state.name};$('searchInput').oninput=renderScouts;$('typeFilter').onchange=renderScouts;$('clearSlot').onclick=()=>{state.lineup[state.selected]=null;store();renderPitch();renderScouts();notify('Slot cleared')};$('randomBtn').onclick=randomize;$('saveBtn').onclick=saveClub;$('clearBtn').onclick=clearPitch;$('shareBtn').onclick=copyShare;$('pngBtn').onclick=exportPNG;$('playBtn').onclick=()=>showPage('arcade');$('restartDraftBtn').onclick=()=>{if(draft.round&&!draft.complete&&!confirm('Discard your current draft?'))return;newDraft()};$('rerollDraftBtn').onclick=rerollDraft;$('kickoffBtn').onclick=kickoff;$('seasonBtn').onclick=simulateSeason;
 $('opponentSelect').innerHTML=RIVALS.map((r,i)=>`<option value="${i}">${escapeHTML(r.name)} (${r.rating} OVR)</option>`).join('');$('opponentSelect').value='0';$('typeFilter').innerHTML='<option value="all">All types</option>'+Object.keys(TYPE_INFO).sort().map(t=>`<option value="${t}">${t[0].toUpperCase()+t.slice(1)}</option>`).join('');
 document.addEventListener('keydown',e=>{if((e.key==='ArrowRight'||e.key==='ArrowLeft')&&currentPage==='builder'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){state.selected=clamp(state.selected+(e.key==='ArrowRight'?1:-1),0,10);renderPitch();renderScouts()}});
}
readShared();wire();renderAll();FutbolDraftV05.newDraft();
