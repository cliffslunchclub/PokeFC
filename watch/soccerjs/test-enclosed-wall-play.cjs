'use strict';
/* PSE score authority + low-bank pass/loose-ball pickup invariant tests. */
const assert=require('node:assert/strict');
const fixture=require('./fixture.json');
const Physics=require('./phase10-wall-physics.cjs');
const Director=require('./phase10-play-director.cjs');
const {motionFrame}=require('./phase10-motion.cjs');
const field={width:106,height:68},before=JSON.stringify(fixture);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const plan=Director.planFor(fixture,field);
assert(plan.actions.every(s=>!s.wall&&s.mode!=='rebound'),
 'Never deliberately select board banks or manufactured wall contacts');
let maxBoundary=0;
for(let i=1;i<plan.actions.length;i++){
 const left=plan.actions[i-1],right=plan.actions[i];
 assert(distance(left.to,right.from)<.000001,'Open-play stage broke continuity');
 const a=Director.sample(fixture,field,right.start-.00006);
 const b=Director.sample(fixture,field,right.start+.00006);
 maxBoundary=Math.max(maxBoundary,distance(a.ball,b.ball));
}
assert(maxBoundary<.01,'Open-play ball discontinuity');
for(const stage of plan.actions.filter(s=>s.mode==='pass')){
 assert(stage.to.x>=6&&stage.to.x<=field.width-6);
 assert(stage.to.y>=6&&stage.to.y<=field.height-6,'Aim inside the pitch, not at boards');
}
// Normal play never leaves the enclosed pitch. The ONLY exception is a PSE
// goal entering the net during the scorer's official goal scene.
for(let second=0;second<90*60;second+=1.8){
 const frame=motionFrame(fixture,second/60,field);
 if(Physics.boundary(frame.ball,field))continue;
 // A PSE-approved shot can enter the OPEN goal mouth just before its exact
 // official timestamp, and the scored ball remains inside the net afterward.
 // This is not a reflection off, or an escape through, a solid board.
 const official=fixture.events.find(e=>e.type==='goal'&&
  Math.abs(e.minute*60-second)<15);
 assert(official&&['official-goal','illustrative-shot'].includes(frame.action),
  'Match ball escaped through a closed board at '+second+
  's, action='+frame.action);
 assert(Math.abs(frame.ball.y-field.height/2)<=Physics.GOAL_HALF_WIDTH,
  'Ball crossed an end line outside the open goal mouth');
 const dir=official.team===fixture.home.id?1:-1;
 assert((frame.ball.x-(dir===1?field.width:0))*dir>=-Physics.RADIUS-.1,
  'Shot crossed the wrong goal line');
}
const noGoals={...fixture,events:[],score:[0,0]};
assert.deepEqual(Director.planFor(noGoals,field).actions,plan.actions,
 'Wall actions must happen whether or not a PSE goal is due');
const overtime={...fixture,durationMinutes:120};
const extraPlan=Director.planFor(overtime,field);
assert(extraPlan.actions.every(s=>!s.wall&&s.mode!=='rebound'),'No deliberate boards in extra time');
for(const goal of fixture.events.filter(e=>e.type==='goal')){
 const frame=motionFrame(fixture,goal.minute,field);
 assert.equal(frame.action,'official-goal');
 assert.equal(frame.officialEvent.player,goal.player);
 const direction=goal.team===fixture.home.id?1:-1;
 assert((frame.ball.x-(direction===1?field.width:0))*direction>0,
  'Goal still needs to cross open goal line');
}
assert.equal(JSON.stringify(fixture),before,'Watch altered PSE goal ledger');
console.log('PASS open-play enclosure: no deliberate board contacts, inward passing targets, continuous paths, goals and extra time intact; seam '+maxBoundary.toFixed(7)+'m');
