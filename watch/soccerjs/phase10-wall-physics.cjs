'use strict';
/**
 * Soccer-JS Watch only: low ball banks from a rink-style enclosure.
 *
 * All four perimeter boards reflect the visual ball. Both goal-mouth
 * openings remain unobstructed; ONLY official PSE goal scenes may ever
 * cross a goal line through those openings. No events or stats are made.
 */
const RADIUS=.34;
const GOAL_HALF_WIDTH=3.66;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=u=>{u=clamp(u,0,1);return u*u*(3-2*u)};
function candidate(from,to,field,axis,edge){
 if(!from||!to||!field||!['x','y'].includes(axis)||!['min','max'].includes(edge))return null;
 const near=RADIUS,far=field[axis==='x'?'width':'height']-RADIUS;
 const position=edge==='min'?near:far;
 const normalFrom=Math.abs(position-from[axis]);
 const normalTo=Math.abs(position-to[axis]);
 if(normalFrom<.15||normalTo<.15)return null;
 const ratio=normalFrom/(normalFrom+normalTo);
 const lateral=axis==='x'?'y':'x';
 const impact={x:0,y:0};
 impact[axis]=position;
 impact[lateral]=lerp(from[lateral],to[lateral],ratio);
 if(axis==='x'){
  // The goal is an OPENING in the end board. Never bounce across it.
  if(Math.abs(impact.y-field.height/2)<=GOAL_HALF_WIDTH+RADIUS+.65)return null;
  if(impact.y<RADIUS+.8||impact.y>field.height-RADIUS-.8)return null;
 }else if(impact.x<RADIUS+.8||impact.x>field.width-RADIUS-.8)return null;
 const inLength=Math.hypot(impact.x-from.x,impact.y-from.y);
 const outLength=Math.hypot(to.x-impact.x,to.y-impact.y);
 const total=inLength+outLength;
 // A plausible low pass / controlled rebound, not a stadium-spanning
 // instant teleport. The Play Director may reject longer paths.
 if(inLength<.65||outLength<.65||!Number.isFinite(total))return null;
 // Boards reduce velocity after contact. This only changes the animation
 // timing; PSE and subsequent possession staging stay untouched.
 const restitution=.82;
 const timeAt=inLength/(inLength+outLength/restitution);
 return {axis,edge,hit:impact,ratio:timeAt,pathLength:total,
  restitution,goalOpeningPreserved:axis==='x'};
}
function bankAt(stage,seconds){
 const wall=stage.wall;
 if(!wall)return null;
 const duration=Math.max(.001,stage.duration||stage.end-stage.start);
 const u=ease((seconds-stage.start)/duration);
 const impactFraction=wall.ratio;
 const incoming=u<=impactFraction;
 const part=incoming?u/impactFraction:(u-impactFraction)/(1-impactFraction);
 const from=incoming?stage.from:wall.hit;
 const to=incoming?wall.hit:stage.to;
 return {x:lerp(from.x,to.x,clamp(part,0,1)),
  y:lerp(from.y,to.y,clamp(part,0,1)),
  z:.23+.10*Math.sin(Math.PI*u),contact:incoming?'approaching-wall':'rebounding',
  wallAxis:wall.axis,wallEdge:wall.edge,
  hit:wall.hit,impactSeconds:stage.start+duration*(
   Math.acos(1-2*impactFraction)/Math.PI // diagnostic only; ease inverse approximated below
  )};
}
function sampleWall(stage,seconds){
 if(!stage.wall)return null;
 return bankAt(stage,seconds);
}
function boundary(ball,field){
 return ball.x>=RADIUS-1e-6&&ball.x<=field.width-RADIUS+1e-6&&
  ball.y>=RADIUS-1e-6&&ball.y<=field.height-RADIUS+1e-6;
}
module.exports={candidate,sampleWall,boundary,RADIUS,GOAL_HALF_WIDTH};
