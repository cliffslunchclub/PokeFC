'use strict';
// Immediate Watch-only attempts. PSE owns every official shot/save/goal.
// Build from the actual composed actor positions, including defensive press
// and goalkeeper rush. Never infer a chance from nominal formation slots.
const Director=require('./phase10-play-director.cjs');
const Recovery=require('./phase10-connected-recovery.cjs');
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
  // A separate illustrative block is a loose deflection, never a held save.
  // Keep long recoveries out of all official scenes and period kickoffs.
  const keeperFrom={...frame.actors[chance.keeper]},block={x:keeperFrom.x,y:keeperFrom.y,z:.23};
  const hit=sec+Math.max(.18,distance(from,block)/24);
  const loose={x:clamp(block.x+(chance.side===0?-3:3),1,field.width-1),
   y:clamp(block.y+(wing*1.5),1,field.height-1),z:.23};
  if(hit>=plan.duration)continue;
  const defending=1-chance.side,atHit=rawFrame(hit);
  // Intercept the moving spill on the first reachable foot touch. The
  // keeper needs only a short recovery from the block, never a staged hold.
  const atBlock=atHit.actors.map((p,id)=>id===chance.keeper?{...p,...block,z:0}:{...p});
  let intercept;
  for(let dt=.04;dt<=2&&!intercept;dt+=.01){
   const u=Math.min(1,dt/.3),point={x:mix(block.x,loose.x,u),y:mix(block.y,loose.y,u),z:.23};
   const options=atBlock.map((p,id)=>({id,p,d:distance(p,point)}))
    .filter(c=>Math.floor(c.id/11)===defending&&(c.id!==chance.keeper||dt>=.12-1e-8)&&c.d<=5*dt+.75)
    .sort((a,b)=>(a.id===chance.keeper)-(b.id===chance.keeper)||a.d-b.d||a.id-b.id);
   if(options.length)intercept={...options[0],point,dt};
  }
  if(!intercept)continue;
  const clearer=intercept.id,recoveryFrom=atBlock[clearer],clearAt=hit+intercept.dt,spilled=clearAt;
  if(clearAt>=plan.duration)continue;
  const clearFrom=intercept.point;
  const move=(a,b,seconds)=>{const u=Math.min(1,seconds*4/Math.max(.001,distance(a,b)));
   return {...a,x:mix(a.x,b.x,u),y:mix(a.y,b.y,u),z:0}};
  const pose=rawFrame(clearAt);
  const actorsAtClear=atBlock.map((p,id)=>move(p,pose.actors[id],intercept.dt));
  const reach=Math.min(1,5*intercept.dt/Math.max(.001,intercept.d));
  actorsAtClear[clearer]={...recoveryFrom,x:mix(recoveryFrom.x,clearFrom.x,reach),y:mix(recoveryFrom.y,clearFrom.y,reach),z:0};
  const desired={x:clamp(clearFrom.x+(defending===0?52:-52),8,field.width-8),y:field.height*.5};
  const receivers=actorsAtClear.map((p,id)=>({id,p,d:distance(p,desired)}))
   .filter(c=>c.id%11!==0&&c.id!==clearer&&distance(c.p,clearFrom)>=32&&
    (c.p.x-clearFrom.x)*(defending===0?1:-1)>32)
   .sort((a,b)=>a.d-b.d||a.id-b.id);
  const receiver=receivers[0]?.id;
  if(receiver===undefined)continue;
  const receiveActor=actorsAtClear[receiver];
  const clearTo={x:receiveActor.x+(receiver<11?.72:-.72),y:receiveActor.y+.32,z:.23};
  const clearArrival=clearAt+distance(clearFrom,clearTo)/26;
  if(clearArrival>=plan.duration)continue;
  const normalArrival=rawFrame(clearArrival),direction=defending===0?1:-1;
  const arrivalActors=actorsAtClear.map((p,id)=>{
   if(id===receiver)return {...p};
   const target=Math.floor(id/11)===defending&&id%11!==0?
    {...normalArrival.actors[id],x:clamp(p.x+direction*10,1,field.width-1)}:normalArrival.actors[id];
   return move(p,target,clearArrival-clearAt);
  });
  const join=Recovery.plan(clearTo,arrivalActors,receiver,clearArrival,rawFrame,Math.min(30,plan.duration-clearArrival));
  const finish=join?.end??Infinity;
  const hazards=f.events.filter(e=>e.type==='goal'||e.type==='save').map(e=>{
   const at=rawFrame(e.minute*60);return {start:at.saveSequence?.start??at.goalSequenceStart??e.minute*60-40,end:e.minute*60+65};
  });
  const period=[0,2700,5400,6300].some(t=>t>sec&&t<finish);
  if(join&&finish<plan.duration&&!period&&!hazards.some(h=>sec<h.end&&finish>h.start)){
   shots.push({...chance,start:sec,impactSeconds:hit,end:finish,from,impact:block,
    spilled,loose:clearFrom,clearAt,clearTo,clearArrival,clearer,keeperFrom,clearerFrom:{...recoveryFrom},
    actorsAtHit:atBlock,actorsAtClear,arrivalActors,receiver,join,to:{...join.terminal.ball},terminal:join.terminal,outcome:'block'});
   available=finish+.1;continue;
  }
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
 if(shot.outcome==='block')return blockFrame(shot,seconds,frame);
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
function blockFrame(s,t,frame){
 let actors=(t>=s.impactSeconds-1e-8?s.actorsAtHit:frame.actors).map(p=>({...p}));
 const lerpPoint=(a,b,u,arc=0)=>{u=clamp(u,0,1);return {x:mix(a.x,b.x,u),y:mix(a.y,b.y,u),z:mix(a.z??.23,b.z??.23,u)+Math.sin(Math.PI*u)*arc}};
 let ball,action,contact;
 if(t<s.impactSeconds-1e-8){
  ball=lerpPoint(s.from,s.impact,(t-s.start)/(s.impactSeconds-s.start),.35);
  action='illustrative-one-on-one-shot';contact='one-on-one-shot';
  if(t-s.start<.3)actors[s.shooter].frame=3;
 }else if(t<s.spilled){
  ball=lerpPoint(s.impact,s.loose,(t-s.impactSeconds)/(s.spilled-s.impactSeconds),.4);
  action='illustrative-keeper-block';contact='loose-deflection';
 }else if(t<s.clearAt-1e-8){
  ball={...s.loose};action='illustrative-block-recovery';contact='loose-ball';
 }else if(t<s.clearArrival-1e-8){
  ball=lerpPoint(s.loose,s.clearTo,(t-s.clearAt)/(s.clearArrival-s.clearAt),5);
  action='illustrative-upfield-clearance';contact='foot-clearance';
 }else{
  ball=Recovery.sample(s.join,t).ball;
  action='illustrative-clearance-recovery';contact='clearance-recovery';
 }
 let ownerIndex=-1;
 if(t<s.impactSeconds){
  Object.assign(actors[s.keeper],lerpPoint(s.keeperFrom,s.impact,(t-s.start)/(s.impactSeconds-s.start)),{z:0});
 }else if(t<s.clearAt-1e-8){
  const u=(t-s.impactSeconds)/(s.clearAt-s.impactSeconds);
  actors=s.actorsAtHit.map((p,id)=>({...p,...lerpPoint(p,s.actorsAtClear[id],u),z:0}));
  actors[s.keeper].frame=8;
 }else if(t<s.clearArrival-1e-8){
  const u=(t-s.clearAt)/(s.clearArrival-s.clearAt);
  actors=s.actorsAtClear.map((p,id)=>({...p,...lerpPoint(p,s.arrivalActors[id],u),z:0}));
  if(t<s.clearAt+.15)actors[s.clearer].frame=3;
 }else{
  const joined=Recovery.sample(s.join,t);actors=joined.actors;ball=joined.ball;
  ownerIndex=joined.ownerIndex;contact=joined.contact;
  // A small first-touch bounce, controlled by the actual receiver.
  const bounce=(t-s.clearArrival)/.2;if(bounce<1)ball.z+=Math.sin(Math.PI*bounce)*.25;
 }
 return {...frame,actors,ball,ownerIndex,action,contact,label:'',officialEvent:null,illustrative:true,onsideGuard:null,
  oneOnOne:{shooter:s.shooter,keeper:s.keeper,start:s.start,impactSeconds:s.impactSeconds,end:s.end,outcome:s.outcome,clearer:s.clearer,clearAt:s.clearAt,clearArrival:s.clearArrival,receiver:s.receiver,recoveryPassStart:s.join.passStart},
  passStart:null,passArrival:null,passOrigin:null,passTarget:null,wall:null,wallImpactSeconds:null};
}
module.exports={opportunity,build,apply,STEP,SHOOTING_RANGE,BOX_DEPTH,BOX_HALF_WIDTH};
