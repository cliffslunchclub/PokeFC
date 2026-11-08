'use strict';
const assert=require('node:assert/strict');
const fixture=require('./repros/opposite-clearance-buildup-64.json');
const Celebrate=require('./goal-celebration.cjs');
const Kickoff=require('./phase10-kickoff.cjs');
const {motionFrame,rawMotionFrame}=require('./phase10-motion.cjs');
const field={width:106,height:68},orig=JSON.stringify(fixture);
const normal=sec=>rawMotionFrame(fixture,sec/60,field,true);
const items=Kickoff.scenes(fixture,field,normal,sec=>rawMotionFrame(fixture,sec/60,field));
for(const event of fixture.events.filter(x=>x.type==='goal')){
 const cut=Celebrate.kickoffReady(items,event);
 assert(cut,'Every official goal needs a next two-player restart scene');
 assert(cut.seconds>cut.sceneStart);
 const moved=motionFrame(fixture,(cut.seconds+.0001)/60,field);
 assert.equal(moved.contact,'kickoff-setup',
  'Direct continuation must cut straight into the existing setup, never reposition');
 assert.equal(moved.ball.x,field.width/2);assert.equal(moved.ball.y,field.height/2);
 assert.equal(moved.kickoff.kicker,cut.kicker);
 assert.equal(moved.kickoff.receiver,cut.receiver);
 assert.equal(moved.officialEvent,null,'Kickoff cannot insert duplicate official goal');
 const circle=moved.actors.map((p,id)=>({p,id}))
  .filter(o=>Math.hypot(o.p.x-field.width/2,o.p.y-field.height/2)<9.15);
 assert.deepEqual(circle.map(x=>x.id),[cut.kicker,cut.receiver]);
 for(const t of [cut.seconds+.1,cut.seconds+.5]){
  const at=motionFrame(fixture,t/60,field);
  assert.equal(at.contact,'kickoff-setup','Start remains static before kicker makes the opening pass');
 }
}
assert.equal(JSON.stringify(fixture),orig,'Goal to kickoff cut altered PSE');
console.log('PASS every official goal → direct two-player midfield cut, static ball, no travel, PSE unchanged');
