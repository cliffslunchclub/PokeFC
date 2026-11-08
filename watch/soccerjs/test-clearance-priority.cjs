'use strict';
const assert=require('node:assert/strict');
const D=require('./phase10-play-director.cjs'),{motionFrame}=require('./phase10-motion.cjs');
const f=require('./fixture.json'),field={width:106,height:68},before=JSON.stringify(f);
let clearances=0,recoveries=0;const sides=new Set();
for(const durationMinutes of [90,120])for(let seed=0;seed<12;seed++){
 const fixture={...f,durationMinutes,visualSeed:'clearance-'+seed};
 const plan=D.planFor(fixture,field);
 for(let i=0;i<plan.actions.length;i++){
  const a=plan.actions[i],side=Math.floor(a.owner/11),depth=side===0?a.from.x:106-a.from.x;
  assert.equal(a.wall,null);assert.notEqual(a.mode,'rebound');
  if(a.pattern==='defensive-clearance'){
   assert.equal(a.mode,'pass','Kick immediately instead of dribbling');
   assert.equal(a.owner,plan.actions[i-1]?.receiver??a.owner);
   const distance=Math.hypot(a.to.x-a.from.x,a.to.y-a.from.y);
   assert(distance>=24.99&&distance<=35.01,'Approved 25–35m danger clearance');
   assert((a.to.x-a.from.x)*(side===0?1:-1)>0,'Kick upfield');
   assert(a.clearance?.flightSeconds>0,'Clearance flight must have a real duration');
   if(a.clearance.truncated){
    assert(a.scheduleConflict?.kind==='clearance-period-end',
     'Do not speed up a clearance to complete it at the final whistle');
    assert(a.clearance.bounceEndSeconds>a.end,'Natural flight remains unfinished at FT');
   }else assert(a.clearance.bounceEndSeconds<a.end,
    'Ball bounce must finish before the controlled receiving touch');
   assert(a.clearance?.receiver===a.receiver,'Receiver must be physically assigned');
   clearances++;sides.add(side);
  }
  if(a.mode==='challenge'&&i+1<plan.actions.length){
   const next=plan.actions[i+1],newSide=Math.floor(next.owner/11);
   const ownDepth=newSide===0?next.from.x:106-next.from.x;
   if(ownDepth<=106/3){
    // A newly recovered ball clears promptly, unless the team has just
    // collected its own clearance and is making a controlled first touch.
    const lastClearance=plan.actions.slice(0,i+1).reverse()
     .find(x=>x.pattern==='defensive-clearance');
    if(!lastClearance||next.start-lastClearance.start>8)
     assert.equal(next.pattern,'defensive-clearance','Fresh defensive-third recovery must clear');
    else assert(['carry','pass'].includes(next.mode),'No clearance-return loop');
    assert.equal(next.start,a.end,'No wait after recovery');recoveries++;
   }
  }
 }
}
assert(clearances>100&&recoveries>20);assert.deepEqual([...sides].sort(),[0,1]);
for(const g of f.events.filter(e=>e.type==='goal'))assert.equal(motionFrame(f,g.minute,field).officialEvent,g);
assert.equal(JSON.stringify(f),before);
console.log('PASS controlled 25–35m clearance priority: '+clearances+' clearances, '+recoveries+' immediate recoveries, both directions, 90/120 minutes, no deliberate boards, unchanged PSE');
