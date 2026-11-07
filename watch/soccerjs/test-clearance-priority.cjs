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
   assert((a.to.x-a.from.x)*(side===0?1:-1)>=40,'Strong upfield distance');
   assert(a.to.y>=68*.35&&a.to.y<=68*.65,'Aim into open central lanes');
   assert(a.arc>=6);clearances++;sides.add(side);
  }
  if(a.mode==='challenge'&&i+1<plan.actions.length){
   const next=plan.actions[i+1],newSide=Math.floor(next.owner/11);
   const ownDepth=newSide===0?next.from.x:106-next.from.x;
   if(ownDepth<=106/3){
    assert.equal(next.pattern,'defensive-clearance','Every defensive-third recovery clears first');
    assert.equal(next.start,a.end,'No wait after recovery');recoveries++;
   }
  }
 }
}
assert(clearances>100&&recoveries>20);assert.deepEqual([...sides].sort(),[0,1]);
for(const g of f.events.filter(e=>e.type==='goal'))assert.equal(motionFrame(f,g.minute,field).officialEvent,g);
assert.equal(JSON.stringify(f),before);
console.log('PASS maximum clearance priority: '+clearances+' clearances, '+recoveries+' immediate recoveries, both directions, 90/120 minutes, no deliberate boards, unchanged PSE');
