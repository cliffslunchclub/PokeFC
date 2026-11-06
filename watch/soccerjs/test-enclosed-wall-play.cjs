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
const banks=plan.actions.filter(s=>s.mode==='pass'&&s.wall);
const rebounds=plan.actions.filter(s=>s.mode==='rebound'&&s.wall);
assert(banks.length>15,'Bank passes must occur in ordinary play');
assert(rebounds.length>12,'Loose wall rebounds must occur in ordinary play');
const byWall=new Set(plan.actions.filter(s=>s.wall).map(s=>s.wall.axis+s.wall.edge));
assert.deepEqual([...byWall].sort(),['xmax','xmin','ymax','ymin'],
 'Both sideboards and both endboards need playable rebounds');
let maxBoundary=0,looseRecoveries=0,turnovers=0;
for(let i=1;i<plan.actions.length;i++){
 const left=plan.actions[i-1],right=plan.actions[i];
 assert(distance(left.to,right.from)<.000001,'Bank stage broke continuous play');
 const at=right.start;
 const a=Director.sample(fixture,field,at-.00006);
 const b=Director.sample(fixture,field,at+.00006);
 maxBoundary=Math.max(maxBoundary,distance(a.ball,b.ball));
}
assert(maxBoundary<.01,'Wall contact caused discontinuous ball movement');
for(const stage of [...banks,...rebounds]){
 assert(stage.wall?.ratio>0&&stage.wall.ratio<1);
 assert(stage.wall.impactU>0&&stage.wall.impactU<1);
 const when=stage.start+stage.duration*stage.wall.impactU;
 const touch=Director.sample(fixture,field,when);
 assert(distance(touch.ball,stage.wall.hit)<.000015,
  'Ball must strike board at its computed point');
 const beforeContact=Director.sample(fixture,field,when-.005);
 const afterContact=Director.sample(fixture,field,when+.005);
 const axis=stage.wall.axis;
 assert((stage.wall.hit[axis]-beforeContact.ball[axis])*
  (afterContact.ball[axis]-stage.wall.hit[axis])<0,
  'Wall must reverse incoming perpendicular velocity');
 for(const u of [0,.06,.22,.4,.6,.78,.93,1]){
  const ball=Director.sample(fixture,field,stage.start+stage.duration*u).ball;
  assert(Physics.boundary(ball,field),'Illustrative ball crossed solid board');
 }
 if(stage.mode==='pass'){
  const mid=Director.sample(fixture,field,(stage.start+stage.end)/2);
  assert.equal(mid.ownerIndex,-1,'Bank pass in flight must be unowned');
  assert.equal(mid.action,'illustrative-bank-pass');
  assert.equal(mid.passOrigin,stage.from);
  assert.deepEqual(mid.passTarget,stage.to);
 }else{
  const mid=Director.sample(fixture,field,stage.start+stage.duration*.6);
  const pickup=Director.sample(fixture,field,stage.start+stage.duration*.975);
  assert.equal(mid.ownerIndex,-1,'Loose rebound must stay unowned until recovery');
  assert.equal(pickup.ownerIndex,stage.receiver,'Correct player must recover loose ball');
  assert.equal(pickup.action,'illustrative-wall-pickup');
  assert.equal(pickup.contact,'collected-loose-ball');
  const after=Director.sample(fixture,field,Math.min(plan.duration,stage.end+.00002));
  if(after.stage!==stage)assert.equal(after.stage.owner,stage.receiver,
   'Next action must continue with the recovery Pokémon');
  if(Math.floor(stage.owner/11)!==Math.floor(stage.receiver/11))turnovers++;
  looseRecoveries++;
 }
}
assert(looseRecoveries>12&&turnovers>=1,'Rebounds must occasionally change teams');
// Normal play never leaves the enclosed pitch. The ONLY exception is a PSE
// goal entering the net during the scorer's official goal scene.
for(let second=0;second<90*60;second+=1.8){
 const frame=motionFrame(fixture,second/60,field);
 if(frame.action==='official-goal')continue;
 assert(Physics.boundary(frame.ball,field),
  'Match ball escaped through a closed board at '+second+
  's, action='+frame.action);
}
const noGoals={...fixture,events:[],score:[0,0]};
assert.deepEqual(Director.planFor(noGoals,field).actions,plan.actions,
 'Wall actions must happen whether or not a PSE goal is due');
const overtime={...fixture,durationMinutes:120};
const extraPlan=Director.planFor(overtime,field);
assert(extraPlan.actions.filter(s=>s.wall).length>plan.actions.filter(s=>s.wall).length,
 'Overtime must continue generating wall rebounds');
for(const goal of fixture.events.filter(e=>e.type==='goal')){
 const frame=motionFrame(fixture,goal.minute,field);
 assert.equal(frame.action,'official-goal');
 assert.equal(frame.officialEvent.player,goal.player);
 const direction=goal.team===fixture.home.id?1:-1;
 assert((frame.ball.x-(direction===1?field.width:0))*direction>0,
  'Goal still needs to cross open goal line');
}
assert.equal(JSON.stringify(fixture),before,'Watch altered PSE goal ledger');
console.log('PASS all-mode enclosed wall trajectories: '+banks.length+
 ' bank passes, '+rebounds.length+' loose pickups, '+turnovers+
 ' steals, four board faces, '+maxBoundary.toFixed(7)+
 'm maximum seam, goals and overtime intact');
