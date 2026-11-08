'use strict';
const assert=require('node:assert/strict');
const Celebrate=require('./goal-celebration.cjs');
const {motionFrame}=require('./phase10-motion.cjs');
const fixture=require('./repros/opposite-clearance-buildup-64.json');
const field={width:106,height:68},original=JSON.stringify(fixture);
const goals=fixture.events.filter(e=>e.type==='goal');
assert(goals.some(e=>e.team===fixture.home.id)&&goals.some(e=>e.team===fixture.away.id));
for(const goal of [goals[0],goals.at(-1)]){
 const frame=motionFrame(fixture,goal.minute,field);
 const scene=Celebrate.create(fixture,field,goal,frame);
 assert.equal(scene.duration,3);assert.equal(scene.scorer%11,fixture[scene.side?'away':'home'].lineup.findIndex(p=>p.id===goal.player));
 for(const reducedMotion of [false,true]){
  let last=null,maxSpeed=0,hopCount=0;
  for(let i=0;i<=300;i++){
   const elapsed=i/100;
   const sampled=Celebrate.sample(scene,elapsed,{reducedMotion});
   assert.equal(sampled.officialEvent,goal);
   assert.deepEqual(sampled.ball,frame.ball,'Ball must settle in net throughout celebration');
   assert.equal(sampled.action,'official-goal-celebration');
   assert.equal(sampled.celebration.duration,3);
   assert(sampled.celebration.angleDegrees>=-19&&sampled.celebration.angleDegrees<=19);
   assert(sampled.celebration.zoom>=1&&sampled.celebration.zoom<=1.24);
   assert(sampled.actors.every(p=>p.x>=.9&&p.x<=105.1&&p.y>=.9&&p.y<=67.1));
   for(let a=0;a<22;a++){
    if(a!==scene.scorer&&!scene.friends.some(x=>x.id===a))
     assert.deepEqual(sampled.actors[a],frame.actors[a],'Unrelated defenders/GK must not move');
   }
   if(last){
    const p=sampled.actors[scene.scorer],q=last.actors[scene.scorer];
    const speed=Math.hypot(p.x-q.x,p.y-q.y)*100;
    maxSpeed=Math.max(maxSpeed,speed);
    assert(speed<=3.6,'Scorer sprinted faster than 3.5m/s');
    for(const friend of scene.friends){
     const a=sampled.actors[friend.id],b=last.actors[friend.id];
     assert(Math.hypot(a.x-b.x,a.y-b.y)*100<=3.6,'Teammate gathering exceeded movement limit');
    }
   }
   if(sampled.actors[scene.scorer].z>.4)hopCount++;
   if(reducedMotion){
    assert.equal(sampled.actors[scene.scorer].z,0);
    assert.equal(sampled.celebration.angleDegrees,0);
    assert.equal(sampled.celebration.zoom,1);
   }
   last=sampled;
  }
  if(!reducedMotion)assert(hopCount>40,'Three scorer hops were not shown');
  console.log('PASS celebration '+scene.side+' reduced='+reducedMotion+' maxSpeed='+maxSpeed.toFixed(2));
 }
 assert.equal(Celebrate.sample(scene,0).actors[scene.scorer].z,0);
 assert.equal(Celebrate.sample(scene,3).actors[scene.scorer].z,0);
}
assert.equal(JSON.stringify(fixture),original,'PSE match events altered');
console.log('PASS both teams, fixed 3 real seconds, real scorer, bounds, 3 hops, motion fallback and PSE immutability');
