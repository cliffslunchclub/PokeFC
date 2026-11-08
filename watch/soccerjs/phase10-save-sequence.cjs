'use strict';
// Official saves are immutable PSE events; all movement between them is visual.
const Goal=require('./phase10-goal-sequence.cjs'),Director=require('./phase10-play-director.cjs');
const Onside=require('./phase10-onside-movement.cjs');
const cache=new WeakMap(),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),mix=(a,b,u)=>a+(b-a)*clamp(u,0,1);
const blend=(a,b,u)=>({...a,x:mix(a.x,b.x,u),y:mix(a.y,b.y,u),z:mix(a.z||0,b.z||0,u)});
function sequence(f,field,event,normal){
 let stored=cache.get(event);if(stored?.fixture===f&&stored.width===field.width&&stored.height===field.height)return stored;
 const defending=String(event.team)===String(f.home.id)?0:1,side=1-defending;
 const team=side===0?f.home:f.away,keepers=defending===0?f.home:f.away;
 const shooter=team.lineup.findIndex(p=>String(p.id)===String(event.shooter));
 const keeper=keepers.lineup.findIndex(p=>String(p.id)===String(event.player));
 // Old exports without a shooter retain their ledger entry, never invent one.
 if(shooter<0||keeper<0)return null;
 const proxy={...event,type:'goal',team:team.id,player:event.shooter};
 const s=Goal.forGoal(f,field,proxy,normal),end=event.minute*60,keeperId=defending*11+keeper;
 const atEnd=normal(end),p=atEnd.actors[keeperId];
 const catchPoint={x:clamp(p.x,defending===0?2:field.width-10,defending===0?10:field.width-2),y:clamp(p.y,field.height/2-7,field.height/2+7),z:.75};
 // If the scheduled shooter caught the clearance, preserve that touch
 // through the subsequent official save: no remote ball teleport or invented
 // assist. Adjust the shooting spot only within the legal 25 m chance range.
 const connected=!!s.clearance&&!s.scheduleConflict;
 let finishPoint={...s.finish};
 let shotStart=end-Math.max(.12,dist(finishPoint,catchPoint)/24);
 let passStart=shotStart-(s.shotStart-s.passStart);
 let conflict=s.scheduleConflict||null;
 if(connected){
  if(s.directCarry){
   let possible=false;
   for(let shift=0;shift<=8;shift+=.25){
    const candidate={...s.finish,x:s.finish.x+(s.side===0?-shift:shift)};
    const at=end-Math.max(.12,dist(candidate,catchPoint)/24);
    if(at-s.active>.1&&dist(s.from,candidate)<=3.6*(at-s.active)+.001){
     finishPoint=candidate;shotStart=at;passStart=at;possible=true;break;
    }
   }
   if(!possible)conflict={kind:'clearance-to-save',reason:'Scorer cannot carry to save kick at 3.6 m/s',
    seed:String(f.visualSeed||''),clearanceArrival:s.clearance.arrival,officialSecond:end};
  }else{
   passStart=s.passStart+(shotStart-s.shotStart);
   if(passStart<=s.active+.2||
    dist(s.from,s.passFrom)>3.6*(passStart-s.active)+.01||
    dist(s.passFrom,finishPoint)>14*(shotStart-passStart)+.01)
    conflict={kind:'clearance-to-save',reason:'No time for controlled reception and capped final pass',
     seed:String(f.visualSeed||''),clearanceArrival:s.clearance.arrival,officialSecond:end};
  }
 }
 const active=connected?s.active:Math.max(0,Math.min(s.active,passStart-.1));
 if(!Number.isFinite(active)||active<0||active>(f.durationMinutes||90)*60)throw Error('Invalid save active '+JSON.stringify({active,connected,minute:event.minute,shotStart,passStart,goalActive:s.active,goalStart:s.start,goalShot:s.shotStart,goalPass:s.passStart,seed:f.visualSeed}));
 const opening=connected?s.opening:normal(active);
 const data={...s,active,opening,from:connected?{...s.from}:{...opening.ball},
  finish:finishPoint,passStart,shotStart,net:catchPoint,end,scheduleConflict:conflict,
  defending,keeper:keeperId,event,fixture:f,field,width:field.width,height:field.height};
 const release=end+.85;
 const targetX=clamp(catchPoint.x+(side===0?-1:1)*42,12,field.width-12);
 const target={x:targetX,y:clamp(field.height/2+((Director.hash(event.player+event.minute)%2)?8:-8),5,field.height-5),z:.23};
 const receiver=Array.from({length:10},(_,i)=>defending*11+i+1)
  .sort((a,b)=>dist(atEnd.actors[a],target)-dist(atEnd.actors[b],target)||a-b)[0];
 const arrival=release+Math.max(dist(catchPoint,target)/18,
  dist(atEnd.actors[receiver],target)/4-(release-end));
 let finish=arrival+12,landing;
 for(let i=0;i<5;i++){
  finish=Math.min(finish,(f.durationMinutes||90)*60);landing=normal(finish);
  const recovery=Math.max(dist(target,landing.ball)/12,...landing.actors.map((a,id)=>dist(id===receiver?target:id===keeperId?catchPoint:atEnd.actors[id],a)/4));
  if(finish-arrival>=recovery)break;finish=arrival+recovery+.2;
 }
 finish=Math.min(finish,(f.durationMinutes||90)*60);landing=normal(finish);
 stored={...data,release,arrival,recoveryEnd:finish,landing,target,receiver};cache.set(event,stored);return stored;
}
function buildupActors(s,seconds,normal){
 const actors=normal(seconds).actors.map(a=>({...a}));
 const u=clamp((seconds-s.start)/(s.shotStart-s.start),0,1);
 const fin={x:s.finish.x-(s.side===0?.55:-.55),y:s.finish.y-.3};
 Object.assign(actors[s.scorer],blend(s.openingRun.actors[s.scorer],fin,u));
 if(s.directCarry&&s.clearance){
  const foot=seconds<s.active?blend(s.openingRun.actors[s.scorer],
   {x:s.from.x-(s.side===0?.72:-.72),y:s.from.y-.32},
   (seconds-s.start)/Math.max(.001,s.active-s.start)):
   Goal.sample(s,Director.planFor(s.fixture,s.field),seconds).ball;
  if(seconds<s.shotStart)Object.assign(actors[s.scorer],seconds<s.active?foot:
   {x:foot.x-(s.side===0?.72:-.72),y:foot.y-.32});
 }
 if(seconds<s.active){
  const u=Math.max(0,Math.min(1,(seconds-s.start)/Math.max(.001,s.active-s.start)));
  if(s.support!==s.scorer)Object.assign(actors[s.support],blend(s.openingRun.actors[s.support],
   {x:s.from.x-(s.side===0?.72:-.72),y:s.from.y-.32},u));
 }
 if(seconds>=s.active){
  const carry=Goal.sample(s,Director.planFor(s.fixture,s.field),Math.min(seconds,s.passStart)).ball;
  if(s.support!==s.scorer)Object.assign(actors[s.support],{x:carry.x-(s.side===0?.72:-.72),y:carry.y-.32});
  Object.assign(actors[s.keeper],blend(s.opening.actors[s.keeper],s.net,(seconds-s.active)/(s.end-s.active)));
 }
 Onside.apply(actors,s.field,Goal.sample(s,Director.planFor(s.fixture,s.field),seconds).ball,s.side,{
  carrier:seconds<s.passStart?s.support:-1,runner:s.scorer,
  run:(seconds-s.passStart)/Math.max(.001,s.shotStart-s.passStart),
  strength:Math.max(0,Math.min(1,(seconds-s.start)/.2))
 });
 actors[s.keeper].z=0;
 return actors;
}
function restartActors(s,seconds,normal){
 const terminal=buildupActors(s,s.end,normal);
 if(!s.arrivalActors){
  const direction=s.defending===0?1:-1,elapsed=s.arrival-s.end;
  const opponents=terminal.map((a,id)=>({id,d:dist(a,s.target)}))
   .filter(a=>Math.floor(a.id/11)!==s.defending&&a.id%11!==0)
   .sort((a,b)=>a.d-b.d||a.id-b.id).slice(0,2).map(a=>a.id);
  s.arrivalActors=normal(Math.min(s.arrival,(s.fixture.durationMinutes||90)*60)).actors.map((a,id)=>{
   if(id===s.keeper)return {...a,x:s.net.x,y:s.net.y,z:0};
   let target={...a};
   if(Math.floor(id/11)===s.defending)target.x=clamp(terminal[id].x+direction*8,1,s.width-1);
   const rank=opponents.indexOf(id);
   if(rank>=0)target={...a,x:s.target.x+direction*2.5,y:s.target.y+(rank===0?-2:2)};
   if(id===s.receiver)target={...a,x:s.target.x-direction*.72,y:s.target.y-.32};
   const d=dist(terminal[id],target),u=Math.min(1,elapsed*4/Math.max(.001,d));
   return blend(terminal[id],target,u);
  });
 }
 return terminal.map((a,id)=>blend(a,s.arrivalActors[id],(seconds-s.end)/(s.arrival-s.end)));
}
function apply(f,field,seconds,frame,normal,limit=f.events.length,targetEvent=null){
 if(frame.officialEvent?.type==='goal'&&!targetEvent)return frame;
 for(let index=limit-1;index>=0;index--){
  const e=f.events[index];
  if(e.type!=='save'||Math.abs(seconds-e.minute*60)>65||(targetEvent&&e!==targetEvent))continue;
  const first=f.events.findIndex(p=>p.minute===e.minute&&p.type==='save');
  if(!targetEvent&&first<index)continue;
  const prior=sec=>apply(f,field,sec,normal(sec),normal,first);
  const s=sequence(f,field,e,prior);if(!s||seconds<s.start||seconds>=s.recoveryEnd)continue;
  let actors,ball,owner=-1,action,contact;
  if(seconds<s.end){
   // Keep actual clearance visual up to its receiving touch.
   const previous=seconds<s.active?prior(seconds):null;
   const sampled=previous?{ball:previous.ball,owner:previous.ownerIndex,phase:'ordinary'}:
    Goal.sample(s,Director.planFor(f,field),seconds);
   ball=sampled.ball;owner=sampled.owner;contact=sampled.phase;
   actors=buildupActors(s,seconds,prior);
   if(seconds>=s.shotStart){actors[s.scorer].frame=3;actors[s.keeper].frame=8;}
   action=seconds>=s.shotStart?'illustrative-save-shot':previous?.action||'illustrative-save-buildup';
  }else if(seconds<s.release){
   actors=restartActors(s,seconds,prior);
   ball={...s.net};owner=s.keeper;contact='keeper-hold';action='official-save';
   actors[s.keeper].frame=seconds<s.end+.25?8:seconds>s.end+.55?1:0;
  }else if(seconds<s.arrival){
   actors=restartActors(s,seconds,prior);
   const u=(seconds-s.release)/(s.arrival-s.release);ball=blend(s.net,s.target,u);ball.z+=Math.sin(Math.PI*u)*9;
   contact='keeper-punt';action='illustrative-keeper-punt';actors[s.keeper].frame=u<.15?3:0;
  }else{
   const u=(seconds-s.arrival)/(s.recoveryEnd-s.arrival);
   actors=restartActors(s,s.arrival,prior).map((a,id)=>blend(a,s.landing.actors[id],u));
   ball=blend(s.target,s.landing.ball,u);contact='keeper-punt-recovery';action='illustrative-keeper-recovery';
  }
  return {...frame,actors,ball,ownerIndex:owner,action,contact,sceneCut:null,
   officialEvent:seconds>=s.end&&seconds<s.release?e:null,
   onsideGuard:seconds<s.end?[{side:s.side,carrier:owner,runner:s.scorer,
    run:(seconds-s.passStart)/Math.max(.001,s.shotStart-s.passStart),
    strength:Math.max(0,Math.min(1,(seconds-s.start)/.2))}]:null,
   saveSequence:{start:s.start,active:s.active,shotStart:s.shotStart,end:s.end,release:s.release,arrival:s.arrival,finish:s.recoveryEnd,keeper:s.keeper,shooter:s.scorer},
   scheduleConflict:s.scheduleConflict||null,
   illustrative:seconds<s.end||seconds>=s.release,passStart:s.passStart,passArrival:s.shotStart};
 }
 return frame;
}
module.exports={sequence,apply};
