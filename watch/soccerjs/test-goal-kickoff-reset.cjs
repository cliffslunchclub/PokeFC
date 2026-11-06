'use strict';
const assert=require('node:assert/strict');
const fixture=require('./fixture.json');
const {motionFrame}=require('./phase10-motion.cjs');
const field={width:106,height:68},original=JSON.stringify(fixture);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
let tested=0;
for(const goal of fixture.events.filter(e=>e.type==='goal')){
 const pos=goal.minute;
 const net={x:goal.team===fixture.home.id?field.width*.985:field.width*.015,
  y:field.height*.5};
 const held=motionFrame(fixture,pos+.14,field);
 assert.equal(held.action,'official-goal');
 assert(distance(held.ball,net)<.001,'Scored ball must remain in net');
 const cut=pos+.22;
 const before=motionFrame(fixture,cut-1e-7,field);
 const after=motionFrame(fixture,cut+1e-7,field);
 assert.equal(before.action,'official-goal');
 assert.equal(after.action,'illustrative-kickoff');
 assert.equal(after.sceneCut,'post-goal-kickoff');
 assert(distance(after.ball,{x:field.width/2,y:field.height/2})<.001);
 assert.equal(after.officialEvent,null,'Kickoff is not an invented official PSE event');
 const restartStart=(pos+.22)*60;
 const restartEnd=Math.ceil((restartStart+4)/8)*8;
 const mid=motionFrame(fixture,((restartStart+restartEnd)/2)/60,field);
 assert.equal(mid.action,'illustrative-kickoff');
 const landingBefore=motionFrame(fixture,(restartEnd-1e-5)/60,field);
 const landingAfter=motionFrame(fixture,(restartEnd+1e-5)/60,field);
 assert(distance(landingBefore.ball,landingAfter.ball)<.01,
  'Kickoff pass must connect to next possession without a jump');
 assert(Math.max(...landingBefore.actors.map((actor,i)=>distance(actor,landingAfter.actors[i])))<.05,
  'Kickoff players must return continuously to regular play');
 tested++;
}
assert(tested>=2,'Expected multiple goal restart checks');
assert.equal(JSON.stringify(fixture),original,'Visual restart mutated the PSE fixture');
console.log('PASS Watch goal kickoff cuts: '+tested+' goals, net holds, midfield cut and seamless kickoff pass');
