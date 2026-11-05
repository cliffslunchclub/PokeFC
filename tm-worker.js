/* TacticMesh official source is loaded unchanged from the local vendor folder.
   All football decisions, ball movement, match events and final scores come
   from original TF.engine. This worker never invokes PokeFC Quick Sim. */
'use strict';
let handle=null,active=false,finishing=false,timeout=null,speed=4,last=Date.now(),carry=0,cursor=null,lastPosted=0;
let rateStart=0,rateTicks=0,lastRate=0;
function emit(type,data={}){postMessage(Object.assign({type},data))}
function error(err){active=false;finishing=false;emit('error',{message:String(err&&err.message||err)})}
function snapshot(){const s=TF.engine.readSnapshot(handle);if(!s)return null;
 return {players:s.players.filter(p=>p.active).map(p=>({id:p.id,position:p.position,teamId:p.teamId})),ball:s.ball,
 score:s.score,elapsedSeconds:s.elapsedSeconds,period:s.period,status:s.status,phase:s.phase};}
function events(){const newEvents=cursor.read(handle.match.events||[]),m=handle.match;
 return newEvents.filter(e=>['goal','half-time','second-half','card','foul','substitution','full-time'].includes(e.type)).map(e=>({
 type:e.type,minute:Number(e.time||0)/60,
 team:m.teams.find(t=>t.id===e.teamId)?.sourceId??null,
 player:m.playersById[e.scorerId||e.playerId||e.offenderId]?.sourceId||null,
 assist:m.playersById[e.assistId]?.sourceId||null,
 playerOff:m.playersById[e.playerOffId]?.sourceId||null,
 playerOn:m.playersById[e.playerOnId]?.sourceId||null,
 card:e.card||null
 }));}
// Handoff is an atomic worker message: the pump is stopped before extracting
// actual match state. No physics runs after this snapshot is acknowledged.
function handoff(){
 if(!handle||!handle.match)throw Error('Cannot hand off an uninitialized match');
 active=false;finishing=false;
 if(timeout!=null)clearTimeout(timeout);timeout=null;
 const match=handle.match,reduced=TF.productReports.reduce(handle);
 if(!reduced?.consistency)throw Error('TacticMesh current score does not match its recorded goal events');
 const pMap=match.playersById||{};
 const resolve=id=>pMap[id]?.sourceId||null;
 const teamID=id=>match.teams.find(t=>t.id===id)?.sourceId||id;
 const originalEvents=(reduced.events||[]).filter(e=>['goal','card','substitution','foul'].includes(e.type));
 const records=originalEvents.map(e=>({
  type:e.type,minute:Math.max(0,Number(e.time||0)/60),
  minuteLabel:String(e.minute||Math.floor(Number(e.time||0)/60)),
  team:teamID(e.teamId),player:resolve(e.scorerId||e.playerId||e.offenderId),
  assist:resolve(e.assistId),playerOff:resolve(e.playerOffId),playerOn:resolve(e.playerOnId),
  card:e.card||null
 }));
 const players=(reduced.players||[]).map(p=>{
  const engine=pMap[p.id];
  if(!engine)throw Error('Handoff player missing from engine');
  return {id:String(p.sourceId),teamId:p.teamId,minutes:p.minutes,stats:p.stats,
   active:!!engine.active&&!engine.sentOff,sentOff:!!engine.sentOff,stamina:Number(engine.stamina)};
 });
 const partial={origin:'tacticmesh',matchId:match.id,seed:match.seed,tick:match.tick,
  elapsedSeconds:match.clock.elapsedSeconds,period:match.clock.period,score:{...match.score},
  teams:(reduced.teams||[]).map(t=>({id:t.id,stats:t.stats})),players,events:records};
 const goals=records.filter(e=>e.type==='goal');
 for(const side of ['home','away']){
  const club=match.teams[side==='home'?0:1].sourceId;
  if(goals.filter(e=>String(e.team)===String(club)).length!==Number(match.score[side]))
   throw Error('Handoff goal ledger and official score disagree');
 }
 emit('handoff',{partial,snapshot:snapshot()});
}
function end(){active=false;finishing=false;const r=TF.productReports.fromMatch(handle);
 if(!r?.complete)throw Error('Official TacticMesh report not complete');
 // Reduce transfer size. Data and scores below are all taken from the verified
 // official report, never predicted from our Quick Sim or guessed.
 const report={complete:r.complete,status:r.status,score:r.score,
  teams:r.teams.map(t=>({id:t.id,stats:t.stats})),
  players:r.players.map(p=>({id:p.id,sourceId:p.sourceId,minutes:p.minutes,stats:p.stats,rating:p.rating})),
  events:r.events.filter(e=>['goal','card','substitution','foul'].includes(e.type)),engineBuild:r.engineBuild,ratingModelVersion:r.ratingModelVersion};
 emit('done',{report,snapshot:snapshot()})}
