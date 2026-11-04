const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const posted=[],timers=[];
const starters=[];for(const side of ['home','away'])for(let i=0;i<11;i++)starters.push({id:side+'-eng-'+i,sourceId:side+'-poke-'+i,sourceTeamId:side==='home'?'2':'4',teamId:'eng-'+side,active:true,sentOff:false,stamina:.68});
const byId=Object.fromEntries(starters.map(p=>[p.id,p]));
const match={id:'full-unique-match',seed:412,tick:226800,clock:{elapsedSeconds:3780,period:2},score:{home:2,away:1},
 events:[{type:'goal',time:600,teamId:'eng-home',scorerId:'home-eng-8'}],teams:[{id:'eng-home',sourceId:'2'},{id:'eng-away',sourceId:'4'}],playersById:byId};
let advances=0;
const TF={createEventCursor:()=>({read:()=>[]}),engine:{
 validateMatchConfig:()=>({ok:true}),createMatch:()=>({match}),
 readSnapshot:()=>({players:starters.map(p=>({id:p.sourceId,teamId:p.sourceTeamId,position:{x:50,y:30},active:p.active})),ball:{x:40,y:33},score:match.score,elapsedSeconds:3780,period:2,status:'running',phase:'open-play'}),
 stepMatch:()=>{advances++;return{status:'running'}}
},productReports:{fromMatch:()=>{throw Error('not done')},reduce:()=>({consistency:true,
 teams:[{id:'2',stats:{shots:8,passes:300,shotStops:1}},{id:'4',stats:{shots:6,passes:260,shotStops:2}}],
 players:starters.map(p=>({id:p.id,sourceId:p.sourceId,teamId:p.sourceTeamId,minutes:63,stats:{goals:p.id==='home-eng-8'?2:p.id==='away-eng-8'?1:0,assists:0,shotStops:0,redCards:0,yellowCards:0}})),
 events:[{type:'goal',time:600,teamId:'2',scorerId:'home-eng-8',minute:'10'},
 {type:'goal',time:960,teamId:'4',scorerId:'away-eng-8',minute:'16'},
 {type:'goal',time:3000,teamId:'2',scorerId:'home-eng-8',minute:'50'},
 {type:'card',time:3120,teamId:'4',playerId:'away-eng-10',card:'yellow',minute:'52'}]
 })}};
const context={self:{TF},TF,Date,postMessage:v=>posted.push(v),setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout:()=>{},importScripts:(...files)=>assert.equal(files.length,11)};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../tm-worker.js','utf8'),context);
context.onmessage({data:{type:'init',config:{}}});assert.equal(posted[0].type,'ready');
context.onmessage({data:{type:'handoff'}});
const result=posted.at(-1);assert.equal(result.type,'handoff');assert.equal(result.partial.origin,'tacticmesh');
assert.equal(result.partial.players.length,22);assert.equal(result.partial.score.home,2);assert.equal(result.partial.score.away,1);
assert.equal(result.partial.events.filter(e=>e.type==='goal').length,3);assert.equal(result.partial.events.at(-1).card,'yellow');
assert.equal(result.partial.events[0].player,'home-poke-8');assert.equal(advances,0,'no further physics ticks after handoff');
assert.equal(result.partial.elapsedSeconds,3780);assert.equal(result.snapshot.elapsedSeconds,3780);
console.log('PASS TacticMesh worker handoff: atomic freeze, 22 source players, proper goal/assist/card IDs, accurate scores and clock, no additional engine steps');
