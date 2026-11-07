'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const qs=require('../assets/js/quick-sim.js'),KO=require('../assets/js/pse-knockout.js');
const fixture=require('../watch/soccerjs/fixture.json');
const preview={home:fixture.home,away:fixture.away};
// Independent pre-scheduler engine protects outcomes and RNG consumption.
const sandbox={module:{exports:{}},console};sandbox.globalThis=sandbox;
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/quick-sim.js'),'utf8')
 .replace('  spaceEvents(events);','  events.sort((a,b)=>a.minute-b.minute);'),sandbox);
const legacy=sandbox.module.exports;
const incidents=events=>events.filter(e=>e.type==='goal'||e.type==='save');
function check(events){
 const selected=incidents(events);
 for(let i=1;i<selected.length;i++)assert(selected[i].minute-selected[i-1].minute>=3-1e-9,'Global three-minute gap');
 for(const e of selected)assert.equal(e.minuteLabel,String(Math.floor(e.minute)+1));
}
let count=0,extra=0,conflicts=0;
for(let seed=0;seed<1000;seed++){
 const options={seed:'spacing-'+seed},old=legacy.simulate(preview,options),result=qs.simulate(preview,options);
 check(result.events);count+=incidents(result.events).length;
 assert.equal(JSON.stringify(result.score),JSON.stringify(old.score));
 assert.equal(JSON.stringify(result.stats),JSON.stringify(old.stats));
 assert.equal(JSON.stringify(result.box),JSON.stringify(old.box));
 const identity=e=>{const {minute,minuteLabel,...rest}=e;return JSON.stringify(rest)};
 assert.deepEqual(result.events.map(identity),Array.from(old.events,identity),'Only timestamps may change');
 assert.deepEqual(result,qs.simulate(preview,options));
 let knockout;
 try{knockout=KO.resolve(preview,result,options);}catch(e){
  assert.equal(e.code,'PSE_EVENT_SPACING_CAPACITY');conflicts++;continue;
 }
 check(knockout.match.events);
 if(knockout.extraTime)extra++;
}
for(const a of ['goal','save'])for(const b of ['goal','save']){
 const events=[{type:a,minute:44.9},{type:b,minute:45.1}];
 qs.spaceEvents(events);check(events);
}
const linked=[{id:'shot',type:'shot',minute:3},{type:'save',minute:3,causedBy:'shot'},{type:'goal',minute:3.1}];
qs.spaceEvents(linked);check(linked);assert.equal(linked[0].minute,linked[1].minute);
const impossible=Array.from({length:31},()=>({type:'save',minute:10})),before=JSON.stringify(impossible);
assert.throws(()=>qs.spaceEvents(impossible),e=>e.code==='PSE_EVENT_SPACING_CAPACITY');
assert.equal(JSON.stringify(impossible),before,'Capacity conflicts must not partially mutate the ledger');
console.log('PASS 1000 seeds, '+count+' incidents, '+extra+' extra times, '+conflicts+' flagged capacity conflicts: all gap pairs, preserved outcomes/statistics/RNG, deterministic timestamps and atomic conflict flag');
