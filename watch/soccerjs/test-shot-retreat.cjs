'use strict';
const assert=require('node:assert/strict');
const {motionFrame,presentationFrame,rawMotionFrame}=require('./phase10-motion.cjs');
const One=require('./phase10-one-on-one.cjs');
const Bounds=require('./phase10-player-boundaries.cjs');
const Q=require('../../assets/js/quick-sim.js'),Bridge=require('./watch-bridge.js');
const fixture=require('./fixture.json'),field={width:106,height:68};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
let compared=0,shifted=0;
function check(frame,unshifted,side,label){
 assert.deepEqual(frame.ball,unshifted.ball,label+' ball/score is PSE-owned');
 assert.equal(frame.ownerIndex,unshifted.ownerIndex,label+' ball ownership unchanged');
 assert.equal(frame.officialEvent,unshifted.officialEvent,label+' official event unchanged');
 let moved=0;
 for(let id=0;id<22;id++){
  const a=frame.actors[id],b=unshifted.actors[id],delta=a.x-b.x;
  if(Math.floor(id/11)===side&&id%11!==0){
   assert((side===0?-delta:delta)>-1e-7,label+' attacker advanced toward open net');
   if(Math.abs(delta)>.10)moved++;
  }else{
   assert(dist(a,b)<1e-7,label+' keeper or defender moved by visual retreat');
  }
  assert(a.x>=Bounds.INSET-1e-7&&a.x<=field.width-Bounds.INSET+1e-7);
 }
 assert(moved>=7,label+' did not cause the attacking XI to backpedal');
 compared++;shifted+=moved;
}
const before=JSON.stringify(fixture),raw=s=>presentationFrame(fixture,s,field);
const attempts=One.build(fixture,field,raw);
assert(attempts.some(a=>a.side===0)&&attempts.some(a=>a.side===1));
for(const shot of [attempts.find(a=>a.side===0),attempts.find(a=>a.side===1),
 attempts.find(a=>a.outcome==='block')]){
 const at=shot.start+.75;
 assert(at<shot.end,'Choose active shot frame');
 const baseline=Bounds.apply(One.apply(fixture,field,at,raw(at),raw),field);
 const result=motionFrame(fixture,at/60,field);
 assert.equal(result.oneOnOne.shooter,shot.shooter);
 check(result,baseline,shot.side,'illustrative '+shot.outcome);
 const atStart=motionFrame(fixture,(shot.start+.001)/60,field);
 assert.equal(atStart.actors[shot.shooter].frame,3,'Shooting contact preserved');
 for(const seam of [shot.start,shot.end]){
  const a=motionFrame(fixture,(seam-.000001)/60,field);
  const b=motionFrame(fixture,(seam+.000001)/60,field);
  assert(Math.max(...a.actors.map((p,i)=>dist(p,b.actors[i])))<.03,
   'No retreat seam teleport at '+seam);
 }
}
for(const goal of fixture.events.filter(e=>e.type==='goal').slice(0,2)){
 const official=rawMotionFrame(fixture,goal.minute,field);
 const sec=official.goalShotStart+.8,baseline=presentationFrame(fixture,sec,field);
 const viewed=motionFrame(fixture,sec/60,field);
 const side=goal.team===fixture.home.id?0:1;
 assert(Number.isFinite(viewed.goalShotStart));
 check(viewed,baseline,side,'official goal approach');
 assert.equal(motionFrame(fixture,goal.minute,field).officialEvent,goal);
}
const preview={home:fixture.home,away:fixture.away};
const f=Bridge.snapshot(preview,Q.simulate(preview,{seed:'official-saves-0'}));
const save=f.events.find(e=>e.type==='save');
assert(save,'PSE seed must contain an official save');
const options={saveEvent:save};
const s=motionFrame(f,save.minute,field,options).saveSequence;
assert(s);
const at=s.end+.5,baseline=presentationFrame(f,at,field,options);
const result=motionFrame(f,at/60,field,options);
assert.equal(result.action,'official-save');
assert.equal(motionFrame(f,(s.shotStart+.01)/60,field,options).actors[s.shooter].frame,3);
check(result,baseline,Math.floor(s.shooter/11),'official save');
assert.equal(motionFrame(f,save.minute,field,options).officialEvent,save);
assert.equal(JSON.stringify(fixture),before,'Source match mutated');
console.log('PASS shot retreat: '+compared+' opposite-direction scenes, '+
 shifted+' players backpedaling, no made-up rebounds, unchanged PSE ledger and ball');
