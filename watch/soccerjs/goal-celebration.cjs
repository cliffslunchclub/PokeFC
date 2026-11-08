'use strict';
// A reusable presentation scene. No fixture, ball, score or PSE event mutation.
const DURATION=3,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ease=x=>{const u=clamp(x,0,1);return u*u*(3-2*u)};
function create(fixture,event,frame,reducedMotion=false){
 const side=event.team===fixture.home.id?0:1,team=side===0?fixture.home:fixture.away;
 const index=team.lineup.findIndex(p=>String(p.id)===String(event.player));
 if(index<0)throw Error('Celebration scorer missing from XI');
 const scorer=side*11+index,origin=frame.actors[scorer];
 const teammates=frame.actors.map((p,id)=>({id,d:Math.hypot(p.x-origin.x,p.y-origin.y)}))
  .filter(p=>Math.floor(p.id/11)===side&&p.id!==scorer&&p.id%11!==0&&p.d<20)
  .sort((a,b)=>a.d-b.d||a.id-b.id).slice(0,3).map(p=>p.id);
 return {event,frame,side,scorer,teammates,reducedMotion};
}
function sample(scene,elapsed,field){
 const t=clamp(elapsed,0,DURATION),u=t/DURATION,focus=scene.frame.actors[scene.scorer];
 const actors=scene.frame.actors.map((p,id)=>{
  if(scene.reducedMotion)return {...p};
  if(id===scene.scorer){
   // Three positive hops; both scene boundaries land exactly on the ground.
   return {...p,z:.65*Math.abs(Math.sin(Math.PI*t)),frame:1};
  }
  const rank=scene.teammates.indexOf(id);if(rank<0)return {...p};
  const target={x:clamp(focus.x+(scene.side===0?-2:2),.9,field.width-.9),
   y:clamp(focus.y+(rank-1)*2.2,.9,field.height-.9)};
  const d=Math.hypot(target.x-p.x,target.y-p.y),v=Math.min(1,t*3/Math.max(.001,d));
  return {...p,x:p.x+(target.x-p.x)*v,y:p.y+(target.y-p.y)*v,z:0,frame:v<1?Math.floor(t*7)%2:0};
 });
 // Cheap 2.5D drone approximation: a 40-degree elliptical sweep rather than
 // rotating billboard sprites or rebuilding the native projection system.
 const angle=(-20+40*ease(u))*Math.PI/180;
 const sweep=scene.reducedMotion?0:Math.sin(Math.PI*u);
 return {frame:{...scene.frame,actors,onsideGuard:null,action:'goal-celebration'},
  focus:{x:focus.x+Math.sin(angle)*2.5*sweep,y:focus.y+Math.cos(angle)*1.2*sweep},
  zoom:scene.reducedMotion?1:1+.35*ease(t/.8),progress:u};
}
module.exports={DURATION,create,sample};
