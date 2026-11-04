/* PokéFC Play / Exhibition. Uses the exact shared Quick Sim and actual TacticMesh worker.
 * All gym squads are deterministic, sourced from the canonical 32-gym table.
 * No ranked scores or franchise results are written by exhibitions. */
(()=>{'use strict';
const S=window.FXI_SPECIES||[], BY=new Map(S.map(p=>[p.id,p]));
const OPP=window.PFC_PLAY_OPPONENTS||[],SAVE='pokefc-free-builder-v1';
const FORMS={
 '4-3-3':['GK','LB','CB','CB','RB','CM','CM','CM','LW','ST','RW'],
 '4-2-3-1':['GK','LB','CB','CB','RB','CDM','CDM','LW','CAM','RW','ST'],
 '4-4-2':['GK','LB','CB','CB','RB','LM','CM','CM','RM','ST','ST'],
 '3-5-2':['GK','CB','CB','CB','LWB','RWB','CM','CM','CAM','ST','ST'],
 '5-3-2':['GK','LWB','CB','CB','CB','RWB','CM','CM','CM','ST','ST']
};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let preview=null,controller=null,currentResult=null,latestSnapshot=null,liveEvents=[],busy=false;
function getXI(){
 try{
  const v=JSON.parse(localStorage.getItem(SAVE));
  if(!v||!Array.isArray(v.lineup)||v.lineup.length!==11||!FORMS[v.formation])return null;
  const lineup=v.lineup.map(id=>id==null?null:Number(id));
  if(lineup.filter(Boolean).some(id=>!BY.has(id)))return null;
  if(new Set(lineup.filter(Boolean)).size!==lineup.filter(Boolean).length)return null;
  return {name:String(v.name||'Your XI').slice(0,38),formation:v.formation,lineup,source:v};
 }catch{return null}
}
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
function rng(seed){let a=hash(seed)||1;return()=>{a=(a+0x6d2b79f5)|0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
const randomInt=(next,n)=>Math.floor(next()*n);
function gymSquad(o){
 if(Array.isArray(o.roster)&&o.roster.length===11)return o.roster.slice();
 const next=rng(o.key),used=new Set([o.signature]),result=[o.signature];
 const restricted=S.filter(s=>s.gen<=4&&!s.legendary);
 const matching=restricted.filter(s=>s.types.includes(o.type)&&!used.has(s.id));
 const broad=restricted.filter(s=>!used.has(s.id));
 function draw(pool){const available=pool.filter(p=>!used.has(p.id));if(!available.length)return;const pick=available[randomInt(next,available.length)].id;used.add(pick);result.push(pick)}
 while(result.length<8)draw(matching.length?matching:broad);
 while(result.length<11)draw(broad);
 return result;
}
function posClass(role){return role==='GK'?'GK':['LB','RB','CB','LWB','RWB'].includes(role)?'DEF':['ST','LW','RW'].includes(role)?'FWD':'MID'}
function player(id,i,role,prefix){
 const p=BY.get(id);if(!p)throw Error('Missing Pokédex species #'+id);
 const b=p.baseStats;
 const val=w=>Math.min(99,20+.55*Object.entries(w).reduce((a,[k,v])=>a+(b[k]||0)*v,0));
 const speed=val({speed:.8,attack:.2}),attack=val({attack:.55,spAttack:.25,speed:.2});
 const defense=val({defense:.5,hp:.25,spDefense:.25}),passing=val({spAttack:.35,spDefense:.25,speed:.2,attack:.2});
 return {id:prefix+'-'+i+'-'+id,name:p.name,species:p.name,speciesId:id,pos:posClass(role),
  main:{sprintSpeed:speed,shortPassing:passing,firstTouch:passing,vision:passing,tackling:defense,finishing:attack},
  detail:{reflexes:defense,handling:defense,positioning:defense,diving:defense,kicking:passing,strength:defense,decisionMaking:passing,composure:attack}};
}
function opponent(){return OPP.find(o=>o.key===$('opponent').value)||OPP[0]}
function makePreview(){
 const home=getXI(),o=opponent();
 if(!home||home.lineup.some(id=>!id))throw Error('Complete all eleven positions in Free Builder first.');
 if(!o)throw Error('No opponent selected');
 const roles=FORMS[home.formation];
 const cpuFormation=o.formation||'4-3-3';
 const seed=String(Date.now())+':'+Math.floor(Math.random()*1e8)+':'+o.key;
 return {seed,fixtureIndex:1,season:1,opponent:o,home:{id:'home-xi',city:home.name,formation:home.formation,tactic:$('tactic').value,lineup:home.lineup.map((id,i)=>player(id,i,roles[i],'home'))},
 away:{id:o.key,city:o.leader+' · '+o.city,formation:cpuFormation,tactic:o.tactic||'balanced',lineup:gymSquad(o).map((id,i)=>player(id,i,FORMS[cpuFormation][i],'away'))}};
}
function updateXI(){
 const team=getXI(),complete=team?.lineup.filter(Boolean).length||0,box=$('xiStatus');
 const ready=complete===11;
 box.className='xi-status '+(ready?'ready':'warning');
 box.textContent=ready?'✓ '+team.name+' · '+team.formation+' · 11/11 Pokémon ready':'⚠ '+complete+'/11 Pokémon selected. Finish your XI in Free Builder or auto-fill the remaining slots.';
 $('quick').disabled=!ready||busy;
 $('watch').disabled=!ready||busy;
 $('homeName').textContent=team?.name||'YOUR XI';
 $('homePreview').innerHTML=(team?.lineup||Array(11).fill(null)).map((id,i)=>{
  const role=FORMS[team?.formation||'4-3-3'][i],s=BY.get(id);
  return '<div class="mini-poke '+(!s?'empty':'')+'"><b>'+role+'</b>'+(s?'<img loading="lazy" alt="" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+(s.spriteId||s.id)+'.png">':'<span>+</span>')+'<span title="'+esc(s?.name||'Empty')+'">'+esc(s?.name||'EMPTY')+'</span></div>';
 }).join('');
}
function autoFill(){
 const xi=getXI();const data=xi?.source||{version:1,name:'Indigo Athletic',formation:'4-3-3',lineup:Array(11).fill(null),selected:0};
 const used=new Set(data.lineup.filter(Boolean));
 const next=rng(Date.now()+':auto-fill');
 const candidate=S.filter(s=>!s.legendary&&!used.has(s.id));
 for(let i=0;i<11;i++){if(data.lineup[i])continue;const index=randomInt(next,candidate.length),s=candidate.splice(index,1)[0];data.lineup[i]=s.id;used.add(s.id)}
 try{localStorage.setItem(SAVE,JSON.stringify(data))}catch(err){$('engineStatus').textContent='Could not save lineup: '+err.message;return}
 updateXI();drawPitch();
}
function fillOpponents(){
 const filter=$('region').value,selected=$('opponent').value;
 const options=OPP.filter(o=>filter==='bosses'?o.tier!=='gym':filter==='all'?o.tier==='gym':o.region===filter);
 $('opponent').innerHTML=options.map(o=>'<option value="'+o.key+'">'+esc(o.region)+' · '+esc(o.leader)+' ('+esc(o.city)+')</option>').join('');
 if(options.some(o=>o.key===selected))$('opponent').value=selected;
 selectOpponent();
}
function selectOpponent(){
 const o=opponent();if(!o)return;
 $('awayName').textContent=o.leader.toUpperCase();
 $('opponentCard').innerHTML='<strong>'+esc(o.leader)+'</strong><p>'+esc(o.city)+' · '+esc(o.region)+' · '+(o.tier==='gym'?'GYM LEADER':o.tier==='elite'?'ELITE FOUR':'CHAMPION')+'</p><span class="type-chip">'+esc(o.type.toUpperCase())+' SPECIALIST</span> <span class="type-chip">'+(o.roster?'FIXED ELITE XI':'GENERATED XI')+'</span>';
 if(!busy){preview=null;latestSnapshot=null;currentResult=null;$('score').textContent='– : –';$('matchClock').textContent='PRE-MATCH';$('matchState').textContent='Ready for kickoff';$('matchResult').innerHTML='<div class="empty-state"><span>⚽</span><strong>EXHIBITION FIXTURE</strong><p>Select Quick Sim or Watch Match to kick off.</p></div>';drawPitch()}
}
function drawPitch(snapshot){
 const el=$('matchPitch'),ctx=el.getContext('2d');if(!ctx)return;
 const W=1050,H=680,x0=58,y0=38,w=934,h=604;
 ctx.clearRect(0,0,W,H);ctx.fillStyle='#0a2c2b';ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#0d6b4c';ctx.fillRect(x0,y0,w,h);
 for(let i=0;i<10;i+=2){ctx.fillStyle='#0a6146';ctx.fillRect(x0+i*w/10,y0,w/10,h)}
 ctx.strokeStyle='#b6e4d4';ctx.lineWidth=2;ctx.strokeRect(x0+2,y0+2,w-4,h-4);
 ctx.beginPath();ctx.moveTo(x0+w/2,y0);ctx.lineTo(x0+w/2,y0+h);ctx.stroke();
 ctx.beginPath();ctx.arc(x0+w/2,y0+h/2,84,0,2*Math.PI);ctx.stroke();
 for(const side of [0,1]){const edge=side?x0+w:x0,dir=side?-1:1;
  ctx.strokeRect(Math.min(edge,edge+dir*160),y0+h*.21,160,h*.58);
  ctx.strokeRect(Math.min(edge,edge+dir*56),y0+h*.37,56,h*.26)}
 const teams=preview?[preview.home,preview.away]:[];
 const lookup=new Map((snapshot?.players||[]).map(p=>[String(p.id),p]));
 function coord(x,y){return [x0+w*x/105,y0+h*y/68]}
 teams.forEach((team,side)=>{const counts={GK:0,DEF:0,MID:0,FWD:0};
 team.lineup.forEach((p,i)=>{
  let x=p.pos==='GK'?8:p.pos==='DEF'?28:p.pos==='MID'?52:75;
  if(side)x=105-x;
  const count=counts[p.pos]++,total=team.lineup.filter(q=>q.pos===p.pos).length;
  let y=(count+1)*68/(total+1);
  const live=lookup.get(String(p.id));
  if(live?.position&&Number.isFinite(live.position.x)&&Number.isFinite(live.position.y)){x=live.position.x;y=live.position.y}
  const [cx,cy]=coord(x,y);
  ctx.beginPath();ctx.arc(cx,cy,16,0,Math.PI*2);ctx.fillStyle=side?'#fda588':'#a5f6b9';ctx.fill();
  ctx.strokeStyle='#142936';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#102738';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(String(i+1),cx,cy+4);
  ctx.fillStyle='#f6faf7';ctx.font='bold 10px system-ui';ctx.fillText(p.name.slice(0,12),cx,cy-22);
 })});
 const ball=snapshot?.ball;const [bx,by]=coord(Number.isFinite(ball?.x)?ball.x:52.5,Number.isFinite(ball?.y)?ball.y:34);
 ctx.beginPath();ctx.arc(bx,by,8,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#122c2a';ctx.lineWidth=2;ctx.stroke();
}
function scoreFromSnapshot(snapshot){
 const s=snapshot?.score;if(!s)return null;
 if(Array.isArray(s)&&s.length>=2)return [Number(s[0])||0,Number(s[1])||0];
 if(typeof s==='object')return [Number(s.home??s.homeGoals)||0,Number(s.away??s.awayGoals)||0];
 return null;
}
function showSnapshot(s,ev){
 if(!s)return;latestSnapshot=s;
 const score=scoreFromSnapshot(s);if(score)$('score').textContent=score.join(' : ');
 const mins=Math.max(0,Math.min(90,Number(s.elapsedSeconds||0)/60));
 $('matchClock').textContent=Math.floor(mins)+"' / 90'";
 if(ev?.length){for(const e of ev){if(!liveEvents.some(x=>x.type===e.type&&x.minute===e.minute&&x.player===e.player))liveEvents.push(e)}}
 drawPitch(s);
}
function showResult(result){
 currentResult=result;
 $('score').textContent=result.score.join(' : ');
 $('matchClock').textContent='FULL TIME';
 $('matchState').textContent=result.score[0]>result.score[1]?'HOME WIN':result.score[0]<result.score[1]?'AWAY WIN':'DRAW';
 $('modeTag').textContent=result.origin==='tacticmesh'?'WATCHED':result.origin==='hybrid'?'WATCH → SIM':'QUICK SIM';
 const rows=[['Shots','shots'],['Shots on target','shotsOnTarget'],['Possession','possession'],['Passes','passes'],['Completed passes','completedPasses'],['Tackles won','tackles']];
 const statRows=rows.map(([label,key])=>'<div class="stat-row"><span>'+ (result.stats?.[0]?.[key]??'—') +(key==='possession'?'%':'')+'</span><small>'+label+'</small><span>'+(result.stats?.[1]?.[key]??'—')+(key==='possession'?'%':'')+'</span></div>').join('');
 const events=(result.events||[]).filter(e=>e.type==='goal').map(e=>'<p><strong>'+Math.ceil(Number(e.minute)||0)+"' GOAL</strong> · "+esc(String(e.team)===String(preview.home.id)?preview.home.city:preview.away.city)+' · '+esc(preview.home.lineup.concat(preview.away.lineup).find(p=>p.id===e.player)?.name||'Pokémon')+'</p>').join('');
 $('matchResult').innerHTML='<div class="result-title"><strong>'+($('matchState').textContent)+'</strong><span class="result-meta">'+esc(result.origin.toUpperCase())+'</span></div><div class="stat-table">'+statRows+'</div><div class="event-feed">'+(events||'<p>No goals in this match.</p>')+'</div>';
}
function stateBusy(isBusy){
 busy=isBusy;
 updateXI();
 $('region').disabled=isBusy;$('opponent').disabled=isBusy;$('tactic').disabled=isBusy;
 $('fillXI').disabled=isBusy;
}
function stopWatch(){
 if(controller){controller.close();controller=null}
 stateBusy(false);
 $('pause').disabled=true;$('resume').disabled=true;$('simRemaining').disabled=true;
}
function quickSim(){
 try{
  stopWatch();preview=makePreview();latestSnapshot=null;liveEvents=[];drawPitch();
  const out=window.FXI_QUICK.simulate(preview,{seed:preview.seed});
  showResult(out);$('engineStatus').textContent='Instant statistical Quick Sim result. Match positions shown schematically; no physics were played.';
 }catch(e){$('engineStatus').textContent='Quick Sim failed: '+e.message}
}
async function watchMatch(){
 try{
  stopWatch();
  preview=makePreview();latestSnapshot=null;liveEvents=[];
  stateBusy(true);drawPitch();
  $('modeTag').textContent='TACTICMESH';$('score').textContent='0 : 0';
  $('matchClock').textContent="0' / 90'";$('matchState').textContent='Initializing watched match';
  $('matchResult').innerHTML='<div class="empty-state"><span>◉</span><strong>LIVE TACTICAL CAMERA</strong><p>Real player and ball positions will appear when TacticMesh starts.</p></div>';
  $('engineStatus').textContent='Checking the TacticMesh worker and installed engine files…';
  if(!window.FXI_TM||!await window.FXI_TM.installed())throw Error('TacticMesh engine files are unavailable on this site');
  controller=window.FXI_TM.connect(preview,{
    ready:s=>{showSnapshot(s,[]);$('matchState').textContent='Watched match in progress';$('engineStatus').textContent='Genuine TacticMesh physics running. Use Pause or Sim to End any time.';$('pause').disabled=false;$('simRemaining').disabled=false;controller?.play(Number($('watchSpeed').value)||4)},
    snapshot:showSnapshot,
    performance:m=>{$('engineStatus').textContent='Live TacticMesh · '+(m?.realTimeFactor??'?')+'× actual simulation pace · '+(m?.ticksPerSecond??'?')+' ticks/s. Browser CPU affects speed.'},
    handoff:(partial,s)=>{
      try{showSnapshot(s,[]);const out=window.FXI_HYBRID.finish(preview,partial);showResult(out);
        $('engineStatus').textContent='Switched at '+(partial.elapsedSeconds/60).toFixed(1)+"'. Earlier TacticMesh goals remain authoritative; only the remaining time was quick-simulated.";
        stopWatch();
      }catch(e){$('engineStatus').textContent='Sim-to-end could not be verified: '+e.message;stopWatch()}
    },
    done:(result)=>{showResult(result);$('engineStatus').textContent='Full-time: complete official TacticMesh match report received.';stopWatch()},
    error:msg=>{$('engineStatus').textContent='TacticMesh error: '+msg;stopWatch()}
  });
 }catch(e){$('engineStatus').textContent='Watch could not start: '+e.message;stopWatch()}
}
function start(){
 if(S.length!==1025||OPP.length!==38){$('engineStatus').textContent='Game data incomplete. Reload this page.';return}
 $('region').addEventListener('change',fillOpponents);
 $('opponent').addEventListener('change',selectOpponent);
 $('fillXI').addEventListener('click',autoFill);
 $('quick').addEventListener('click',quickSim);
 $('watch').addEventListener('click',watchMatch);
 $('pause').addEventListener('click',()=>{controller?.pause();$('pause').disabled=true;$('resume').disabled=false;$('matchState').textContent='PAUSED'});
 $('resume').addEventListener('click',()=>{controller?.play(Number($('watchSpeed').value)||4);$('resume').disabled=true;$('pause').disabled=false;$('matchState').textContent='LIVE'});
 $('simRemaining').addEventListener('click',()=>{if(!controller)return;$('simRemaining').disabled=true;$('pause').disabled=true;$('resume').disabled=true;$('engineStatus').textContent='Validating live TacticMesh handoff…';controller.handoff()});
 $('watchSpeed').addEventListener('change',e=>{controller?.speed(Number(e.target.value)||4)});
 window.addEventListener('pageshow',updateXI);
 fillOpponents();updateXI();drawPitch();
}
start();
window.PFC_PLAY={getXI,gymSquad,makePreview,opponents:OPP};
})();
