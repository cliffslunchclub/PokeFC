const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const messages=[];let calls=0, timers=[];const ball={x:52.5,y:34};
const match={tick:0,clock:{elapsedSeconds:0},events:[],playersById:{'fake1':{sourceId:'p1'}},teams:[{id:'engine-home',sourceId:'0'},{id:'engine-away',sourceId:'1'}]};
const TF={
 createEventCursor(){let seen=0;return{read(ev){const r=ev.slice(seen);seen=ev.length;return r}}},
 engine:{
  validateMatchConfig:()=>({ok:true}),createMatch:()=>({match}),
  readSnapshot:()=>({players:[{id:'p1',active:true,position:{x:52,y:33},teamId:'0'}],ball,score:{home:calls>=3?1:0,away:0},elapsedSeconds:match.clock.elapsedSeconds,period:1,status:calls>=3?'completed':'running',phase:'open-play'}),
  stepMatch:()=>{calls++;match.tick+=600;match.clock.elapsedSeconds=calls*45;match.events.push({type:'goal',time:60,teamId:'engine-home',scorerId:'fake1'});return{status:calls>=3?'completed':'running'}},
  continueAfterHalfTime:()=>true
 },
 productReports:{fromMatch:()=>({complete:true,status:'completed',score:{home:1,away:0},teams:[{id:'0',stats:{goals:1,shots:8}},{id:'1',stats:{goals:0,shots:5}}],players:[{id:'fake1',sourceId:'p1',minutes:90,stats:{goals:1},rating:{value:8}}],events:[{type:'goal',time:60,minute:'1',teamId:'0',scorerId:'fake1'}],engineBuild:'mock'})}
};
const context={self:{TF},TF,Date:{now:()=>calls*1100+1000},setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout:()=>{},postMessage:data=>messages.push(data),importScripts:(...files)=>assert.equal(files.length,11),console};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../tm-worker.js','utf8'),context);
context.onmessage({data:{type:'init',config:{}}});
assert.equal(messages[0].type,'ready');
context.onmessage({data:{type:'finish'}});
let n=0;while(timers.length&&n++<5){timers.shift()()};
assert.equal(messages.at(-1).type,'done');assert.equal(messages.at(-1).report.score.home,1);
assert.ok(messages.some(x=>x.type==='snapshot'&&x.events?.some(e=>e.type==='goal')),'genuine event streamed');
assert.ok(messages.some(x=>x.type==='performance'&&x.metrics.ticksPerSecond>0),'actual physics throughput reported');
assert.equal(calls,3);console.log('PASS worker protocol: local module imports, engine snapshots, event streaming, full-time report');
