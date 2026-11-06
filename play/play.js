/* PokéFC Play / Exhibition. Uses the exact shared Quick Sim and actual TacticMesh worker.
 * All gym squads are deterministic, sourced from the canonical 32-gym table.
 * No ranked scores or franchise results are written by exhibitions. */
(()=>{'use strict';
const S=window.FXI_SPECIES||[], BY=new Map(S.map(p=>[p.id,p]));
const OPP=window.PFC_PLAY_OPPONENTS||[],SAVE='pokefc-free-builder-v1';
const CHALLENGE_KEY='pokefc-challenge-alpha-1';
const CHALLENGE_MODE=Boolean(window.location?.search&&new URLSearchParams(window.location.search).get('challenge')==='1');
// Development-only opt-in; default Quick Play and production build stay unchanged.
// 2.5D Watch is default in browsers. Keep legacy via explicit rollback query.
const WATCH_CHOICE=window.location?new URLSearchParams(window.location.search||'').get('watch'):null;
const SOCCERJS_PREVIEW=!!window.location&&WATCH_CHOICE!=='tacticmesh';
 // Only opt-in PSE v1 exhibitions; knockout and saved modes remain legacy.
 const setPieceOptions=()=>!CHALLENGE_MODE&&$('setPiecesMode')?.value==='v1'?
  {setPieces:'v1'}:{};
let SOCCERJS_READY=false;
let soccerSession=null;
const SPECIAL=window.PFC_CHALLENGE_SPECIAL||{evolvable:[],megas:{}};
const EVOLVABLE=new Set(SPECIAL.evolvable);
function getChallenge(){
 if(!CHALLENGE_MODE)return null;
 try{const st=JSON.parse(localStorage.getItem(CHALLENGE_KEY));
  return st&&st.phase==='locked'&&st.locked&&Array.isArray(st.locked.roster)&&st.locked.roster.length===11?st:null;
 }catch{return null}
}
function heldStats(p,item){
 const b={...p.baseStats};if(!item)return b;
 if(item==='Eviolite'&&EVOLVABLE.has(p.id)){for(const k of Object.keys(b))b[k]+=20;return b}
 const mega=(SPECIAL.megas[p.id]||[]).find(m=>m.stone===item);
 if(mega)return {...mega.stats};
 if(item==='Light Ball'&&p.id===25){b.attack*=2;b.spAttack*=2;return b}
 const itemStats={Leftovers:{hp:10},'Muscle Band':{attack:10},'Wise Glasses':{spAttack:10},'Quick Claw':{speed:10},'Hard Stone':{defense:10},'Mental Herb':{spDefense:10},'Silk Scarf':{attack:5,speed:5},'Wide Lens':{spAttack:5,speed:5},'Sitrus Berry':{hp:5,spDefense:5},'Focus Band':{defense:5,spDefense:5},'Choice Scarf':{speed:20},'Scope Lens':{attack:15,speed:5},'Rocky Helmet':{defense:15,hp:5},'Shell Bell':{hp:10,spDefense:10},'Expert Belt':{attack:10,spAttack:10},'Light Clay':{defense:10,spDefense:10},'Zoom Lens':{spAttack:15,spDefense:5},'Float Stone':{speed:15,hp:5},'Safety Goggles':{spDefense:15,defense:5},'Grip Claw':{attack:10,defense:10},'Choice Band':{attack:40},'Choice Specs':{spAttack:40},'Assault Vest':{defense:20,spDefense:15,hp:5},'Life Orb':{attack:15,spAttack:15,speed:10},'Iron Ball':{defense:30,attack:10},'Power Anklet':{speed:30,hp:10},'Power Lens':{spAttack:30,speed:10},'Power Weight':{hp:30,defense:10},'Power Band':{spDefense:30,defense:10},'Weakness Policy':{attack:20,spAttack:20}}[item]||{};
 for(const [k,v] of Object.entries(itemStats))b[k]+=v;
 return b;
}
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
 const challenge=getChallenge();
 if(CHALLENGE_MODE){
  if(!challenge)return null;
  return {name:'CHALLENGE XI',formation:challenge.locked.formation,lineup:challenge.locked.roster.slice(),source:{items:challenge.locked.items.slice()},challenge};
 }
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
function player(id,i,role,prefix,held){
 const p=BY.get(id);if(!p)throw Error('Missing Pokédex species #'+id);
 const b=heldStats(p,held);
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
 const challenge=home.challenge||null;
 const seed=challenge?'challenge:'+challenge.rng+':'+challenge.round:String(Date.now())+':'+Math.floor(Math.random()*1e8)+':'+o.key;
 return {seed,fixtureIndex:1,season:1,opponent:o,challengeRound:challenge?.round??null,home:{id:challenge?'challenger':'home-xi',city:home.name,formation:home.formation,tactic:challenge?challenge.locked.tactic:$('tactic').value,lineup:home.lineup.map((id,i)=>player(id,i,roles[i],challenge?'c':'home',home.source.items?.[i]))},
 away:{id:o.key,city:o.leader+' · '+o.city,formation:cpuFormation,tactic:o.tactic||'balanced',lineup:gymSquad(o).map((id,i)=>{
   const held=o.leader==='Blue'&&id===18?'Pidgeotite':o.leader==='Red'&&id===6?'Charizardite X':o.leader==='Red'&&id===25?'Light Ball':null;
   return player(id,i,FORMS[cpuFormation][i],'away',CHALLENGE_MODE?held:null);
 })}};
}
function updateXI(){
 const team=getXI(),complete=team?.lineup.filter(Boolean).length||0,box=$('xiStatus');
 const ready=complete===11;
 box.className='xi-status '+(ready?'ready':'warning');
 box.textContent=ready?'✓ '+team.name+' · '+team.formation+' · 11/11 Pokémon ready':CHALLENGE_MODE?'This Challenge match is finished or no locked XI was found. Return to Challenges.':'⚠ '+complete+'/11 Pokémon selected. Finish your XI in Free Builder or auto-fill the remaining slots.';
 $('quick').disabled=!ready||busy;
 $('watch').disabled=!ready||busy||(SOCCERJS_PREVIEW&&!SOCCERJS_READY);
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
 const challenge=getChallenge();
 const filter=CHALLENGE_MODE?'bosses':$('region').value,selected=challenge?OPP.filter(x=>x.tier!=='gym')[challenge.round]?.key:$('opponent').value;
 const options=OPP.filter(o=>filter==='bosses'?o.tier!=='gym':filter==='all'?o.tier==='gym':o.region===filter);
 $('opponent').innerHTML=options.map(o=>'<option value="'+o.key+'">'+esc(o.region)+' · '+esc(o.leader)+' ('+esc(o.city)+')</option>').join('');
 if(options.some(o=>o.key===selected))$('opponent').value=selected;
 selectOpponent();
}
function selectOpponent(){
 const o=opponent();if(!o)return;
 $('awayName').textContent=o.leader.toUpperCase();
 $('opponentCard').innerHTML='<strong>'+esc(o.leader)+'</strong><p>'+esc(o.city)+' · '+esc(o.region)+' · '+(o.tier==='gym'?'GYM LEADER':o.tier==='elite'?'ELITE FOUR':'CHAMPION')+'</p><span class="type-chip">'+esc(o.type.toUpperCase())+' SPECIALIST</span> <span class="type-chip">'+(o.roster?'FIXED ELITE XI':'GENERATED XI')+'</span>';
 if(!busy){preview=null;latestSnapshot=null;currentResult=null;liveEvents=[];$('score').textContent='– : –';$('matchClock').textContent='PRE-MATCH';$('matchState').textContent='Ready for kickoff';$('matchResult').innerHTML='<div class="empty-state"><span>⚽</span><strong>EXHIBITION FIXTURE</strong><p>Select Quick Sim or Watch Match to kick off.</p></div>';drawPitch();renderLiveTimeline()}
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
function renderLiveTimeline(events=liveEvents,origin='tacticmesh',complete=false){
 const el=$('liveEventFeed'),count=$('liveEventCount');
 if(!el||!count)return;
 const report=window.PFC_MATCH_REPORT;
 const timeline=preview&&report?.timelineFromEvents?report.timelineFromEvents(events,preview,origin):[];
 count.textContent=timeline.length+' RECORDED';
 // Show newest events first in both modes; full-time shows the complete
 // authoritative event history, while active play limits DOM work.
 const shown=complete?timeline:timeline.slice(-30);
 const groups=el.querySelectorAll?.('[data-timeline-group]')||[];
 const previous=Array.from(groups).reduce((states,node)=>(states[node.dataset.timelineGroup]=node.open,states),{});
 el.innerHTML=report?.renderGroupedTimeline?.(shown.slice().reverse(),{
  goalsOpen:previous.goals!==false,otherOpen:previous.other===true,
  goalsEmpty:complete?'No goals were recorded for this match.':'No goals recorded yet.',
  otherEmpty:complete?'No other recorded events for this match.':'No saves or other events recorded yet.'
 })||'<p class="match-event-empty">The match timeline is unavailable.</p>';
}
function showSnapshot(s,ev){
 if(!s)return;latestSnapshot=s;
 const score=scoreFromSnapshot(s);if(score)$('score').textContent=score.join(' : ');
 const mins=Math.max(0,Math.min(90,Number(s.elapsedSeconds||0)/60));
 $('matchClock').textContent=Math.floor(mins)+"' / 90'";
 if(ev?.length){
  let changed=false;
  for(const e of ev){
   if(!['goal','foul','card','substitution','half-time','second-half','full-time'].includes(e?.type))continue;
   const key=x=>[x.type,x.minute,x.team,x.player,x.assist,x.card,x.playerOff,x.playerOn].join('|');
   if(!liveEvents.some(x=>key(x)===key(e))){liveEvents.push({...e,origin:'tacticmesh'});changed=true}
  }
  if(changed)renderLiveTimeline();
 }
 drawPitch(s);
}
function saveChallengeResult(result){
 if(!CHALLENGE_MODE||!preview||preview.challengeRound==null)return null;
 const challenge=getChallenge();
 if(!challenge||challenge.round!==preview.challengeRound||challenge.locked.roster.some((id,i)=>Number(id)!==Number(preview.home.lineup[i].speciesId)))return null;
 const alreadyResolved=result.knockoutDecision?.version==='pse-knockout-v1';
 const ko=alreadyResolved?{
  match:result,regulationScore:(result.regulationScore||result.score).slice(),
  shootout:result.shootout||null,
  extraTime:result.durationMinutes===120?{
   score:result.extraTimeScore,
   events:result.events.filter(e=>e.phase==='extra-time')
  }:null
 }:result.origin==='quick-sim'&&window.PFC_KNOCKOUT?
  window.PFC_KNOCKOUT.resolve(preview,result,{seed:preview.seed}):null;
 const official=ko?.match||result;
 let outcome=official.score[0]>official.score[1]?'Victory':official.score[0]<official.score[1]?'Defeat':'Draw';
 let tiebreak=null,shootout=ko?.shootout||null;
 if(shootout){
  outcome=shootout.winner==='home'?'Victory':'Defeat';
  tiebreak='Penalty shootout '+shootout.home+'–'+shootout.away+' · official PSE modeled kicks';
 }else if(ko?.extraTime){
  tiebreak='Extra time '+ko.extraTime.score.join('–')+' · PSE 120-minute result';
 }else if(outcome==='Draw'){
  const rng=window.FXI_QUICK.randomizer(preview.seed+':penalties');
  let a=3+Math.floor(rng()*3),b=3+Math.floor(rng()*3);
  if(a===b){if(rng()<.5)a++;else b++}
  outcome=a>b?'Victory':'Defeat';
  tiebreak='Penalty shootout '+a+'–'+b+' · provisional draw resolver (full extra-time engine pending)';
 }
 const record={boss:preview.opponent.leader,round:challenge.round+1,
  score:official.score.slice(),shots:official.stats.map(x=>x.shots),passes:official.stats.map(x=>x.passes),
  outcome,tiebreak,shootout,seed:preview.seed,origin:official.origin,
  ...(ko?{knockoutRules:'pse-knockout-v1',regulationScore:ko.regulationScore,
   extraTime:ko.extraTime?{score:ko.extraTime.score,events:ko.extraTime.events}:null}:{}),
  report:window.PFC_MATCH_REPORT?.fromResult(official,preview)||null};
 challenge.history=Array.isArray(challenge.history)?challenge.history:[];
 challenge.result=record;challenge.history.push({...record});
 challenge.phase=outcome!=='Victory'||challenge.round===5?'finished':'result';
 try{
  localStorage.setItem(CHALLENGE_KEY,JSON.stringify(challenge));
  if(challenge.phase==='finished'){
   const key='pokefc-challenge-personal-records-v1';
   let board={};try{board=JSON.parse(localStorage.getItem(key))||{}}catch{}
   const cat=(challenge.pool===4?'classic':'national')+'-'+(challenge.legends?'legends':'standard');
   const before=board[cat]||{attempts:0,best:0,champions:0};
   board[cat]={attempts:before.attempts+1,best:Math.max(before.best,challenge.history.length),champions:before.champions+(challenge.history.length===6&&outcome==='Victory'?1:0)};
   localStorage.setItem(key,JSON.stringify(board));
  }
 }catch(e){$('engineStatus').textContent='Match complete, but Challenge save failed: '+e.message;return null}
 if(challenge.phase==='finished')window.PFC_CHALLENGE_LEADERBOARD?.archive(challenge,localStorage);
 $('returnChallenge').hidden=false;
 return {...record,match:official};
}
function officialStatHtml(result){
 const rows=[['Shots','shots'],['Shots on target','shotsOnTarget'],['Saves','saves'],
  ['Possession','possession'],['Passes','passes'],['Completed passes','completedPasses'],
   ['Tackles won','tackles'],['Corners','corners'],['Fouls','foulsCommitted'],
   ['Free kicks','freeKicks'],['Match penalties','penaltyKicks']];
 const table=rows.filter(([,key])=>result.stats?.some(t=>t[key]!=null)).map(([label,key])=>'<div class="stat-row"><span>'+
  esc(result.stats?.[0]?.[key]??'—')+(key==='possession'?'%':'')+
  '</span><small>'+esc(label)+'</small><span>'+
  esc(result.stats?.[1]?.[key]??'—')+(key==='possession'?'%':'')+
  '</span></div>').join('');
 const players=(preview?[preview.home,preview.away]:[]).flatMap((team,side)=>
  team.lineup.map(p=>({side,name:p.name||p.species||p.id,
   count:Number(result.box?.[p.id]?.shotsOnTarget||0)})));
 const shots=players.filter(x=>Number.isInteger(x.count)&&x.count>0)
  .sort((a,b)=>a.side-b.side||b.count-a.count||String(a.name).localeCompare(String(b.name)));
 const detail=shots.map(x=>'<div class="stat-row"><span>'+
  (x.side?'AWAY':'HOME')+'</span><small>'+esc(x.name)+'</small><span>'+x.count+' SOT</span></div>').join('');
 return '<div class="stat-table">'+table+'</div><h4>POKÉMON SHOTS ON TARGET</h4>'+
  (detail?'<div class="stat-table">'+detail+'</div>':
   '<p class="result-meta">No individual shots on target recorded.</p>')+
  (result.setPieceRules==='v1'?
   '<p class="result-meta">PSE v1 · Official corners, fouls, free kicks and match penalties.</p>':
   '<p class="result-meta">Set-piece statistics unavailable in legacy matches.</p>');
}
function showResult(result){
 const challengeRecord=saveChallengeResult(result);
 const displayed=challengeRecord?.match||result;
 currentResult=displayed;
 $('score').textContent=displayed.score.join(' : ');
 $('matchClock').textContent=challengeRecord?.extraTime?"120' · FULL TIME":'FULL TIME';
 $('matchState').textContent=challengeRecord?challengeRecord.outcome.toUpperCase():displayed.score[0]>displayed.score[1]?'HOME WIN':displayed.score[0]<displayed.score[1]?'AWAY WIN':'DRAW';
 $('modeTag').textContent=displayed.origin==='tacticmesh'?'WATCHED':displayed.origin==='hybrid'?'WATCH → SIM':'QUICK SIM';
 $('matchResult').innerHTML=(challengeRecord&&challengeRecord.tiebreak?
  '<p class="result-meta">'+esc(challengeRecord.tiebreak)+'</p>':'')+
  '<div class="result-title"><strong>'+($('matchState').textContent)+
  '</strong><span class="result-meta">'+esc(displayed.origin.toUpperCase())+'</span></div>'+
  officialStatHtml(displayed);
 // One feed serves live commentary and official full-time history.
 // Events still retain their WATCHED/QUICK continuation origin in the match data.
 renderLiveTimeline(displayed.events||[],displayed.origin,true);
 return challengeRecord;
}
function stateBusy(isBusy){
 busy=isBusy;
 updateXI();
 $('region').disabled=isBusy||CHALLENGE_MODE;$('opponent').disabled=isBusy||CHALLENGE_MODE;$('tactic').disabled=isBusy||CHALLENGE_MODE;
 $('fillXI').disabled=isBusy||CHALLENGE_MODE;
}
function stopWatch(){
 if(soccerSession){soccerSession.destroy();soccerSession=null}
 $('watchFullscreen').hidden=true;
 if($('soccerHighlights')){$('soccerHighlights').hidden=true;$('soccerHighlights').disabled=true}
 if(SOCCERJS_PREVIEW){
  document.querySelector('.field-shell')?.classList.remove('soccerjs-active');
  $('soccerWatchActions').hidden=true;$('soccerRecord').disabled=true;
 }
 if(controller){controller.close();controller=null}
 stateBusy(false);
 $('pause').disabled=true;$('resume').disabled=true;$('simRemaining').disabled=true;
}
function quickSim(){
 try{
  stopWatch();preview=makePreview();latestSnapshot=null;liveEvents=[];drawPitch();renderLiveTimeline();
  const out=window.FXI_QUICK.simulate(preview,{seed:preview.seed,...setPieceOptions()});
  showResult(out);$('engineStatus').textContent='Instant statistical Quick Sim result. Match positions shown schematically; no physics were played.';
 }catch(e){$('engineStatus').textContent='Quick Sim failed: '+e.message}
}
function watchSoccerPreview(){
 try{
  if(!window.FXI_PHASE10_WATCH?.mountInline)throw Error('Inline Soccer-JS bridge unavailable');
  // Watch is disabled during a live fixture. On completion, dispose the
  // prior recorded session before checking the bridge for a new fixture.
  stopWatch();
  if(window.FXI_PHASE10_WATCH.isActive())throw Error('Another match is already being watched');
  preview=makePreview();latestSnapshot=null;liveEvents=[];drawPitch();renderLiveTimeline();
  // Lock the entire authoritative knockout before kickoff. No second draw at Record.
  const regulation=window.FXI_QUICK.simulate(preview,{seed:preview.seed,...setPieceOptions()});
  const decision=CHALLENGE_MODE&&window.PFC_KNOCKOUT?
   window.PFC_KNOCKOUT.resolve(preview,regulation,{seed:preview.seed}):null;
  const official=decision?{...decision.match,
   knockoutDecision:{version:'pse-knockout-v1',winner:decision.winner,
    decidedBy:decision.decidedBy},
   ...(decision.shootout?{shootout:decision.shootout}:{})}:regulation;
  const duration=official.durationMinutes===120?120:90;
  let lastShownMinute=-1;
  $('soccerProjection').value='orthographic';$('soccerCamera').value='follow';
  $('soccerWatchActions').hidden=false;$('soccerRecord').hidden=false;$('soccerRecord').disabled=true;$('soccerCancel').disabled=false;
  $('soccerHighlights').hidden=false;$('soccerHighlights').disabled=true;
  $('soccerHighlights').onclick=()=>soccerSession?.openHighlights?.();
  $('score').textContent='0 : 0';$('modeTag').textContent='SOCCER-JS · 2.5D';
  $('matchClock').textContent="0' / "+duration+"'";$('matchState').textContent=
   duration===120?'Preparing 120-minute knockout replay':'Preparing Broadcast match viewer';
  $('engineStatus').textContent='Loading 2.5D Soccer-JS graphics; official Quick Sim outcome already locked.';
  stateBusy(true);
  const viewport=document.querySelector('.field-shell');
  viewport.classList.add('soccerjs-active');
  soccerSession=window.FXI_PHASE10_WATCH.mountInline({
   preview,result:official,container:viewport,autoRecordOnSimToEnd:true,
   onReady:(session)=>{
    session.setProjection('orthographic');session.setCamera('follow');
     $('watchFullscreen').hidden=false;$('soccerHighlights').disabled=false;
    session.play(Number($('watchSpeed').value)||1);
    $('pause').disabled=false;$('resume').disabled=true;$('simRemaining').disabled=false;
    $('matchState').textContent='WATCHING · BROADCAST';
    $('engineStatus').textContent='Soccer-JS 2.5D in the match screen. Movement is illustrative; scores and statistics are official Quick Sim.';
   },
   onProgress:({minute,score,finished,handedOff,kickIndex=0,shootout,pausedForGoal=false})=>{
    $('score').textContent=score.join(' : ');
    const totalKicks=shootout?.attempts.length||0;
    $('matchClock').textContent=finished?'FULL TIME':
     totalKicks&&minute>=duration?'PENALTIES '+kickIndex+'/'+totalKicks:
     Math.floor(minute)+"' / "+duration+"'";
    if(pausedForGoal&&!finished){
     $('matchState').textContent='GOAL! · PAUSED FOR REPLAY';
     $('pause').disabled=true;$('resume').disabled=false;
    }
    const displayMinute=Math.floor(minute);
    if((displayMinute!==lastShownMinute||totalKicks&&minute>=duration)&&!finished){
     lastShownMinute=displayMinute;
     const recorded=(official.events||[]).filter(e=>Number(e.minute)<=minute);
     const onTarget=[0,0];
     for(const e of recorded){
      const side=String(e.team)===String(preview.home.id)?0:1;
      if(e.type==='goal')onTarget[side]++;
      else if(e.type==='save')onTarget[1-side]++;
     }
     $('matchResult').innerHTML='<div class="result-title"><strong>SHOTS ON TARGET SO FAR</strong>'+
      '<span class="result-meta">'+onTarget.join(' – ')+'</span></div>'+
      '<p class="result-meta">Official goals and goalkeeper saves shown as they occur. Full match statistics appear at full time.</p>';
     renderLiveTimeline(recorded,'quick-sim');
    }
    if(finished){
     $('matchResult').innerHTML='<div class="result-title"><strong>'+
      (handedOff?'FULL TIME · FINALIZING RESULT':'FULL TIME · READY TO RECORD')+
      '</strong><span class="result-meta">'+official.score.join(' – ')+'</span></div>'+
      officialStatHtml(official)+
      (handedOff?'':'<p class="result-meta">Record the official result to finish this watched match.</p>');
     renderLiveTimeline(official.events||[],'quick-sim',true);
     $('matchState').textContent=handedOff?'FULL TIME · FINALIZING':'FULL TIME · READY TO RECORD';
     $('pause').disabled=true;$('resume').disabled=true;$('simRemaining').disabled=true;
     $('soccerRecord').disabled=!!handedOff;
     $('engineStatus').textContent='Full time '+duration+"'"+': '+official.score.join('–')+
      (official.shootout?' · Penalties '+official.shootout.home+'–'+official.shootout.away:'')+
      (handedOff?' · Saving official result…':' · Record the locked PSE result to finish the fixture.');
    }
   },
   onRecord:({result,handoff})=>{
    const challengeRecord=showResult(result);stateBusy(false);
    $('soccerRecord').disabled=true;$('soccerCancel').disabled=true;
    $('pause').disabled=true;$('resume').disabled=true;$('simRemaining').disabled=true;
    $('modeTag').textContent=handoff==='watch-to-quick-sim'?'2.5D WATCH → SIM':'SOCCER-JS 2.5D';
    $('engineStatus').textContent='Official Quick Sim result recorded once. The 2.5D final frame remains visible.';
    if(handoff==='watch-to-quick-sim'){
     $('soccerRecord').hidden=true;
     if(CHALLENGE_MODE&&challengeRecord&&typeof window.location?.assign==='function'){
      window.location.assign('../challenge/'); // Saved run opens its match-result dialog.
     }else if(!CHALLENGE_MODE){
      $('matchResult')?.scrollIntoView?.({behavior:'smooth',block:'start'});
     }
    }
   },
   onCancel:()=>{
    stopWatch();
    $('score').textContent='– : –';$('matchClock').textContent='PRE-MATCH';$('matchState').textContent='Watch canceled';
    $('modeTag').textContent='READY';drawPitch();renderLiveTimeline();
    $('engineStatus').textContent='Watch canceled without recording; game and Challenge saves unchanged.';
   },
   onStatus:({state,message})=>{
    if(state==='error'){
     $('pause').disabled=true;$('resume').disabled=true;$('simRemaining').disabled=true;$('soccerRecord').disabled=true;
     $('matchState').textContent='SOCCER-JS VIEWER ERROR';
     $('engineStatus').textContent=message||'Soccer-JS renderer could not initialize; cancel Watch to retry.';
    }else if(state==='simulating-to-end')$('engineStatus').textContent='Showing the already locked official Quick Sim result…';
   }
  });
 }catch(error){
  stopWatch();$('engineStatus').textContent='Soccer-JS 2.5D test unavailable: '+(error?.message||error);
 }
}
function loadSoccerBridge(){
 $('watch').textContent='▶ WATCH MATCH · 2.5D';
 $('engineStatus').textContent='Loading Soccer-JS 2.5D Watch. You can also use instant Quick Sim.';
 const script=document.createElement('script');
 script.src='../watch/soccerjs/watch-bridge.js?v=9';
 script.onload=()=>{
  SOCCERJS_READY=!!window.FXI_PHASE10_WATCH;
  updateXI();
  if(!SOCCERJS_READY)$('engineStatus').textContent='Soccer-JS bridge script loaded without an API.';
 };
 script.onerror=()=>{$('watch').disabled=true;$('engineStatus').textContent='Soccer-JS bridge missing; serve development sources locally.';};
 document.head.append(script);
}
async function watchMatch(){
 try{
  stopWatch();
  preview=makePreview();latestSnapshot=null;liveEvents=[];
  stateBusy(true);drawPitch();renderLiveTimeline();
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
 if(CHALLENGE_MODE){
  $('playIntroLabel').textContent='LOCKED CHALLENGE · WATCH OR QUICK SIM · ONE ATTEMPT';
  $('playIntroHeading').textContent='CHALLENGE MATCH.';
  $('playIntroText').textContent='Your locked Final XI, formation, tactics and items carry into this match. The result automatically advances or ends your Challenge attempt.';
  $('teamActions').hidden=true;
  $('setPiecesPanel').hidden=true;$('setPiecesMode').value='legacy';
  $('setPiecesMode').disabled=true;
  $('region').value='bosses';
  const challenger=getChallenge();if(challenger)$('tactic').value=challenger.locked.tactic;
  $('region').disabled=true;$('opponent').disabled=true;$('tactic').disabled=true;$('fillXI').disabled=true;
  $('returnChallenge').hidden=false;
 }
 if(window.location){
   const toggle=$('watchEngineSwitch');
   if(toggle){
    const query=new URLSearchParams(window.location.search||'');
    query.set('watch',SOCCERJS_PREVIEW?'tacticmesh':'soccerjs');
    toggle.href='?'+query.toString();
    toggle.textContent=SOCCERJS_PREVIEW?'Use legacy Watch':'Use Soccer-JS 2.5D Watch';
   }
  }
  if(S.length!==1025||OPP.length!==38){$('engineStatus').textContent='Game data incomplete. Reload this page.';return}
 $('region').addEventListener('change',fillOpponents);
 $('opponent').addEventListener('change',selectOpponent);
 $('fillXI').addEventListener('click',autoFill);
 $('quick').addEventListener('click',quickSim);
 $('watch').addEventListener('click',SOCCERJS_PREVIEW?watchSoccerPreview:watchMatch);
 if(SOCCERJS_PREVIEW){
  $('soccerRecord').addEventListener('click',()=>{try{soccerSession?.record()}catch(e){$('engineStatus').textContent='Recording failed: '+e.message}});
  $('soccerCancel').addEventListener('click',()=>soccerSession?.cancel());
   $('watchFullscreen').addEventListener('click',()=>{
    if(!soccerSession||!window.FXI_PHASE10_WATCH?.toggleFullscreen)return;
    const pitch=document.querySelector('.field-shell');
    void window.FXI_PHASE10_WATCH.toggleFullscreen(pitch).catch(error=>{
     $('engineStatus').textContent='Fullscreen unavailable: '+String(error?.message||error);
    });
   });
  $('soccerProjection').addEventListener('change',e=>soccerSession?.setProjection(e.target.value));
  $('soccerCamera').addEventListener('change',e=>soccerSession?.setCamera(e.target.value));
  loadSoccerBridge();
 }
 $('pause').addEventListener('click',()=>{if(soccerSession)soccerSession.pause();else controller?.pause();$('pause').disabled=true;$('resume').disabled=false;$('matchState').textContent='PAUSED'});
 $('resume').addEventListener('click',()=>{if(soccerSession)soccerSession.play(Number($('watchSpeed').value)||1);else controller?.play(Number($('watchSpeed').value)||4);$('resume').disabled=true;$('pause').disabled=false;$('matchState').textContent='WATCHING'});
 $('simRemaining').addEventListener('click',()=>{
  if(soccerSession){
   if(soccerSession.simToEnd()){$('simRemaining').disabled=true;$('pause').disabled=true;$('resume').disabled=true;}
   return;
  }
  if(!controller)return;
  $('simRemaining').disabled=true;$('pause').disabled=true;$('resume').disabled=true;
  $('engineStatus').textContent='Validating live TacticMesh handoff…';controller.handoff();
 });
 $('watchSpeed').addEventListener('change',e=>{if(soccerSession)soccerSession.setSpeed(Number(e.target.value)||1);else controller?.speed(Number(e.target.value)||4)});
 window.addEventListener('pageshow',updateXI);
 fillOpponents();updateXI();drawPitch();
}
start();
window.PFC_PLAY={getXI,gymSquad,makePreview,opponents:OPP};
})();
