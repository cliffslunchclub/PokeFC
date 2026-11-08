'use strict';
const assert=require('node:assert/strict');
const One=require('./phase10-one-on-one.cjs');
const {presentationFrame,motionFrame}=require('./phase10-motion.cjs');
const f=require('./fixture.json'),field={width:106,height:68},before=JSON.stringify(f);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const shots=One.build(f,field,t=>presentationFrame(f,t,field)).filter(s=>s.outcome==='block');
assert(shots.some(s=>s.clearer===s.keeper));assert(shots.some(s=>s.clearer!==s.keeper));
let longest=0,maxSeam=0;
for(const s of shots){
 const delay=s.clearAt-s.impactSeconds;longest=Math.max(longest,delay);
 assert(delay<=.2,'Clear on the first reachable touch, without a staged hold');
 const kick=motionFrame(f,s.clearAt/60,field);
 assert(dist(kick.ball,kick.actors[s.clearer])<.9,'The kick must contact an actual reachable foot');
 const mid=motionFrame(f,(s.clearAt+s.clearArrival)/120,field);
 assert(mid.actors.filter((p,id)=>dist(p,s.actorsAtClear[id])>.1).length>=4,
  'Players must spread during the flight rather than freeze until landing');
 const touch=motionFrame(f,s.clearArrival/60,field);
 assert.equal(touch.ownerIndex,s.receiver);
 assert(dist(touch.ball,touch.actors[s.receiver])<1.5,'Actual receiver must meet the landing ball');
 for(let t=s.clearArrival;t<s.end;t+=.05){
  const a=motionFrame(f,t/60,field),b=motionFrame(f,(t+.001)/60,field);
  if(a.ownerIndex>=0)assert(dist(a.ball,a.actors[a.ownerIndex])<1.5,'Controlled recovery cannot leave its carrier');
  else assert.equal(a.contact,'recovery-pass','Unowned recovery ball must be an explicit pass');
  assert(dist(a.ball,b.ball)/.001<=14.01,'Recovery cannot drag or accelerate an unowned ball');
 }
 for(const t of [s.start,s.impactSeconds,s.clearAt,s.clearArrival,s.join.passStart,s.end]){
  const a=motionFrame(f,(t-1e-6)/60,field),b=motionFrame(f,(t+1e-6)/60,field);
  const seam=Math.max(dist(a.ball,b.ball),...a.actors.map((p,id)=>dist(p,b.actors[id])));
  maxSeam=Math.max(maxSeam,seam);assert(seam<.01,'Clearance handoff teleported');
 }
}
const k=presentationFrame(f,0,field).kickoff;
for(let t=k.arrival;t<k.end;t+=.02){
 const a=presentationFrame(f,t,field);
 if(a.ownerIndex>=0)assert(dist(a.ball,a.actors[a.ownerIndex])<1.5,'Kickoff receiver must carry the ball into play');
}
assert.equal(JSON.stringify(f),before);
console.log('PASS connected recoveries: '+shots.length+' first-touch clearances, '+longest.toFixed(2)+'s maximum block-to-kick, real receiving touches, moving players, natural carry/pass speeds, '+maxSeam.toFixed(6)+'m maximum seam; PSE immutable');
