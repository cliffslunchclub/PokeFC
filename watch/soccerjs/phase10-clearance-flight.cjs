'use strict';
// Pure PSE-safe clearance trajectories and physically reachable landing plans.
// The horizontal kick has a defined launch velocity and continuous friction
// deceleration. Height describes the airborne arc, bounce, and ground roll.
const SPEED=4.0,GROUND=.23,MAX_RANGE=35,MIN_RANGE=25;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const ease=t=>{const u=clamp(t,0,1);return u*u*(3-2*u)};
function flight(stage,seconds){
 const T=stage.clearance?.plannedDuration||stage.duration,
  u=clamp((seconds-stage.start)/T,0,1);
 const p=2*u-u*u,dX=stage.to.x-stage.from.x,dY=stage.to.y-stage.from.y;
 const k=2*(1-u)/T,landing=.66,bounceEnd=.86;
 let z=GROUND,phase='rolling';
 if(u<landing){
  // A goalkeeper punt begins at hand height, while a defender's kick
  // begins at grass height. Both reach the same natural landing surface.
  const hand=Math.max(GROUND,Number(stage.from.z)||GROUND);
  z=GROUND+(hand-GROUND)*(1-u/landing)+3.2*Math.sin(Math.PI*u/landing);
  phase='airborne';
 }else if(u<bounceEnd){
  z=GROUND+.4*Math.sin(Math.PI*(u-landing)/(bounceEnd-landing));
  phase='bounce';
 }
 return {x:stage.from.x+dX*p,y:stage.from.y+dY*p,z,
  vx:dX*k,vy:dY*k,contact:phase};
}
function plan({field,from,owner,position,side,seed,offside}){
 const forward=side===0?1:-1,all=Array.from({length:22},(_,id)=>({
  id,p:position(id)}));
 const own=all.filter(a=>Math.floor(a.id/11)===side&&a.id!==owner&&a.id%11!==0);
 const opponents=all.filter(a=>Math.floor(a.id/11)!==side&&a.id%11!==0);
 let candidates=[];
 for(const player of own)for(const range of [25,27.5,30,32.5,35])for(const dyShift of [-2,0,2]){
  const y=clamp(player.p.y+dyShift,Math.max(4,from.y-11),Math.min(field.height-4,from.y+11));
  const dy=y-from.y,x=from.x+forward*Math.sqrt(Math.max(0,range*range-dy*dy));
  if(x<5||x>field.width-5||offside?.(side,from.x,player.p.x))continue;
  const target={x,y},travel=dist(from,target),run=dist(player.p,target);
  // Arc may remain airborne for 3–5s to allow a runner to reach the
  // selected landing zone. No waiting or teleport after the ball lands.
  const duration=Math.max(2.85,travel/17*1.8,run*1.5/SPEED+.15);
  if(duration>5.2)continue;
  const room=Math.min(...opponents.map(o=>dist(o.p,target)));
  const pressure=Math.min(...opponents.map(o=>dist(o.p,from)));
  const emergency=pressure<3&&travel>MAX_RANGE;
  const tie=(String(seed||'').charCodeAt(player.id%11)||0)*.00001;
  const score=run*.9+duration*.7+Math.abs(travel-29)*.14-
   Math.min(10,room)*1.4+Math.max(0,4-room)*2.5+tie;
  candidates.push({player,target,duration,score,room,emergency:false});
 }
 candidates.sort((a,b)=>a.score-b.score||a.player.id-b.player.id);
 const chosen=candidates[0];
 if(!chosen)return {conflict:{kind:'natural-clearance',reason:'No 25–35 m open-lane target reachable at 4 m/s',
  owner,from,seed:String(seed||'')}};
 // The earliest available contact determines possession. In open space the
 // intended runner normally wins; an opposing runner can contest and collect
 // only by reaching within the same bounded travel time.
 const target=chosen.target,duration=chosen.duration;
 const team=all.filter(a=>Math.floor(a.id/11)===side&&a.id!==owner&&a.id!==chosen.player.id&&a.id%11!==0);
 const supporters=team.sort((a,b)=>dist(a.p,target)-dist(b.p,target)||a.id-b.id).slice(0,3).map(x=>x.id);
 const contesters=opponents.sort((a,b)=>dist(a.p,target)-dist(b.p,target)||a.id-b.id).slice(0,3).map(x=>x.id);
 return {to:target,receiver:chosen.player.id,duration,
  landingFraction:.66,bounceEndFraction:.86,travelDistance:dist(from,target),
  flightSeconds:duration*.66,emergency:false,room:chosen.room,
  supporters,contesters,conflict:null};
}
function reaction({id,from,target,receiver,side,field,duration}){
 const me=Math.floor(id/11)===side;
 let to;
 if(id===receiver)to={x:target.x-(id<11?.72:-.72),y:target.y-.32};
 else {
  const k=me?1:-1,offset=(id%3-1)*2.0;
  to={x:target.x-k*3.8,y:target.y+offset+(me?1.6:-1.6)};
 }
 to.x=clamp(to.x,1,field.width-1);to.y=clamp(to.y,1,field.height-1);
 const dx=to.x-from.x,dy=to.y-from.y,dis=Math.hypot(dx,dy),
  // actorAt uses cubic easing with a 1.5x peak speed.
  reach=duration*SPEED/1.5;
 const amt=dis?Math.min(1,reach/dis):0;
 return {x:from.x+dx*amt,y:from.y+dy*amt};
}
module.exports={GROUND,SPEED,MIN_RANGE,MAX_RANGE,flight,plan,reaction,ease};
