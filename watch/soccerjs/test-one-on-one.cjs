'use strict';
const assert=require('node:assert/strict');
const O=require('./phase10-one-on-one.cjs');
const {motionFrame,rawMotionFrame,presentationFrame}=require('./phase10-motion.cjs');
const f=require('./fixture.json'),field={width:106,height:68};
const original=JSON.stringify(f),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function chance(side){
 const forward=side===0?x=>x:x=>106-x;
 const actors=Array.from({length:22},(_,id)=>({side:Math.floor(id/11),index:id%11,
  x:forward(70),y:12+(id%11)*4}));
 const owner=side*11+9,keeper=(1-side)*11;
 actors[owner]={...actors[owner],x:forward(94),y:33.68};
 actors[keeper]={...actors[keeper],x:forward(99),y:34};
 return {actors,ownerIndex:owner,ball:{x:forward(94.72),y:34,z:.23}};
}
for(const side of [0,1]){
 const frame=chance(side),owner=frame.ownerIndex;
 assert.equal(O.opportunity(frame,field).shooter,owner);
 frame.actors[(1-side)*11+2].x=side===0?98:8;
 frame.actors[(1-side)*11+2].y=34;
 assert.equal(O.opportunity(frame,field),null,'Do not shoot through a covering defender');
 frame.actors[(1-side)*11+2].y=50;
 assert(O.opportunity(frame,field),'A wide defender does not block the shooting lane');
 frame.ownerIndex=-1;
 assert.equal(O.opportunity(frame,field),null,'Do not shoot an unreceived pass');
 frame.ownerIndex=owner;frame.ball.z=2;
 assert.equal(O.opportunity(frame,field),null,'No ground kick of a high ball');
 frame.ball.z=.23;frame.ball.x=side===0?80:26;
 assert.equal(O.opportunity(frame,field),null,'No penalty-area trigger outside the box');
}
const raw=s=>presentationFrame(f,s,field),shots=O.build(f,field,raw);
assert(shots.length>10,'Expected seeded actual one-on-one opportunities');
assert(shots.some(s=>s.side===0)&&shots.some(s=>s.side===1));
let maxSeam=0,maxSpeed=0;
for(const shot of shots){
 const entry=raw(shot.start);
 assert.equal(O.opportunity(entry,field).shooter,shot.shooter);
 const launch=motionFrame(f,shot.start/60,field);
 assert.equal(launch.action,'illustrative-one-on-one-shot','Kick immediately at detection');
 assert.equal(launch.ownerIndex,-1,'No extra controlled dribble after a clear one-on-one');
 assert.equal(launch.actors[shot.shooter].frame,3);
 assert(dist(launch.ball,entry.ball)<1e-7,'Shot must start from the actual carried ball');
 const hit=motionFrame(f,shot.impactSeconds/60,field);
 assert.equal(hit.action,'illustrative-one-on-one-miss');
 assert(Math.abs(hit.ball.y-field.height/2)>field.height*.1,'Miss must clear actual goal mouth');
 assert.equal(shot.outcome,'miss');
 for(const seam of [shot.start,shot.impactSeconds,shot.end]){
  const a=motionFrame(f,(seam-.00001)/60,field),b=motionFrame(f,(seam+.00001)/60,field);
  maxSeam=Math.max(maxSeam,dist(a.ball,b.ball));
  assert(maxSeam<.01,'Shot, block or recovery teleported the ball');
 }
 let previous=launch;
 for(let sec=shot.start+.02;sec<shot.end;sec+=.02){
  const frame=motionFrame(f,sec/60,field);
  assert(frame.ball.x>=.34&&frame.ball.x<=105.66&&frame.ball.y>=.34&&frame.ball.y<=67.66,
   'Non-goal attempt escaped into the net or outside the enclosure');
  assert.equal(frame.officialEvent,null,'Illustrative block fabricated a PSE event');
  maxSpeed=Math.max(maxSpeed,dist(frame.ball,previous.ball)/.02);previous=frame;
 }
}
assert(maxSpeed<=28,'Shot/rebound outran renderer locomotion cap: '+maxSpeed);
for(const goal of f.events.filter(e=>e.type==='goal')){
 const shotAt=rawMotionFrame(f,goal.minute,field).goalShotStart/60;
 const side=goal.team===f.home.id?0:1;
 const team=side===0?f.home:f.away;
 const scorer=side*11+team.lineup.findIndex(p=>String(p.id)===String(goal.player));
 const before=rawMotionFrame(f,shotAt-.000001,field);
 const kick=motionFrame(f,shotAt+.000001,field);
 assert.equal(before.ownerIndex,-1,'Final pass must remain airborne until the shooting touch');
 assert.equal(kick.action,'illustrative-shot');assert.equal(kick.actors[scorer].frame,3);
 assert.equal(motionFrame(f,goal.minute,field).officialEvent,goal,'Recorded goal/time changed');
}
const t=(shots[0].start+.25)/60;
assert.deepEqual(motionFrame(f,t,field),motionFrame(JSON.parse(original),t,field));
const overtime={...JSON.parse(original),durationMinutes:120};
assert(O.build(overtime,field,s=>presentationFrame(overtime,s,field)).some(s=>s.start>5400),
 'Immediate shooting must continue in extra time');
assert.equal(JSON.stringify(f),original,'Official PSE shots, saves, score or box stats changed');
console.log('PASS immediate one-on-ones: '+shots.length+' actual-position shots, keeper contact, '+
 maxSpeed.toFixed(2)+'m/s ball cap, '+maxSeam.toFixed(6)+'m seams, first-touch goals and unchanged PSE');
