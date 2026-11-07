'use strict';
// Official saves are immutable PSE events; all movement between them is visual.
const Goal=require('./phase10-goal-sequence.cjs'),Director=require('./phase10-play-director.cjs');
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
 const shotDuration=Math.max(.12,dist(s.finish,catchPoint)/24);
 // Leave the receiving touch immediately before the scheduled shooting kick.
 const shotStart=end-shotDuration,passStart=shotStart-(s.shotStart-s.passStart);
 const active=Math.min(s.active,passStart-.1),opening=normal(active);
 const data={...s,active,opening,from:{...opening.ball},passStart,shotStart,net:catchPoint,end,
  defending,keeper:keeperId,event,fixture:f,width:field.width,height:field.height};
 const release=end+.85;
 const targetX=clamp(catchPoint.x+(side===0?-1:1)*42,12,field.width-12);
 const receiver=defending*11+6;
 const target={x:targetX,y:clamp(field.height/2+((Director.hash(event.player+event.minute)%2)?8:-8),5,field.height-5),z:.23};
 const arrival=release+dist(catchPoint,target)/18;
 let finish=arrival+12,landing;
 for(let i=0;i<5;i++){
  finish=Math.min(finish,(f.durationMinutes||90)*60);landing=normal(finish);
  const recovery=Math.max(dist(target,landing.ball)/12,...landing.actors.map((a,id)=>dist(id===receiver?target:id===keeperId?catchPoint:atEnd.actors[id],a)/4));
  if(finish-arrival>=recovery)break;finish=arrival+recovery+.2;
 }
 stored={...data,release,arrival,recoveryEnd:finish,landing,target,receiver};cache.set(event,stored);return stored;
}
function buildupActors(s,seconds,normal){
 const actors=normal(seconds).actors.map(a=>({...a}));
 const u=clamp((seconds-s.start)/(s.shotStart-s.start),0,1);
 const fin={x:s.finish.x-(s.side===0?.55:-.55),y:s.finish.y-.3};
 Object.assign(actors[s.scorer],blend(s.openingRun.actors[s.scorer],fin,u));
 if(seconds>=s.active){
  const supportTarget={x:s.passFrom.x-(s.side===0?.6:-.6),y:s.passFrom.y-.3};
  Object.assign(actors[s.support],blend(s.opening.actors[s.support],supportTarget,(seconds-s.active)/Math.max(.01,s.passStart-s.active)));
  Object.assign(actors[s.keeper],blend(s.opening.actors[s.keeper],s.net,(seconds-s.active)/(s.end-s.active)));
 }
 actors[s.keeper].z=0;
 return actors;
}
function restartActors(s,seconds,normal){
 const terminal=buildupActors(s,s.end,normal),landing=normal(s.arrival).actors;
 return terminal.map((a,id)=>{
  if(id===s.keeper)return {...a,x:s.net.x,y:s.net.y,z:0};
  const target=id===s.receiver?{...landing[id],x:s.target.x-(s.defending===0?.72:-.72),y:s.target.y-.32}:landing[id];
  return blend(a,target,(seconds-s.end)/(s.arrival-s.end));
 });
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
   const sampled=seconds<s.active?{ball:prior(seconds).ball,owner:prior(seconds).ownerIndex,phase:'ordinary'}:
    Goal.sample(s,Director.planFor(f,field),seconds);
   ball=sampled.ball;owner=sampled.owner;contact=sampled.phase;
   actors=buildupActors(s,seconds,prior);
   if(seconds>=s.shotStart){actors[s.scorer].frame=3;actors[s.keeper].frame=8;}
   action=seconds>=s.shotStart?'illustrative-save-shot':'illustrative-save-buildup';
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
   saveSequence:{start:s.start,active:s.active,shotStart:s.shotStart,end:s.end,release:s.release,arrival:s.arrival,finish:s.recoveryEnd,keeper:s.keeper,shooter:s.scorer},
   illustrative:seconds<s.end||seconds>=s.release,passStart:s.passStart,passArrival:s.shotStart};
 }
 return frame;
}
module.exports={sequence,apply};
