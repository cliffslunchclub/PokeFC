'use strict';
// A presentation restart: travel to centre, two-player kick, continuous handoff.
const Recovery=require('./phase10-connected-recovery.cjs');
const cache=new WeakMap(),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const mix=(a,b,u)=>a+(b-a)*clamp(u,0,1);
function blend(a,b,u){return {...a,x:mix(a.x,b.x,u),y:mix(a.y,b.y,u),z:mix(a.z||0,b.z||0,u)}}
function scenes(f,field,normal,official=normal){
 const old=cache.get(f);if(old?.width===field.width&&old.height===field.height)return old.items;
 const starts=[{start:0,side:0,initial:true},...([45,...(f.durationMinutes===120?[90,105]:[])]).map((m,i)=>({start:m*60,side:(i+1)%2}))];
 for(const g of f.events.filter(e=>e.type==='goal'))starts.push({start:(g.minute+.22)*60,side:g.team===f.home.id?1:0,goal:g});
 const items=[];cache.set(f,{width:field.width,height:field.height,items});
 starts.filter(s=>s.start<(f.durationMinutes||90)*60).sort((a,b)=>a.start-b.start).forEach(s=>{
  const opening=s.goal?official(s.start-.000001):normal(s.start),center={x:field.width/2,y:field.height/2,z:.23};
  if(s.goal)opening.ball={x:s.goal.team===f.home.id?field.width+.9:-.9,y:field.height/2+(require('./phase10-play-director.cjs').hash(s.goal.player+':'+s.goal.minute)%2?1:-1)*2.15,z:.23};
  const kicker=s.side*11+6,receiver=s.side*11+7,direction=s.side===0?1:-1;
  const setup=opening.actors.map((a,id)=>{
   const side=Math.floor(id/11),own=side===0?-1:1;
   let x=field.width/2+own*Math.max(10,Math.abs(a.x-field.width/2));
   let y=a.y;
   if(id===kicker){x=center.x-direction*.72;y=center.y-.32;}
   if(id===receiver){x=center.x-direction*4;y=center.y+2;}
   return {...a,x:clamp(x,1,field.width-1),y};
  });
  const transit=s.initial||s.goal?0:Math.max(dist(opening.ball,center)/12,...setup.map((a,i)=>dist(a,opening.actors[i])/4));
  const ready=s.start+transit+(s.goal?1e-5:0),kick=ready+.7,arrival=kick+.5;
  const receive={x:setup[receiver].x+direction*.72,y:setup[receiver].y+.32,z:.23};
  const received=setup.map(a=>({...a}));
  const total=(f.durationMinutes||90)*60;
  let join=Recovery.plan(receive,received,receiver,arrival,normal,Math.min(40,total-arrival));
  // A late goal can leave too little match time for a second passage of
  // play. Finish the visible restart where it is, never probe beyond FT.
  const terminalHold=!join;
  if(!join)join={from:receive,actors:received,receiver,start:arrival,end:Math.max(total,arrival+.001),
   terminal:{actors:received,ball:receive,ownerIndex:receiver},passStart:total};
  const end=terminalHold?total:join.end,landing=join.terminal;
  items.push({...s,opening,setup,center,kicker,receiver,transit,ready,kick,arrival,receive,end,landing,join,terminalHold});
 });
 cache.set(f,{width:field.width,height:field.height,items});return items;
}
function apply(f,field,seconds,frame,normal,official=normal){
 const s=scenes(f,field,normal,official).slice().reverse().find(s=>seconds>=s.start&&
  (seconds<s.end||s.terminalHold&&seconds===s.end));
 if(!s||frame.officialEvent||frame.goalSequenceStart!==undefined)return frame;
 const ready=s.ready;
 let actors,ball,owner=-1,contact;
 // A seek uses minutes and then converts back to seconds; tolerate the
 // resulting sub-microsecond roundoff at the exact ready boundary.
 if(s.transit>0&&seconds<ready-1e-6){
  const u=(seconds-s.start)/s.transit;
  actors=s.opening.actors.map((a,i)=>blend(a,s.setup[i],u));ball=blend(s.opening.ball,s.center,u);contact='kickoff-reposition';
 }else if(seconds<s.kick){actors=s.setup.map(a=>({...a}));ball=s.center;owner=s.kicker;contact='kickoff-setup';}
 else if(seconds<s.arrival){actors=s.setup.map(a=>({...a}));ball=blend(s.center,s.receive,(seconds-s.kick)/(s.arrival-s.kick));actors[s.kicker].frame=3;contact='kickoff-pass';}
 else{
  const joined=Recovery.sample(s.join,seconds);
  actors=joined.actors;ball=joined.ball;owner=joined.ownerIndex;
  contact='kickoff-recovery';
 }
 return {...frame,actors,ball,ownerIndex:owner,action:'illustrative-kickoff',contact,
  sceneCut:s.goal?'post-goal-kickoff':null,officialEvent:null,onsideGuard:null,
  kickoff:{start:s.start,ready:s.ready,kick:s.kick,arrival:s.arrival,end:s.end,kicker:s.kicker,receiver:s.receiver},
  passStart:s.kick,passArrival:s.arrival,passOrigin:s.center,passTarget:s.receive};
}
// Live presentation only: one real second to see the setup, then half a
// second of continuous acceleration into the selected Watch speed. Integrate
// the ramp so frame rate and speed changes cannot jump the match clock.
function advanceClock(seconds,elapsed,speed,items,state){
 if(state&&state.elapsed<1.5){
  const integral=t=>t<=1?0:t<1.5?(t-1)**2:t-1.25;
  const next=state.elapsed+elapsed;
  return {seconds:seconds+speed*(integral(next)-integral(state.elapsed)),
   state:{ready:state.ready,elapsed:next}};
 }
 const ready=items.map(s=>s.ready).find(t=>t>=seconds-1e-7&&
  t<=seconds+elapsed*speed+1e-7&&t!==state?.ready);
 if(ready===undefined)return {seconds:seconds+elapsed*speed,state};
 return advanceClock(ready,Math.max(0,elapsed-(ready-seconds)/speed),speed,items,{ready,elapsed:0});
}
module.exports={apply,scenes,advanceClock};
