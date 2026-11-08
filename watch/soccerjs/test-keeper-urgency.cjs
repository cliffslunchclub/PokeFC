'use strict';
const assert=require('node:assert/strict');
const Q=require('../../assets/js/quick-sim.js'),Bridge=require('./watch-bridge.js');
const {motionFrame,presentationFrame}=require('./phase10-motion.cjs');
const One=require('./phase10-one-on-one.cjs'),Keeper=require('./phase10-goalkeeper-rush.cjs');
const base=require('./fixture.json'),field={width:106,height:68};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
let saves=0,blocks=0;
for(let seed=0;seed<4;seed++){
 const preview={home:base.home,away:base.away};
 const f=Bridge.snapshot(preview,Q.simulate(preview,{seed:'official-saves-'+seed})),before=JSON.stringify(f);
 for(const e of f.events.filter(e=>e.type==='save')){
  const at=motionFrame(f,e.minute,field,{saveEvent:e}),s=at.saveSequence;
  assert(s.release-s.end<=.8+1e-7,'Secured save waits longer than approved 0.8 match seconds');
  assert(s.release-s.end>=.5-1e-7,'Keeper must secure the save before distribution');
  const launch=motionFrame(f,(s.release+.001)/60,field,{saveEvent:e});
  assert.equal(launch.action,'illustrative-keeper-punt');
  assert(dist(launch.ball,launch.actors[s.keeper])<1,'Punt must launch from keeper reach');
  assert.equal(at.officialEvent,e);saves++;
 }
 assert.equal(JSON.stringify(f),before);
}
// Mirrored crowded boxes: a nearby keeper must not wait for a farther defender;
// a defender who can play the spill first keeps that assignment.
for(const side of [0,1])for(const defenderFirst of [false,true]){
 const keeper=side*11,defender=keeper+2,point={x:side===0?5:101,y:34,z:.23};
 const actors=Array.from({length:22},()=>({x:53,y:1}));
 actors[keeper]={x:point.x,y:34};
 actors[defender]={x:point.x+(side===0?1:-1)*(defenderFirst?.1:7),y:34};
 const decision=Keeper.firstClearanceTouch(actors,keeper,()=>point);
 assert.equal(decision.id,defenderFirst?defender:keeper);
 assert(decision.dt<=.5,'Playable ball must not idle beside goalkeeper');
 assert(dist(decision.p,decision.point)<=5*decision.dt+.75+1e-7);
 assert.deepEqual(Keeper.firstClearanceTouch(actors,keeper,()=>point),decision,'Assignment must be deterministic');
}
const before=JSON.stringify(base);
for(const s of One.build(base,field,t=>presentationFrame(base,t,field)).filter(s=>s.outcome==='block')){
 assert(s.clearAt-s.impactSeconds<=.5,'Loose block stalled while a reachable clearer was available');
 const kick=motionFrame(base,(s.clearAt+.001)/60,field);
 assert.equal(kick.action,'illustrative-upfield-clearance');
 assert(dist(kick.ball,kick.actors[s.clearer])<1,'Clearer must reach the ball');
 assert.equal(kick.officialEvent,null);
 for(const t of [s.impactSeconds,s.clearAt,s.clearArrival,s.end]){
  const a=motionFrame(base,(t-1e-6)/60,field),b=motionFrame(base,(t+1e-6)/60,field);
  assert(dist(a.ball,b.ball)<.01,'Clearance ball seam');
  assert(Math.max(...a.actors.map((p,id)=>dist(p,b.actors[id])))<.03,'Clearance actor seam');
 }
 blocks++;
}
assert(blocks>0&&saves>0);assert.equal(JSON.stringify(base),before);
console.log('PASS keeper urgency: '+saves+' held saves, '+blocks+' first-touch blocks, mirrored crowded boxes, stable collector, physical kick, no PSE mutation');
