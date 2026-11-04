'use strict';
// Phase 9 is opt-in only. The production Quick Sim seed path must be unchanged.
const assert=require('node:assert/strict');
const quick=require('../quick-sim.js');
const roles=['GK','DEF','DEF','DEF','DEF','MID','MID','MID','FWD','FWD','FWD'];
function fixture(shift) {
  const team=(id)=>({id,tactic:'balanced',lineup:roles.map((pos,i)=>{
    const value=Math.max(20,Math.min(99,60+shift+(i%3-1)*3));
    const attrs={firstTouch:value,shortPassing:value,vision:value,decisionMaking:value,
      tackling:value,interception:value,awareness:value,shooting:value,
      finishing:value,sprintSpeed:value,composure:value,reflexes:value,
      positioning:value,handling:value,diving:value,kicking:value,strength:value};
    return {id:id+'-'+i,pos,main:{...attrs},detail:{...attrs}};
  })});
  return {seed:'phase9',home:team('h'),away:team('a')};
}
const mods=['phase9-pass-moderate','phase9-pass-aggressive'];
const avgs={};
for(const profile of [-15,0,15]) {
  const preview=fixture(profile);
  avgs[profile]={};
  for(const variant of mods) {
    const result=quick.simulate(preview,{seed:'determinism',calibrationVariant:variant});
    assert.deepEqual(result,quick.simulate(preview,{seed:'determinism',calibrationVariant:variant}),
      'Experimental Quick Sim is nondeterministic');
    assert(result.stats.every(t=>t.passes>=t.completedPasses),'Pass count invalid');
    let completed=0,attempts=0,goals=0,shots=0;
    for(let i=0;i<120;i++) {
      const r=quick.simulate(preview,{seed:'phase9-'+i,calibrationVariant:variant});
      for(const t of r.stats){completed+=t.completedPasses;attempts+=t.passes;goals+=t.goals;shots+=t.shots;}
    }
    avgs[profile][variant]={passRate:completed/attempts,goals:goals/120,shots:shots/120};
  }
  assert.deepEqual(quick.simulate(preview,{seed:'legacy'}),
    quick.simulate(preview,{seed:'legacy',calibrationVariant:null}),
    'Production Quick Sim path mutated');
}
for(const variant of mods){
  assert(avgs[-15][variant].passRate<avgs[15][variant].passRate,
    'Elite passing is not stronger than weak passing in '+variant);
}
assert(avgs[0]['phase9-pass-moderate'].passRate<avgs[0]['phase9-pass-aggressive'].passRate,
  'Aggressive mode is not more accurate than moderate mode');
assert.throws(()=>quick.simulate(fixture(0),{calibrationVariant:'invalid'}),/Unknown/);
console.log('PASS Phase 9 opt-in Quick Sim: deterministic, legacy unchanged, rating-sensitive:',JSON.stringify(avgs));
