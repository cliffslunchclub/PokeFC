'use strict';
const assert=require('node:assert/strict');
const {motionFrame,presentationFrame}=require('./phase10-motion.cjs');
const Onside=require('./phase10-onside-movement.cjs'),Bounds=require('./phase10-player-boundaries.cjs');
const O=require('./phase10-one-on-one.cjs'),f=require('./fixture.json'),field={width:106,height:68};
const before=JSON.stringify(f),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
let points=0,maxSeam=0;
// Same match-time samples used by live Watch, fast playback and replay seeks.
for(const step of [1,4])for(let sec=0;sec<=5400;sec+=step*7.7){
 const frame=motionFrame(f,sec/60,field);
 for(const actor of frame.actors){
  assert(actor.x>=Bounds.INSET&&actor.x<=field.width-Bounds.INSET);
  assert(actor.y>=Bounds.INSET&&actor.y<=field.height-Bounds.INSET);points++;
 }
 if(frame.onsideGuard){
  const guarded=Onside.guard(frame,field);
  for(const rule of frame.onsideGuard){
   if(rule.strength!==1)continue;
   const line=Onside.line(guarded.actors,field,rule.side,guarded.ball);
   for(let id=rule.side*11+1;id<rule.side*11+11;id++){
    if(id===rule.carrier||id===rule.runner&&rule.run>0)continue;
    const depth=rule.side===0?guarded.actors[id].x:field.width-guarded.actors[id].x;
    assert(depth<=line+1e-7,'Rendered supporter outside live line');
   }
  }
 }
}
const shots=O.build(f,field,s=>presentationFrame(f,s,field)).filter(s=>s.outcome==='block');
assert(shots.length>0);
assert(shots.some(s=>s.clearer===s.keeper),'Keeper foot-clearance fallback');
assert(shots.some(s=>s.clearer!==s.keeper),'Reachable defender should clear');
for(const shot of shots)for(const at of [shot.start,shot.impactSeconds,shot.spilled,shot.clearAt,shot.clearArrival,shot.end]){
 const a=motionFrame(f,(at-1e-6)/60,field),b=motionFrame(f,(at+1e-6)/60,field);
 const seam=Math.max(dist(a.ball,b.ball),...a.actors.map((p,i)=>dist(p,b.actors[i])));
 maxSeam=Math.max(maxSeam,seam);assert(seam<.03,'Block actor/ball transition jumped at '+at+': '+seam);
}
assert.equal(JSON.stringify(f),before);
console.log('PASS follow-up guardrails: '+points+' bounded positions, '+shots.length+' loose blocks, both clearance paths, '+maxSeam.toFixed(6)+'m seams; onside render/seek/4x rules and immutable ledger');
