'use strict';
// Distance-timed presentation of an already recorded PSE goal.
const Director=require('./phase10-play-director.cjs');
const Wall=require('./phase10-wall-physics.cjs');
const cache=new WeakMap();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const lerp=(a,b,u)=>a+(b-a)*clamp(u,0,1);
const CARRY_SPEED=3.6,PASS_SPEED=14,SHOT_SPEED=24,RUN_SPEED=4;
function forGoal(f,field,event,normalFrame){
 const key=field.width+':'+field.height;
 const previous=cache.get(event);if(previous?.key===key&&previous.fixture===f)return previous;
 const side=event.team===f.home.id?0:1,team=side===0?f.home:f.away;
 const scorerIndex=team.lineup.findIndex(p=>String(p.id)===String(event.player));
 if(scorerIndex<0)throw Error('Goal scorer absent');
 const scorer=side*11+scorerIndex;
 const end=event.minute*60,wing=Director.hash(event.player+':'+event.minute)%2?1:-1;
 let data;
 for(let lead=.2;lead<=35;lead+=.1){
  const active=Math.max(0,end-lead),opening=normalFrame(active),from=opening.ball;
  const progress=(side===0?from.x:field.width-from.x)/field.width;
  const finishProgress=Math.min(1-(Wall.RADIUS+.025)/field.width,Math.max(.83,progress+.025));
  const finish={x:side===0?field.width*finishProgress:field.width*(1-finishProgress),y:field.height*.5};
  const net={x:side===0?field.width+.9:-.9,y:field.height*.5+wing*2.15,z:.23};
  const carryDistance=Math.min(8,distance(from,finish)*.25);
  const ratio=distance(from,finish)?carryDistance/distance(from,finish):0;
  const passFrom={x:lerp(from.x,finish.x,ratio),y:lerp(from.y,finish.y,ratio),z:.23};
  const passDuration=Math.max(.12,distance(passFrom,finish)/PASS_SPEED);
  const shotDuration=Math.max(.12,distance(finish,net)/SHOT_SPEED);
  const required=carryDistance/CARRY_SPEED+passDuration+shotDuration;
  if(end-active+1e-7<required&&active>0)continue;
  data={active,opening,from,finish,net,passFrom,
   passStart:Math.max(active,end-shotDuration-passDuration),shotStart:Math.max(active,end-shotDuration)};
  break;
 }
 if(!data)throw Error('Cannot time goal sequence');
 let start=data.active;
 // Let the recorded scorer make a normal run while ordinary play continues.
 for(let i=0;i<12;i++){
  const opening=normalFrame(start),required=distance(opening.actors[scorer],data.finish)/RUN_SPEED;
  if(data.shotStart-start>=required-.01||start===0)break;
  start=Math.max(0,start-(required-(data.shotStart-start))-.1);
 }
 const opening=normalFrame(start);
 let support=data.opening.ownerIndex;
 if(!Number.isInteger(support)||support<0||Math.floor(support/11)!==side||support===scorer){
  support=Array.from({length:10},(_,i)=>side*11+i+1).filter(id=>id!==scorer)
   .sort((a,b)=>distance(data.opening.actors[a],data.from)-distance(data.opening.actors[b],data.from))[0];
 }
 const result={...data,key,fixture:f,start,end,openingRun:opening,side,scorer,support,wing};
 cache.set(event,result);return result;
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
