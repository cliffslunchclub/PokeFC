'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createRequire}=require('node:module');
const Q=require('../assets/js/quick-sim.js'),KO=require('../assets/js/pse-knockout.js');
const f=require('../watch/soccerjs/fixture.json'),preview={home:f.home,away:f.away};
const path=require.resolve('../assets/js/pse-knockout.js');
const sandbox={module:{exports:{}},require:createRequire(path)};
sandbox.globalThis=sandbox;
// Unbounded generation consumes identical draws; only the approved cap differs.
vm.runInNewContext(fs.readFileSync(path,'utf8')
 .replace('rolledOnTarget&&incidentCount<incidentCapacity','rolledOnTarget')
 .replace('  qs.spaceEvents(events,[[90,105],[105,120]],options.previousIncident??-Infinity);','  events.sort((a,b)=>a.minute-b.minute);'),sandbox);
const unbounded=sandbox.module.exports;
let limited=0;
for(let i=0;i<1000;i++){
 const seed='spacing-'+i,options={previousIncident:89.95};
 const before=JSON.stringify(preview),raw=unbounded.extraTime(preview,seed,options),extra=KO.extraTime(preview,seed,options);
 assert.deepEqual(extra,KO.extraTime(preview,seed,options),'Repeatable capped outcomes');
 assert.equal(JSON.stringify(preview),before);
 const incidents=extra.events.filter(e=>e.type==='goal'||e.type==='save');
 assert(incidents.length<=extra.incidentSpacing.capacity);
 let last=options.previousIncident;
 for(const e of incidents){assert(e.minute-last>=3-1e-9);last=e.minute;}
 const order=(a,b)=>a.id.localeCompare(b.id);
 const shots=extra.events.filter(e=>e.type==='shot').sort(order),oldShots=raw.events.filter(e=>e.type==='shot').sort(order);
 assert.equal(shots.length,oldShots.length,'Retain every attempted shot');
 for(let j=0;j<shots.length;j++){
  assert.equal(shots[j].player,oldShots[j].player);
  assert.equal(shots[j].team,oldShots[j].team);
  if(shots[j].spacingLimited){
   assert.equal(shots[j].outcome,'off-target');assert.notEqual(oldShots[j].outcome,'off-target');
   assert(!extra.events.some(e=>e.causedBy===shots[j].id),'No goal/save for a capped attempt');limited++;
  }else assert.equal(shots[j].outcome,oldShots[j].outcome,'Uncapped attempts retain seeded outcomes');
 }
 for(let side=0;side<2;side++){
  const team=side?preview.away:preview.home,s=extra.stats[side];
  for(const key of ['shots','passes','completedPasses','tackles','tackleAttempts'])assert.equal(s[key],raw.stats[side][key],'Preserve independent RNG stream: '+key);
  assert.equal(s.goals,extra.score[side]);
  assert.equal(s.shotsOnTarget,s.goals+extra.stats[1-side].saves);
  for(const key of ['shots','shotsOnTarget','goals','saves','assists']){
   const sum=team.lineup.reduce((n,p)=>n+extra.box[p.id][key],0);
   if(key!=='assists')assert.equal(sum,s[key]);
   else assert.equal(sum,extra.events.filter(e=>e.type==='goal'&&e.team===team.id&&e.assist).length);
  }
 }
 for(const e of incidents){
  const shot=extra.events.find(s=>s.id===e.causedBy);
  assert(shot);assert.equal(shot.minute,e.minute);assert.equal(shot.outcome,e.type==='goal'?'goal':'saved');
 }
}
assert(limited>0);
for(const i of [342,432,752]){
 const seed='spacing-'+i,reg=Q.simulate(preview,{seed}),before=JSON.stringify(reg);
 const resolved=KO.resolve(preview,reg,{seed});
 assert.equal(JSON.stringify(reg),before,'Never rewrite regulation');
 assert.equal(resolved.extraTime.incidentSpacing.cappedShots,1,'Previously failing seed must cap one attempt');
 assert.equal(resolved.extraTime.events.filter(e=>e.type==='goal'||e.type==='save').length,10);
}
const zero=KO.extraTime(preview,'no-slots',{previousIncident:119});
assert.equal(zero.incidentSpacing.capacity,0);assert(zero.stats.every(s=>s.goals===0&&s.saves===0&&s.shotsOnTarget===0));
assert(zero.events.every(e=>e.type==='shot'&&e.outcome==='off-target'));
console.log('PASS 1000 extra times, '+limited+' capped attempts: both-team capacity, linked shots, team/player totals, assists, unchanged independent RNG, zero slots and all three former failures');
