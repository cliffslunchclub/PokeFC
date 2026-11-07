'use strict';
const assert=require('node:assert/strict');
const qs=require('../../assets/js/quick-sim.js'),bridge=require('./watch-bridge.js');
const {motionFrame,presentationFrame,playbackRate}=require('./phase10-motion.cjs');
const Kickoff=require('./phase10-kickoff.cjs'),{catalog,clipFor}=require('./highlight-replay.cjs');
const One=require('./phase10-one-on-one.cjs'),Shape=require('./phase10-team-shape.cjs');
const base=require('./fixture.json'),field={width:106,height:68};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
let saves=0,kicks=0,maxSeam=0;
for(let seed=0;seed<16;seed++){
 const preview={home:base.home,away:base.away};
 const result=qs.simulate(preview,{seed:'official-saves-'+seed}),before=JSON.stringify(result);
 const fixture=bridge.snapshot(preview,result);
 for(const event of fixture.events.filter(e=>e.type==='save')){
  const sec=event.minute*60,frame=motionFrame(fixture,event.minute,field,{saveEvent:event}),s=frame.saveSequence;
  assert(s,'Each official save has an animation');
  assert.equal(frame.officialEvent,event);assert.equal(frame.ownerIndex,s.keeper);
  assert.equal(fixture[s.keeper<11?'home':'away'].lineup[s.keeper%11].id,event.player);
  assert.equal(fixture[s.shooter<11?'home':'away'].lineup[s.shooter%11].id,event.shooter);
  assert(dist(frame.ball,frame.actors[s.keeper])<.01,'Keeper secures actual shot');
  const shoot=motionFrame(fixture,(s.shotStart+.001)/60,field,{saveEvent:event});
  assert.equal(shoot.action,'illustrative-save-shot');assert.equal(shoot.actors[s.shooter].frame,3);
  assert(dist(shoot.ball,shoot.actors[s.shooter])<1.8,'No waiting away from the receiving touch');
  assert.equal(motionFrame(fixture,(sec+.3)/60,field,{saveEvent:event}).ownerIndex,s.keeper,'Save ends held, never rebound');
  assert.equal(motionFrame(fixture,(s.release+.1)/60,field,{saveEvent:event}).action,'illustrative-keeper-punt');
  const received=motionFrame(fixture,s.arrival/60,field,{saveEvent:event});
  assert(Math.min(...received.actors.filter(a=>a.side===Math.floor(s.keeper/11)&&a.index!==0).map(a=>dist(a,received.ball)))<1.8,'Long punt must reach an actual receiver');
  for(const at of [s.start,s.active,s.shotStart,s.end,s.release,s.arrival,s.finish]){
   const a=presentationFrame(fixture,at-.000001,field,{saveEvent:event}),b=presentationFrame(fixture,at+.000001,field,{saveEvent:event});
   const seam=Math.max(dist(a.ball,b.ball),...a.actors.map((p,i)=>dist(p,b.actors[i])));
   maxSeam=Math.max(maxSeam,seam);assert(seam<.03,'Save/restart scene discontinuity at '+at+': '+seam);
  }
  const entry=catalog(fixture,event.minute).find(e=>e.event===event);
  assert.equal(entry.kind,'save');assert.equal(clipFor(fixture,entry).kind,'save');
  assert(!catalog(fixture,event.minute-.001).some(e=>e.id===entry.id),'No future highlights');
  for(const speed of [1,2,4,8,16])assert.equal(playbackRate(event.minute,fixture.events,speed),speed/60);
  saves++;
 }
 assert.equal(JSON.stringify(result),before,'Presentation mutated official PSE');
}
const fixture={...JSON.parse(JSON.stringify(base)),durationMinutes:120};
const initial=presentationFrame(fixture,0,field);
for(const start of [0,2700,5400,6300]){
 const opening=presentationFrame(fixture,start,field),s=opening.kickoff;
 assert(s,'Kickoff missing at period start');
 const ready=presentationFrame(fixture,s.kick-.01,field);
 assert.equal(ready.contact,'kickoff-setup');assert(dist(ready.ball,{x:53,y:34})<1e-6);
 for(const [id,a] of ready.actors.entries()){
  assert(id<11?a.x<=53:a.x>=53,'Start in own half');
  if(Math.floor(id/11)!==Math.floor(s.kicker/11))assert(dist(a,{x:53,y:34})>=9.15,'Opponent inside circle');
 }
 assert.equal(presentationFrame(fixture,(s.kick+s.arrival)/2,field).contact,'kickoff-pass');
 const received=presentationFrame(fixture,s.arrival+.001,field);
 assert.equal(received.ownerIndex,s.receiver);assert(dist(received.actors[s.receiver],received.ball)<1.8);
 for(const at of [s.kick,s.arrival,s.end]){
  const a=presentationFrame(fixture,at-1e-6,field),b=presentationFrame(fixture,at+1e-6,field);
  assert(dist(a.ball,b.ball)<.01);assert(Math.max(...a.actors.map((p,i)=>dist(p,b.actors[i])))<.01);
 }
 kicks++;
}
assert(saves>20&&kicks===4);
console.log('PASS official saves/restarts: '+saves+' saves across 16 PSE seeds, '+kicks+' period kickoffs, '+maxSeam.toFixed(6)+'m maximum scene seam; exact ledger and playback speed');
