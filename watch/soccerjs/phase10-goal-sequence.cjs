'use strict';
// Distance-timed presentation of an already recorded PSE goal.
const Director=require('./phase10-play-director.cjs');
const Wall=require('./phase10-wall-physics.cjs');
const cache=new WeakMap();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const lerp=(a,b,u)=>a+(b-a)*clamp(u,0,1);
const CARRY_SPEED=3.6,PASS_SPEED=14,SHOT_SPEED=24,RUN_SPEED=4;
// Preserve any genuinely preceding defensive clearance instead of laying
// the official goal animation over its airborne ball. The receiving outfielder
// must meet that clearance, then carry and pass at the existing capped speeds.
// This only schedules visual motion; the PSE event minute never changes.
function connectClearance(f,field,event,s,normalFrame){
 const plan=Director.planFor(f,field),goalSecond=event.minute*60;
 const recent=plan.actions.filter(a=>a.mode==='pass'&&a.pattern==='defensive-clearance'&&
  Math.floor(a.owner/11)===s.side&&a.start>s.start+.1&&
  a.end<goalSecond-.3&&a.end<=s.shotStart-2&&a.end>=goalSecond-30).at(-1);
 if(!recent)return s;
 const active=recent.end+1e-5,received=normalFrame(active);
 const owner=recent.receiver,source={...received.ball};
 const missing=reason=>({...s,scheduleConflict:{
  kind:'clearance-to-goal',reason,seed:String(f.visualSeed||f.seed||''),
  clearanceStart:recent.start,clearanceArrival:recent.end,
  officialSecond:goalSecond,availableSeconds:s.shotStart-active,
  eventId:event.id||null}});
 if(!Number.isInteger(owner)||owner%11===0||Math.floor(owner/11)!==s.side||
  received.ownerIndex!==owner||distance(received.actors[owner],source)>1.8)
  return missing('Clearance has no controlled receiving touch on scoring side');
 // If the PSE scorer received the clearance, do not invent a teammate pass.
 // The scorer takes a controlled first touch and dribbles into an attainable
 // shooting location. Moving that shot slightly farther from goal may buy
 // enough time without speeding up any player or the ball.
 if(owner===s.scorer){
  let solution=null;
  for(let shift=0;shift<=8;shift+=.25){
   const proposed={x:s.finish.x+(s.side===0?-shift:shift),
    y:s.finish.y,z:.23};
   const shotStart=s.end-distance(proposed,s.net)/SHOT_SPEED;
   const travelTime=shotStart-active,runDistance=distance(source,proposed);
   if(travelTime>0&&runDistance<=CARRY_SPEED*travelTime+.001){
    solution={finish:proposed,shotStart};break;
   }
  }
  if(!solution)return missing('Recorded scorer cannot carry into shooting range at 3.6 m/s');
  let start=s.start,opening=normalFrame(start);
  for(let n=0;n<12;n++){
   const required=distance(opening.actors[owner],source)/RUN_SPEED;
   if(active-start>=required-.01||start===0)break;
   start=Math.max(0,start-(required-(active-start))-.1);
   opening=normalFrame(start);
  }
  if(distance(opening.actors[owner],source)>RUN_SPEED*(active-start)+.05)
   return missing('Scorer cannot physically receive the clearance');
  return {...s,start,openingRun:opening,opening:received,active,from:source,
   finish:solution.finish,shotStart:solution.shotStart,
   passFrom:solution.finish,passStart:solution.shotStart,
   support:owner,directCarry:true,clearance:{
    start:recent.start,arrival:recent.end,receiver:owner,
    from:{...recent.from},to:{...recent.to},controlledAt:active},
   scheduleConflict:null};
 }
 const total=distance(source,s.finish),available=s.shotStart-active;
 const room=available-total/PASS_SPEED;
 const maximumCarry=room/(1/CARRY_SPEED-1/PASS_SPEED);
 if(room<=0||maximumCarry<2.5)
  return missing('Not enough PSE time for controlled carry and capped final pass');
 const carryDistance=Math.min(total*.42,maximumCarry*.82);
 const ratio=total?carryDistance/total:0;
 const passFrom={x:lerp(source.x,s.finish.x,ratio),
  y:lerp(source.y,s.finish.y,ratio),z:.23};
 const passTime=Math.max(.12,distance(passFrom,s.finish)/PASS_SPEED);
 const passStart=s.shotStart-passTime;
 if((passStart-active)*CARRY_SPEED+1e-5<carryDistance||
    passStart<=active+.2)
  return missing('Controlled carry would exceed 3.6 m/s');
 // The original scene starts early enough for the scorer's off-ball run.
 // The actual clearance remains visible until its receiving touch.
 let start=s.start,opening=normalFrame(start);
 for(let n=0;n<12;n++){
  const runner=distance(opening.actors[s.scorer],s.finish)/RUN_SPEED;
  const receiver=distance(opening.actors[owner],source)/RUN_SPEED;
  if(s.shotStart-start>=runner-.01&&active-start>=receiver-.01)break;
  const needed=Math.max(runner-(s.shotStart-start),receiver-(active-start));
  if(start===0)return missing('Outfield receiver or shooter cannot reach the ball on time');
  start=Math.max(0,start-needed-.1);opening=normalFrame(start);
 }
 if(distance(opening.actors[s.scorer],s.finish)>RUN_SPEED*(s.shotStart-start)+.05||
    distance(opening.actors[owner],source)>RUN_SPEED*(active-start)+.05)
  return missing('Outfield runner would exceed 4 m/s');
 return {...s,start,openingRun:opening,opening:received,active,from:source,
  passFrom,passStart,support:owner,clearance:{
   start:recent.start,arrival:recent.end,receiver:owner,
   from:{...recent.from},to:{...recent.to},controlledAt:active},
  scheduleConflict:null};
}
function forGoal(f,field,event,normalFrame){
 const key=field.width+':'+field.height;
 const previous=cache.get(event);if(previous?.key===key&&previous.fixture===f)return previous;
 const side=event.team===f.home.id?0:1,team=side===0?f.home:f.away;
 const scorerIndex=team.lineup.findIndex(p=>String(p.id)===String(event.player));
 if(scorerIndex<0)throw Error('Goal scorer absent');
 const scorer=side*11+scorerIndex;
 const end=event.minute*60,wing=Director.hash(event.player+':'+event.minute)%2?1:-1;
 let data;
 for(let lead=.2;lead<=100;lead+=.1){
  const active=Math.max(0,end-lead),opening=normalFrame(active),from=opening.ball;
  // Start from a real received possession on the scoring side. Do not
  // reassign an opponent's carried ball to an unrelated nearby attacker.
  const owner=opening.ownerIndex;
  if(!Number.isInteger(owner)||owner<0||Math.floor(owner/11)!==side||owner===scorer)continue;
  if(distance(opening.actors[owner],from)>1.8)continue;
  const progress=(side===0?from.x:field.width-from.x)/field.width;
  const finishProgress=Math.min(1-(Wall.RADIUS+.025)/field.width,Math.max(.83,progress+.025));
  const finish={x:side===0?field.width*finishProgress:field.width*(1-finishProgress),y:field.height*.5};
  const net={x:side===0?field.width+.9:-.9,y:field.height*.5+wing*2.15,z:.23};
  const totalDistance=distance(from,finish);
  const shotDuration=Math.max(.12,distance(finish,net)/SHOT_SPEED);
  // Use real carry/pass speeds to fill the available lead, rather than
  // slowing an eight-metre carry while waiting for the official timestamp.
  const carryDistance=((end-active)-shotDuration-totalDistance/PASS_SPEED)/(1/CARRY_SPEED-1/PASS_SPEED);
  if(carryDistance<0||carryDistance>totalDistance-.2)continue;
  const ratio=totalDistance?carryDistance/totalDistance:0;
  const passFrom={x:lerp(from.x,finish.x,ratio),y:lerp(from.y,finish.y,ratio),z:.23};
  const passDuration=Math.max(.12,distance(passFrom,finish)/PASS_SPEED);
  data={active,opening,from,finish,net,passFrom,
   passStart:Math.max(active,end-shotDuration-passDuration),shotStart:Math.max(active,end-shotDuration)};
  break;
 }
 if(!data){
  // Legacy snapshots may have no compatible received possession near an
  // already-recorded goal. Keep a local, distance-timed visual approach;
  // never start a fallback at minute zero and mask the rest of the match.
  for(let lead=.2;lead<=35;lead+=.1){
   const active=Math.max(0,end-lead),opening=normalFrame(active),from=opening.ball;
   const progress=(side===0?from.x:field.width-from.x)/field.width;
   const finishProgress=Math.min(1-(Wall.RADIUS+.025)/field.width,Math.max(.83,progress+.025));
   const finish={x:side===0?field.width*finishProgress:field.width*(1-finishProgress),y:field.height*.5};
   const net={x:side===0?field.width+.9:-.9,y:field.height*.5+wing*2.15,z:.23};
   const total=distance(from,finish),shotDuration=Math.max(.12,distance(finish,net)/SHOT_SPEED);
   const carryDistance=((end-active)-shotDuration-total/PASS_SPEED)/(1/CARRY_SPEED-1/PASS_SPEED);
   if(carryDistance<0||carryDistance>total-.2)continue;
   const passFrom={x:lerp(from.x,finish.x,carryDistance/total),y:lerp(from.y,finish.y,carryDistance/total),z:.23};
   const passDuration=Math.max(.12,distance(passFrom,finish)/PASS_SPEED);
   data={active,opening,from,finish,net,passFrom,passStart:end-shotDuration-passDuration,shotStart:end-shotDuration,legacyOpening:true};break;
  }
 }
 if(!data)throw Error('Cannot time goal sequence');
 let start=data.active;
 // Let the recorded scorer make a normal run while ordinary play continues.
 for(let i=0;i<12;i++){
  const opening=normalFrame(start),required=distance(opening.actors[scorer],data.finish)/RUN_SPEED;
  if(data.shotStart-start>=required-.01||start===0)break;
  start=Math.max(0,start-(required-(data.shotStart-start))-.1);
 }
 let opening=normalFrame(start);
 let support=data.opening.ownerIndex;
 if(!Number.isInteger(support)||support<0||Math.floor(support/11)!==side||support===scorer){
  support=Array.from({length:10},(_,i)=>side*11+i+1).filter(id=>id!==scorer)
   .sort((a,b)=>distance(data.opening.actors[a],data.from)-distance(data.opening.actors[b],data.from))[0];
 }
 // A legacy possession handoff needs a reachable supporting runner at
 // the real ball before the carry begins, rather than carrying remotely.
 for(let i=0;i<12;i++){
  opening=normalFrame(start);
  const required=distance(opening.actors[support],data.from)/RUN_SPEED;
  if(data.opening.ownerIndex===support||data.active-start>=required||start===0)break;
  start=Math.max(0,start-(required-(data.active-start))-.1);
 }
 opening=normalFrame(start);
 const result={...data,key,fixture:f,start,end,openingRun:opening,side,scorer,support,wing};
 const connected=connectClearance(f,field,event,result,normalFrame);
 cache.set(event,connected);return connected;
}
function sample(sequence,plan,seconds){
 const s=sequence;
 if(seconds<s.active){const stage=Director.stageAt(plan,seconds);
  return {ball:Director.ballAt(stage,seconds),owner:stage.mode==='carry'?stage.owner:-1,phase:'ordinary'};}
 let from,to,start,end,phase,owner=-1,arc;
 if(seconds<s.passStart){from=s.from;to=s.passFrom;start=s.active;end=s.passStart;phase='run';owner=s.support;arc=0;}
 else if(seconds<s.shotStart){from=s.passFrom;to=s.finish;start=s.passStart;end=s.shotStart;phase='through';arc=.48;}
 else{from=s.finish;to=s.net;start=s.shotStart;end=s.end;phase='shot';arc=.8;}
 const u=clamp((seconds-start)/Math.max(.00001,end-start),0,1);
 return {ball:{x:lerp(from.x,to.x,u),y:lerp(from.y,to.y,u),
  z:lerp(from.z??.23,to.z??.23,u)+Math.sin(Math.PI*u)*arc},owner,phase};
}
module.exports={forGoal,sample,CARRY_SPEED,PASS_SPEED,SHOT_SPEED,RUN_SPEED};
