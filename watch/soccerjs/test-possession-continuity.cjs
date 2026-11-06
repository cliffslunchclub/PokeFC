'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {motionFrame}=require('./phase10-motion.cjs');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixture.json'),'utf8'));
const original=JSON.stringify(fixture),field={width:106,height:68};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
let maxBoundary=0,maxContact=0,maxPassReverse=0,transfers=0,challenges=0;
const secToMin=seconds=>seconds/60;
for(let cycle=0;cycle<Math.floor(90*60/8);cycle++){
 const start=cycle*8;
 if(cycle>0){
  const before=motionFrame(fixture,secToMin(start-.00006),field);
  const after=motionFrame(fixture,secToMin(start+.00006),field);
  maxBoundary=Math.max(maxBoundary,dist(before.ball,after.ball),
   ...before.actors.map((p,i)=>dist(p,after.actors[i])));
  assert(maxBoundary<.05,'Ball/player jumps at next possession cycle: '+maxBoundary);
 }
 // The ball is owned before the pass and in flight without a false carrier.
 const held=motionFrame(fixture,secToMin(start+8*.55),field);
 const launched=motionFrame(fixture,secToMin(start+8*.72),field);
 const middle=motionFrame(fixture,secToMin(start+8*.82),field);
 const finalPass=motionFrame(fixture,secToMin(start+8*.92),field);
 const received=motionFrame(fixture,secToMin(start+8*.95),field);
 if([held,launched,middle,finalPass,received].some(x=>x.action==='official-goal'||x.action==='illustrative-goal-buildup'||x.action==='illustrative-shot'||x.action==='illustrative-kickoff'))continue;
 assert(Number.isInteger(held.ownerIndex)&&held.ownerIndex>=0,'No prior carrier');
 assert.equal(launched.ownerIndex,-1,'Carrier label must disappear during flight');
 assert.equal(middle.ownerIndex,-1,'Midflight must not claim new possession');
 assert(Number.isInteger(received.ownerIndex)&&received.ownerIndex>=0,'Receiver missing');
 const receiver=received.actors[received.ownerIndex];
 maxContact=Math.max(maxContact,dist(received.ball,receiver));
 assert(maxContact<1.2,'Ball cannot become owned before reaching a receiving Pokémon');
 const from=launched.passOrigin,to=launched.passTarget;
 const vector={x:to.x-from.x,y:to.y-from.y},length=Math.hypot(vector.x,vector.y);
 if(length>.1){
  // A pass may travel backward if the teammate is behind, but it must never
  // reverse or take a sharp detour BEFORE that teammate touches the ball.
  const dot=(p)=>((p.ball.x-from.x)*vector.x+(p.ball.y-from.y)*vector.y)/length;
  const traveled=[launched,middle,finalPass].map(dot);
  const reverse=Math.max(0,traveled[0]-traveled[1],traveled[1]-traveled[2]);
  maxPassReverse=Math.max(maxPassReverse,reverse);
  assert(reverse<.0001,'Ball reversed direction mid-pass without a touch');
 }
 if(received.ownerIndex!==held.ownerIndex)transfers++;
 if(received.action==='illustrative-challenge')challenges++;
}
assert(transfers>100,'Passes do not reach teammates');
assert(challenges>20,'Illustrative possession changes absent');
assert.equal(JSON.stringify(fixture),original,'Read-only Watch altered official fixture');
const replay=JSON.parse(original);assert.deepEqual(
 motionFrame(fixture,1.5,field),motionFrame(replay,1.5,field),
 'Same seed and time must produce exact same animation');
// Knockout preview through 120 minutes remains supported.
const extended={...fixture,durationMinutes:120};
for(const minute of [90,100,119.99,120]){
 const frame=motionFrame(extended,minute,field);
 assert.equal(frame.actors.length,22);assert(Number.isFinite(frame.ball.x));
}
console.log('PASS Watch ball continuity: '+transfers+' intended touches, '+
 challenges+' illustrative contests, max boundary jump '+maxBoundary.toFixed(5)+
 ' m, max receiver gap '+maxContact.toFixed(2)+' m, no mid-pass whipping, 120-minute safe');
