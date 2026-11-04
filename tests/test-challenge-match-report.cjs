'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({window:{},console});
vm.runInContext(fs.readFileSync(path.join(root,'challenge/match-report.js'),'utf8'),ctx,{filename:'challenge/match-report.js'});
const report=ctx.window.PFC_MATCH_REPORT;
assert(report);
const fixture={
 home:{id:'challenger',lineup:[{id:'c9-6',name:'Charizard'},{id:'c10-25',name:'Pikachu'},{id:'c4-233',name:'Porygon2'}]},
 away:{id:'e4-lorelei',lineup:[{id:'boss9-131',name:'Lapras'},{id:'boss3-80',name:'Slowbro'}]}
};
const result={
 score:[2,1],origin:'quick-sim',
 stats:[{shots:14,shotsOnTarget:7,passes:340,completedPasses:275,possession:59.2,tackles:11,saves:3},
        {shots:9,shotsOnTarget:4,passes:265,completedPasses:205,possession:40.8,tackles:8,saves:5}],
 events:[
  {type:'goal',team:'e4-lorelei',minute:66.1,minuteLabel:'67',player:'boss9-131',assist:'boss3-80',origin:'quick-sim'},
  {type:'goal',team:'challenger',minute:11.4,minuteLabel:'12',player:'c9-6',assist:'c10-25',origin:'quick-sim'},
  {type:'goal',team:'challenger',minute:87.2,minuteLabel:'88',player:'c10-25',assist:null,origin:'quick-sim'}
 ]
};
let r=report.fromResult(result,fixture);
assert.equal(r.status,'complete');
assert.equal(r.goals.length,3);
assert.deepEqual(Array.from(r.goals.map(x=>x.minuteLabel)),['12','67','88']);
assert.deepEqual(Array.from(r.goals.map(x=>x.player)),['Charizard','Lapras','Pikachu']);
assert.equal(r.goals[0].assist,'Pikachu');
assert.equal(r.goals[1].assist,'Slowbro');
assert.equal(r.goals[1].side,1);
assert.equal(r.stats.shotsOnTarget[0],7);
assert.equal(r.stats.possession[1],40.8);
assert.equal(r.stats.tackles[0],11);
const hybrid=report.fromResult({...result,origin:'hybrid',handoff:{minute:45},events:result.events.map((e,i)=>({...e,origin:i===0?'quick-continuation':'tacticmesh'}))},fixture);
assert.equal(hybrid.status,'complete');
assert.equal(hybrid.origin,'hybrid');
assert.equal(hybrid.goals[1].origin,'quick-continuation');
assert.equal(hybrid.goals[0].origin,'tacticmesh');
assert.equal(hybrid.handoffMinute,45);
const unavailable=report.fromResult({score:[2,1],stats:[{shots:9},{shots:7}],origin:'quick-sim'},fixture);
assert.equal(unavailable.status,'unavailable');
assert.equal(unavailable.goals.length,0,'Never invent a scorer or time for old saves');
assert.equal(unavailable.stats.possession[0],null,'Missing possession must not become 0%');
const mismatch=report.fromResult({...result,events:result.events.slice(0,1)},fixture);
assert.equal(mismatch.status,'partial');
assert.equal(mismatch.goals[0].player,'Lapras');
const clean=report.fromResult({score:[0,0],stats:[{shots:3},{shots:4}],events:[]},fixture);
assert.equal(clean.status,'complete');
assert.equal(clean.goals.length,0);
const anonymous=report.fromResult({score:[1,0],events:[{type:'goal',minute:33.4,team:'challenger',player:'no-longer-present'}]},fixture);
assert.equal(anonymous.goals[0].player,'Scorer unavailable');
assert.equal(anonymous.goals[0].minuteLabel,'34');
console.log('PASS Challenge goal ledger: scorer/assist/minutes, both sides, match stats, hybrid source, legacy unavailable and no fabricated events');
