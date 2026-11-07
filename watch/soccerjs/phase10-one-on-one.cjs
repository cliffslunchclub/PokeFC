'use strict';
// Immediate Watch-only attempts. PSE owns every official shot/save/goal.
// Build from the actual composed actor positions, including defensive press
// and goalkeeper rush. Never infer a chance from nominal formation slots.
const Director=require('./phase10-play-director.cjs');
const STEP=.1,SHOOTING_RANGE=25,BOX_DEPTH=25,BOX_HALF_WIDTH=25;
const cache=new WeakMap();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=v=>{v=clamp(v,0,1);return v*v*(3-2*v)};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const mix=(a,b,u)=>a+(b-a)*u;
function opportunity(frame,field){
 const owner=frame.ownerIndex;
 if(!Number.isInteger(owner)||owner<0||owner%11===0||frame.ball.z>1.1)return null;
 const side=Math.floor(owner/11),goalX=side===0?field.width:0;
 const ball=frame.ball,depth=Math.abs(goalX-ball.x),forward=side===0?1:-1;
 if(distance(frame.actors[owner],ball)>1.8)return null;
 if(depth<=0||Math.hypot(depth,ball.y-field.height*.5)>SHOOTING_RANGE)return null;
 const keeperId=(1-side)*11,keeper=frame.actors[keeperId];
 if((keeper.x-ball.x)*forward<-.5)return null;
 // A defender in the shooting lane, or already challenging the carrier,
 // means this is not a clean one-on-one.
 for(let id=(1-side)*11+1;id<(1-side)*11+11;id++){
  const p=frame.actors[id],along=(p.x-ball.x)*forward;
  if(distance(p,ball)<1.3)return null;
  if(along<-.2||along>depth)continue;
  const vx=goalX-ball.x,vy=field.height*.5-ball.y;
  const u=((p.x-ball.x)*vx+(p.y-ball.y)*vy)/(vx*vx+vy*vy);
  if(u>=0&&u<=1&&distance(p,{x:ball.x+vx*u,y:ball.y+vy*u})<1.8)return null;
 }
 return {shooter:owner,keeper:keeperId,side};
}
function build(f,field,rawFrame){
 const previous=cache.get(f);
 if(previous&&previous.width===field.width&&previous.height===field.height)return previous.shots;
 const plan=Director.planFor(f,field),shots=[];
 const goals=f.events.filter(e=>e.type==='goal').map(g=>{
  const frame=rawFrame(Math.max(0,g.minute*60-.0001));
  return {start:frame.goalSequenceStart??Math.max(0,g.minute-.7)*60,
   shot:frame.goalShotStart??g.minute*60-.8,end:(g.minute+.22)*60};
 });
 let available=0;
 for(let tick=0;tick*STEP<plan.duration;tick++){
  const sec=tick*STEP;
  if(sec<available-1e-8)continue;
  const goal=goals.find(g=>sec>=g.start&&sec<=g.end);
  // Preserve the scheduled PSE scoring kick and post-goal hold exactly.
  if(goal&&sec>=goal.shot)continue;
  const stage=Director.stageAt(plan,sec);
  if(!goal){
   if(stage.mode!=='carry')continue;
   const ball=Director.ballAt(stage,sec),side=Math.floor(stage.owner/11);
   if((side===0?field.width-ball.x:ball.x)>BOX_DEPTH||
    Math.abs(ball.y-field.height*.5)>BOX_HALF_WIDTH)continue;
  }
  const frame=rawFrame(sec);
  if(frame.officialEvent||frame.sceneCut||frame.kickoff||frame.saveSequence||frame.action.startsWith('official-'))continue;
  const chance=opportunity(frame,field);if(!chance)continue;
  // Additional attempts miss wide of the rendered goal mouth. They never
  // touch the goalkeeper and cannot look like extra official PSE saves.
  const from={...frame.ball};
  const wing=from.y>=field.height*.5?1:-1;
  const impact={x:chance.side===0?field.width-.4:.4,
   y:field.height*(wing>0?.66:.34),z:.23};
  const flight=Math.max(.18,distance(from,impact)*1.5/24);
  const nextGoal=goals.find(g=>g.shot>sec);
  const end=Math.min(sec+5,nextGoal?.shot??plan.duration,plan.duration);
  if(end-sec<flight+.65)continue;
  const impactSeconds=sec+flight;
  const landing=rawFrame(end);
  if(landing.kickoff||landing.saveSequence||landing.goalSequenceStart!==undefined)continue;
  if(landing.ball.x<.34||landing.ball.x>field.width-.34||
   landing.ball.y<.34||landing.ball.y>field.height-.34||
   distance(impact,landing.ball)*1.5/(end-impactSeconds)>24)continue;
  shots.push({...chance,start:sec,impactSeconds,end,from,impact,to:{...landing.ball},
   outcome:'miss'});
  // Do not chain another shot before the missed ball has been recovered.
  available=end+.1;
 }
 cache.set(f,{width:field.width,height:field.height,shots});return shots;
}
function apply(f,field,seconds,frame,rawFrame){
 if(frame.officialEvent||frame.sceneCut||frame.kickoff||frame.saveSequence||frame.action.startsWith('official-')||
  frame.action==='illustrative-shot')return frame;
 const shots=build(f,field,rawFrame);
 let lo=0,hi=shots.length;
 while(lo<hi){const mid=(lo+hi)>>1;if(shots[mid].start<=seconds+1e-8)lo=mid+1;else hi=mid;}
 const shot=shots[lo-1];if(!shot||seconds>=shot.end-1e-8)return frame;
 const flight=seconds<shot.impactSeconds-1e-8;
 const u=flight?(seconds-shot.start)/(shot.impactSeconds-shot.start):
  (seconds-shot.impactSeconds)/(shot.end-shot.impactSeconds);
 const start=flight?shot.from:shot.impact,end=flight?shot.impact:shot.to,v=ease(u);
 const ball={x:mix(start.x,end.x,v),y:mix(start.y,end.y,v),
  z:mix(start.z??.23,end.z??.23,v)+Math.sin(Math.PI*v)*(flight?.35:.55)};
 const actors=frame.actors.map(p=>({...p}));
 if(seconds-shot.start<.3)actors[shot.shooter].frame=3;

 return {...frame,actors,ball,ownerIndex:-1,
  action:flight?'illustrative-one-on-one-shot':'illustrative-one-on-one-miss',
  contact:flight?'one-on-one-shot':'wide-miss',
  label:'',officialEvent:null,illustrative:true,
  oneOnOne:{shooter:shot.shooter,keeper:shot.keeper,start:shot.start,
   impactSeconds:shot.impactSeconds,end:shot.end,outcome:shot.outcome},
  passStart:null,passArrival:null,passOrigin:null,passTarget:null,
  wall:null,wallImpactSeconds:null};
}
module.exports={opportunity,build,apply,STEP,SHOOTING_RANGE,BOX_DEPTH,BOX_HALF_WIDTH};
