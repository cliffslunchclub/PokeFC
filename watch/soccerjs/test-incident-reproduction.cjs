'use strict';
// Repro deliberately keeps the official fixture and ledger unchanged.
// Only the Watch visualSeed is varied to expose a clearance whose natural
// reception was previously overwritten by an independently scheduled goal.
const assert=require('node:assert/strict');
const base=require('./fixture.json');
const Director=require('./phase10-play-director.cjs');
const Goal=require('./phase10-goal-sequence.cjs');
const {motionFrame,rawMotionFrame}=require('./phase10-motion.cjs');
const field={width:106,height:68};
const sideOf=(f,e)=>String(e.team)===String(f.home.id)?0:1;
const seconds=e=>e.minute*60;
let repro=null;
for(let seed=0;seed<100&&!repro;seed++){
 const f={...base,visualSeed:'opposite-clearance-buildup-'+seed};
 const plan=Director.planFor(f,field);
 for(const goal of f.events.filter(e=>e.type==='goal')){
  const side=sideOf(f,goal);
  const normal=sec=>rawMotionFrame(f,sec/60,field,true);
  const sequence=Goal.forGoal(f,field,goal,normal);
  const clearance=plan.actions.find(a=>a.pattern==='defensive-clearance'&&
   Math.floor(a.owner/11)===side&&a.end>=seconds(goal)-18&&
   a.end<=seconds(goal)-8&&
   a.start>sequence.start+.1&&a.end<sequence.shotStart-2);
  if(!clearance)continue;
  repro={seed:f.visualSeed,goal,side,clearance,sequence,f};
  break;
 }
}
assert(repro,'Need a deterministic PSE goal with a nearby Watch defensive clearance');
const {seed,goal,clearance,sequence,f}=repro;
console.log('SAVED REPRO',JSON.stringify({seed,officialGoalMinute:goal.minute,
 goalTeam:goal.team,scorer:goal.player,clearanceStart:clearance.start,
 clearanceEnd:clearance.end,buildupStart:sequence.start,shotStart:sequence.shotStart}));
const mid=(clearance.start+clearance.end)/2;
const before=JSON.stringify(f);
const frame=motionFrame(f,mid/60,field);
// This was RED before the fix: the goal scene masked an otherwise planned
// long defensive clearance and appeared to go directly to a shot.
assert.equal(frame.action,'illustrative-upfield-clearance',
 'The preceding defensive clearance must remain visible before the official buildup');
assert.equal(JSON.stringify(f),before,'PSE source fixture cannot be mutated');
console.log('PASS preserved clearance leading into PSE goal');
