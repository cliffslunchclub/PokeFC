'use strict';
// Join a real receiving touch to ordinary play with a carry or an explicit
// pass. Never drag an unowned ball toward an unrelated future frame.
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=u=>Math.max(0,Math.min(1,u));
const blend=(a,b,u)=>({...a,x:a.x+(b.x-a.x)*clamp(u),y:a.y+(b.y-a.y)*clamp(u),z:0});
function plan(from,actors,receiver,start,normal,maxDuration=40){
 for(let duration=2;duration<=maxDuration;duration+=.25){
  const end=start+duration,terminal=normal(end),owner=terminal.ownerIndex;
  if(!Number.isInteger(owner)||owner<0||terminal.ball.z>1||
   dist(terminal.ball,terminal.actors[owner])>1.5||terminal.officialEvent||terminal.kickoff||terminal.saveSequence)continue;
  if(actors.some((a,id)=>dist(a,terminal.actors[id])/duration>3.8))continue;
  if(owner===receiver){
   if(dist(from,terminal.ball)/duration>3.6)continue;
   return {from,actors,receiver,start,end,terminal,passStart:end};
  }
  // Solve release time from the moving carrier's actual foot position.
  const offset={x:from.x-actors[receiver].x,y:from.y-actors[receiver].y};
  const foot=t=>{const a=blend(actors[receiver],terminal.actors[receiver],(t-start)/duration);
   return {x:a.x+offset.x,y:a.y+offset.y,z:.23}};
  let lo=start+.2,hi=end;
  if(dist(foot(lo),terminal.ball)>14*(end-lo))continue;
  for(let i=0;i<40;i++){const mid=(lo+hi)/2;
   if(dist(foot(mid),terminal.ball)>14*(end-mid))hi=mid;else lo=mid;}
  const passStart=(lo+hi)/2;
  return {from,actors,receiver,start,end,terminal,passStart,passFrom:foot(passStart),offset};
 }
 return null;
}
function sample(s,t){
 const u=clamp((t-s.start)/(s.end-s.start));
 const actors=s.actors.map((a,id)=>blend(a,s.terminal.actors[id],u));
 let ball,ownerIndex=s.receiver,contact='controlled-recovery';
 if(!s.passFrom){
  ball={x:s.from.x+(s.terminal.ball.x-s.from.x)*u,
   y:s.from.y+(s.terminal.ball.y-s.from.y)*u,z:.23};
  // The body follows the ball throughout the carry and meets the exact
  // ordinary-play pose at the join, including its original foot offset.
  const a0=s.actors[s.receiver],a1=s.terminal.actors[s.receiver];
  actors[s.receiver]={...actors[s.receiver],x:ball.x+(a0.x-s.from.x)*(1-u)+(a1.x-s.terminal.ball.x)*u,
   y:ball.y+(a0.y-s.from.y)*(1-u)+(a1.y-s.terminal.ball.y)*u};
 }else if(t<s.passStart){
  const a=actors[s.receiver];ball={x:a.x+s.offset.x,y:a.y+s.offset.y,z:.23};
 }else{
  const v=clamp((t-s.passStart)/(s.end-s.passStart));
  ball={x:s.passFrom.x+(s.terminal.ball.x-s.passFrom.x)*v,
   y:s.passFrom.y+(s.terminal.ball.y-s.passFrom.y)*v,z:.23+Math.sin(Math.PI*v)*.65};
  ownerIndex=v>=1?s.terminal.ownerIndex:-1;contact='recovery-pass';
  if(t<s.passStart+.15)actors[s.receiver].frame=3;
 }
 return {actors,ball,ownerIndex,contact};
}
module.exports={plan,sample};
