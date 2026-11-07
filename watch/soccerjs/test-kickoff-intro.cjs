'use strict';
const assert=require('node:assert/strict');
const K=require('./phase10-kickoff.cjs'),Onside=require('./phase10-onside-movement.cjs');
const {presentationFrame}=require('./phase10-motion.cjs');
const fixture=require('./fixture.json'),field={width:106,height:68};
const before=JSON.stringify(fixture),items=[{ready:0},{ready:2700},{ready:5400}];
for(const speed of [1,4,16])for(const dt of [1/30,1/60,1/144]){
 let seconds=0,state=null,real=0;
 for(let i=0;i<Math.round(5/dt);i++){
  ({seconds,state}=K.advanceClock(seconds,dt,speed,items,state));real+=dt;
  const expected=speed*(real<=2?0:real<4?(real-2)**2/4:real-3);
  assert(Math.abs(seconds-expected)<1e-6,'Frame-rate-independent hold and ramp');
 }
 assert(Math.abs(seconds-2*speed)<1e-6);
}
// Land exactly on setup even when a high-speed frame crosses its start.
let next=K.advanceClock(2699.9,.05,16,items,null);
assert.equal(next.seconds,2700);assert(next.state.elapsed>0&&next.state.elapsed<.05);
// Paused time adds no progress; speed changes retain the elapsed hold/ramp.
next=K.advanceClock(0,1,16,items,null);
next=K.advanceClock(next.seconds,0,1,items,next.state);
assert.equal(next.state.elapsed,1);assert.equal(next.seconds,0);
next=K.advanceClock(next.seconds,2,4,items,next.state);
assert.equal(next.state.elapsed,3);assert.equal(next.seconds,1);
// An explicit seek into ordinary play never adds another opening delay.
assert.equal(K.advanceClock(10,.1,16,items,null).seconds,11.6);
const extended={...fixture,durationMinutes:120};
for(const start of [0,2700,5400,6300]){
 const s=presentationFrame(extended,start,field).kickoff;
 const frame=presentationFrame(extended,s.ready,field),guarded=Onside.guard(frame,field);
 assert.equal(frame.contact,'kickoff-setup');
 assert.deepEqual(guarded.actors,frame.actors,'Open-play rules cannot move kickoff players');
 const side=Math.floor(s.kicker/11),center={x:53,y:34};
 const circle=frame.actors.map((a,i)=>({a,i})).filter(({a})=>Math.hypot(a.x-center.x,a.y-center.y)<9.15);
 assert.deepEqual(circle.map(p=>p.i).sort((a,b)=>a-b),[s.kicker,s.receiver]);
 assert(circle.every(({a})=>a.side===side));
 for(const a of frame.actors)assert(a.side===0?a.x<=53:a.x>=53);
}
for(const goal of fixture.events.filter(e=>e.type==='goal')){
 const s=presentationFrame(fixture,(goal.minute+.22)*60,field).kickoff;
 if(!s)continue;
 assert.equal(Math.floor(s.kicker/11),goal.team===fixture.home.id?1:0);
}
assert.equal(JSON.stringify(fixture),before);
console.log('PASS kickoff intro: real 2s hold + 2s ramp at 1/4/16x and 30/60/144fps, pause/speed/seek, own halves and two teammates in circle in all periods');
