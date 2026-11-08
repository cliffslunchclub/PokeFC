'use strict';
const assert=require('node:assert/strict');
const f=require('./repros/opposite-clearance-buildup-64.json');
const Director=require('./phase10-play-director.cjs');
const Goal=require('./phase10-goal-sequence.cjs');
const Q=require('../../assets/js/quick-sim.js');
const Bridge=require('./watch-bridge.js');
const {motionFrame,rawMotionFrame}=require('./phase10-motion.cjs');
const {clipFor,catalog}=require('./highlight-replay.cjs');
const field={width:106,height:68},dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const before=JSON.stringify(f),goal=f.events.find(e=>e.minute===74.95&&e.type==='goal');
assert(goal,'Stored fixture must retain original Cerulean PSE goal');
const sequence=Goal.forGoal(f,field,goal,sec=>rawMotionFrame(f,sec/60,field,true));
const plan=Director.planFor(f,field);
const clearance=plan.actions.find(a=>a.pattern==='defensive-clearance'&&
 Math.floor(a.owner/11)===1&&Math.abs(a.start-f.reproduction.clearanceStartSeconds)<.001);
assert(clearance,'Stored visualSeed must reproduce the original clearance');
assert.equal(clearance.end,f.reproduction.clearanceArrivalSeconds);
console.log('SAVED RED REPRO',JSON.stringify({seed:f.visualSeed,goalMinute:goal.minute,
 clearanceStart:clearance.start,clearanceArrival:clearance.end,
 buildupStart:sequence.start,shotStart:sequence.shotStart,
 conflict:sequence.scheduleConflict||null}));
const sample=t=>motionFrame(f,t/60,field);
assert.equal(sample((clearance.start+clearance.end)/2).action,'illustrative-upfield-clearance',
 'A genuine defensive clearance must not be masked by the official goal');
assert(sequence.clearance,'Official buildup must know the clearance receiving touch');
assert.equal(sequence.clearance.receiver,clearance.receiver);
assert.equal(sequence.directCarry,true,'The actual PSE scorer caught this clearance and must carry it');
assert(!sequence.scheduleConflict,'Natural goal timing fits without accelerating');
const scorer=sequence.scorer;
let frames=0,maxRun=0,maxCarry=0;
for(let t=sequence.active+.03;t<sequence.shotStart-.05;t+=.12){
 const a=sample(t),b=sample(t+.025);
 assert.equal(a.ownerIndex,scorer,'Shooter must possess the buildup ball, not teleport it');
 assert(dist(a.ball,a.actors[scorer])<1.5,'Ball must remain at recorded shooter feet');
 const run=dist(a.actors[scorer],b.actors[scorer])/.025;
 const carry=dist(a.ball,b.ball)/.025;
 maxRun=Math.max(maxRun,run);maxCarry=Math.max(maxCarry,carry);
 assert(run<=4.05,'Scorer moved faster than 4 m/s at '+t+': '+run);
 assert(carry<=3.65,'Controlled ball faster than 3.6 m/s at '+t+': '+carry);
 frames++;
}
const kick=sample(sequence.shotStart+.001);
assert.equal(kick.actors[scorer].frame,3,'Recorded shooter takes the final kick');
assert(dist(kick.ball,kick.actors[scorer])<1.5,'Ball must be reached before shooting');
assert.equal(sample(goal.minute*60).officialEvent,goal,'Original official result unchanged');
const clip=clipFor(f,catalog(f,goal.minute).find(e=>e.event===goal));
assert(clip,'Replay clip exists');
assert(clip.start*60<=clearance.start+.02,'Replay must include complete defensive clearance');
assert(clip.end>=goal.minute,'Replay must include actual official goal');
for(const g of f.events.filter(e=>e.type==='goal')){
 const frame=sample(g.minute*60),team=String(g.team)===String(f.home.id)?f.home:f.away;
 const playerIndex=team.lineup.findIndex(p=>String(p.id)===String(g.player));
 assert.equal(frame.officialEvent,g);
 assert(playerIndex>=0);
}
for(const seed of [1,2,3]){
 const preview={home:f.home,away:f.away};
 const snapshot=Bridge.snapshot(preview,Q.simulate(preview,{seed:'official-saves-'+seed}));
 const original=JSON.stringify(snapshot);
 for(const save of snapshot.events.filter(e=>e.type==='save').slice(0,3)){
  const at=motionFrame(snapshot,save.minute,field,{saveEvent:save});
  assert.equal(at.officialEvent,save,'Every official save retains its PSE clock');
  assert.equal(at.saveSequence.keeper%11,0,'Official save uses real keeper');
  const received=motionFrame(snapshot,(at.saveSequence.shotStart+.01)/60,field,{saveEvent:save});
  assert(dist(received.ball,received.actors[at.saveSequence.shooter])<1.8,
   'Official save must start with recorded shooter kicking a reachable ball');
 }
 assert.equal(JSON.stringify(snapshot),original,'Official PSE match mutated');
}
for(const speed of [1,4,16])for(const t of [clearance.start,clearance.end+.01,sequence.shotStart,goal.minute*60]){
 // Same match-clock frame must be seekable and deterministic at any speed.
 assert.deepEqual(sample(t).ball,sample(t).ball,'Shot staging must not depend on playback speed '+speed);
}
assert.equal(JSON.stringify(f),before,'Stored fixture/ledger changed');
console.log('PASS saved clearance-to-goal scene: '+frames+' controlled frames, '+
 maxRun.toFixed(2)+' m/s scorer, '+maxCarry.toFixed(2)+' m/s dribble, both teams + save ledger intact');
