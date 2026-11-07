'use strict';
/**
 * Watch-only goalkeeper positioning. Goalkeepers rush when an opponent
 * enters the penalty area and can claim ONLY already scripted keeper
 * rebounds. All paths are integrated once with a physical 5 m/s speed cap.
 * Nothing here generates a PSE save, goal, interception or match event.
 */
const Director=require('./phase10-play-director.cjs');
const SPEED_LIMIT=5,RETURN_SPEED=4,TRIGGER_DISTANCE=16.5,BOX_HALF_WIDTH=20.16;
const STEP=.25;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ease=x=>{const u=clamp(x,0,1);return u*u*(3-2*u)};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const memo=new WeakMap();
const goalMemo=new WeakMap();
const center=(side,field)=>({
 x:side===0?field.width*.045:field.width*.955,y:field.height*.5
});
function danger(ball,side,field){
 return Math.hypot(ball.x-(side===0?0:field.width),
  ball.y-field.height*.5);
}
function target(side,field,stage,ball){
 const home=center(side,field),opponent=Math.floor(stage.owner/11)!==side;
 const depth=side===0?ball.x:field.width-ball.x;
 const picker=stage.mode==='rebound'&&stage.receiver===side*11;
 if(picker){
  const pickup={x:stage.to.x,y:stage.to.y};
  // Only near-goal, legitimately reachable loose balls are scripted for GK.
  if(distance(home,pickup)<=SPEED_LIMIT*stage.duration-.35)
   return {x:pickup.x,y:pickup.y,urgent:true,collecting:true};
 }
 if(!opponent||depth<0||depth>=TRIGGER_DISTANCE||
  Math.abs(ball.y-field.height*.5)>BOX_HALF_WIDTH||ball.z>1.5)
  return {...home,urgent:false,collecting:false};
 const urgency=ease((TRIGGER_DISTANCE-depth)/2);
 const towardGoal=side===0?-1:1;
 const x=clamp(ball.x+towardGoal*1.15,
  side===0?1.1:field.width-TRIGGER_DISTANCE,side===0?TRIGGER_DISTANCE:field.width-1.1);
 const y=clamp(ball.y,field.height*.5-BOX_HALF_WIDTH,field.height*.5+BOX_HALF_WIDTH);
 return {x:home.x+(x-home.x)*urgency,y:home.y+(y-home.y)*urgency,
  urgent:true,collecting:false};
}
function build(f,field){
 const plan=Director.planFor(f,field);
 const previous=memo.get(plan);
 if(previous)return previous;
 const n=Math.ceil(plan.duration/STEP),coords=[
  new Float64Array((n+1)*2),new Float64Array((n+1)*2)
 ];
 const active=[center(0,field),center(1,field)];
 for(let i=0;i<=n;i++){
  const sec=Math.min(plan.duration,i*STEP);
  const stage=Director.stageAt(plan,sec);
  const ball=Director.ballAt(stage,sec);
  for(let side=0;side<2;side++){
   const requested=target(side,field,stage,ball);
   const actor=active[side];
   const dx=requested.x-actor.x,dy=requested.y-actor.y;
   const gap=Math.hypot(dx,dy);
   const cap=(requested.urgent?SPEED_LIMIT:RETURN_SPEED)*STEP;
   if(i&&gap>0){
    const u=Math.min(1,cap/gap);
    actor.x+=dx*u;actor.y+=dy*u;
   }
   coords[side][i*2]=actor.x;
   coords[side][i*2+1]=actor.y;
  }
 }
 const result={coords,duration:plan.duration,n,field};
 memo.set(plan,result);return result;
}
function at(f,field,seconds){
 const path=build(f,field),u=clamp(seconds/STEP,0,path.n);
 const i=Math.min(Math.floor(u),path.n-1),fraction=u-i;
 const answer=[];
 for(let side=0;side<2;side++){
  const a=path.coords[side],index=i*2;
  answer.push({
   x:a[index]+(a[index+2]-a[index])*fraction,
   y:a[index+1]+(a[index+3]-a[index+1])*fraction
  });
 }
 return answer;
}
// Official goal buildups have a different ball path from ordinary play.
// Follow THAT ball from the existing entry position, rather than silently
// sending the keeper back to the line during every scoring one-on-one.
function sceneAt(field,event,seconds,{start,end,shot,side,opening,ballAt,diveY}){
 if(end<=start)return {x:opening.x,y:opening.y};
 const key=[field.width,field.height,start,end,shot,side,opening.x,opening.y].join(':');
 let cached=goalMemo.get(event);
 if(!cached||cached.key!==key){
  const n=Math.ceil((end-start)/STEP),coords=new Float64Array((n+1)*2);
  const actor={x:opening.x,y:opening.y};
  let shotPosition=null;
  for(let i=0;i<=n;i++){
   const sec=Math.min(end,start+i*STEP),dt=i?sec-(start+(i-1)*STEP):0;
   if(sec>=shot&&!shotPosition)shotPosition={...actor};
   const requested=sec<shot?target(side,field,{mode:'carry',owner:(1-side)*11+6},ballAt(sec)):
    {x:shotPosition.x,y:shotPosition.y+(diveY-shotPosition.y)*ease((sec-shot)/(end-shot)),urgent:true};
   const dx=requested.x-actor.x,dy=requested.y-actor.y,gap=Math.hypot(dx,dy);
   if(gap>0){const u=Math.min(1,(requested.urgent?SPEED_LIMIT:RETURN_SPEED)*dt/gap);
    actor.x+=dx*u;actor.y+=dy*u;}
   coords[i*2]=actor.x;coords[i*2+1]=actor.y;
  }
  cached={key,n,coords};goalMemo.set(event,cached);
 }
 const u=clamp((seconds-start)/STEP,0,cached.n);
 const i=Math.min(Math.floor(u),cached.n-1);
 // The final integration interval can be shorter than STEP.
 const t0=start+i*STEP,t1=Math.min(end,t0+STEP);
 const blend=clamp((seconds-t0)/Math.max(.00001,t1-t0),0,1),a=cached.coords;
 return {x:a[i*2]+(a[i*2+2]-a[i*2])*blend,
  y:a[i*2+1]+(a[i*2+3]-a[i*2+1])*blend};
}
module.exports={at,build,target,center,danger,SPEED_LIMIT,RETURN_SPEED,
 TRIGGER_DISTANCE,BOX_HALF_WIDTH,STEP,sceneAt};