function pump(){timeout=null;if(!active||!handle)return;
 try{
  const now=Date.now(),delta=Math.max(0,Math.min(1500,now-last));last=now;
  // Watched speed respects simulated game clock. Finishing uses full-speed
  // fixed-step TacticMesh, not a random result generator.
  if(!finishing)carry+=delta/1000*60*speed;
  let count=finishing?600:Math.min(600,Math.floor(carry));
  if(!finishing)carry-=count;
  if(count>0){const r=TF.engine.stepMatch(handle,count);if(r.status==='half-time')TF.engine.continueAfterHalfTime(handle);
   if(r.status==='completed'){const newEvents=events();emit('snapshot',{snapshot:snapshot(),events:newEvents});end();return}
   if(r.status==='error'||r.status==='cancelled')throw Error('Official engine returned '+r.status);
  }
  if(now-lastRate>=1000&&handle?.match){const ticks=Number(handle.match.tick)||0;const seconds=Math.max(.001,(now-rateStart)/1000);
   const ticksPerSecond=(ticks-rateTicks)/seconds;emit('performance',{metrics:{ticksPerSecond:Math.max(0,Math.round(ticksPerSecond)),
    realTimeFactor:Number((ticksPerSecond/60).toFixed(2)),requestedSpeed:finishing?null:speed,
    gameMinute:Number(((handle.match.clock?.elapsedSeconds||0)/60).toFixed(2)),finishing}});lastRate=now;rateStart=now;rateTicks=ticks;}
  if(now-lastPosted>100||!lastPosted){lastPosted=now;emit('snapshot',{snapshot:snapshot(),events:events()})}
  timeout=setTimeout(pump,finishing?0:20);
 }catch(e){error(e)}
}
function begin(){if(timeout!=null)clearTimeout(timeout);last=Date.now();rateStart=last;rateTicks=Number(handle?.match?.tick)||0;lastRate=last;active=true;timeout=setTimeout(pump,0)}
onmessage=e=>{const d=e.data||{};try{
 if(d.type==='init'){
  importScripts('./tacticmesh/vendor/core.js','./tacticmesh/vendor/analysis.js','./tacticmesh/vendor/world.js',
   './tacticmesh/vendor/tactics.js','./tacticmesh/vendor/intelligence.js','./tacticmesh/vendor/physics.js',
   './tacticmesh/vendor/rules.js','./tacticmesh/vendor/telemetry.js','./tacticmesh/vendor/product-data.js',
   './tacticmesh/vendor/engine-facade.js','./tacticmesh/vendor/product-reports.js');
  if(!self.TF?.engine?.createMatch||!self.TF?.productReports?.fromMatch)throw Error('TacticMesh modules unavailable. Run the local engine installer.');
  const validation=TF.engine.validateMatchConfig(d.config);
  if(!validation.ok)throw Error('Match input rejected: '+validation.errors.map(x=>x.path+' '+x.message).join('; '));
  handle=TF.engine.createMatch(d.config);cursor=TF.createEventCursor();emit('ready',{snapshot:snapshot()});
 }else if(d.type==='play'&&handle){speed=Math.max(1,Math.min(64,Number(d.speed)||4));finishing=false;begin()}
 else if(d.type==='pause'){active=false;if(timeout!=null)clearTimeout(timeout);timeout=null}
 else if(d.type==='speed'){speed=Math.max(1,Math.min(64,Number(d.speed)||4))}
 else if(d.type==='finish'&&handle){finishing=true;begin()}
 else if(d.type==='handoff'&&handle){handoff()}
 }catch(err){error(err)}
};
