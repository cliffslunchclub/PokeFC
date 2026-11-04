'use strict';
const assert=require('node:assert/strict');
const {finish}=require('../hybrid-sim.js');
const starter=(side,i)=>({id:`${side}p${i}`,species:`Pokemon${side}${i}`,pos:i===0?'GK':i<5?'DEF':i<8?'MID':'FWD',
 main:{sprintSpeed:72+i,shortPassing:66+i,firstTouch:65+i,vision:69+i,tackling:67+i,finishing:62+i},
 detail:{strength:65,reflexes:78,positioning:77,handling:75,diving:72,kicking:71,decisionMaking:67,composure:68}});
const preview={seed:'seed:1',fixtureIndex:0,season:1,home:{id:1,tactic:'press',lineup:Array.from({length:11},(_,i)=>starter('h',i))},away:{id:2,tactic:'counter',lineup:Array.from({length:11},(_,i)=>starter('a',i))}};
const list=[...preview.home.lineup,...preview.away.lineup];
const partial={origin:'tacticmesh',tick:226800,elapsedSeconds:3780,period:2,score:{home:2,away:1},
 teams:[{id:'1',stats:{shots:8,shotsOnTarget:null,shotStops:3,passes:240,completedPasses:160,tackleAttempts:21,tackles:7,possessionSeconds:1500,possessionPercent:57}},{id:'2',stats:{shots:4,shotsOnTarget:null,shotStops:2,passes:190,completedPasses:110,tackleAttempts:17,tackles:5,possessionSeconds:1000,possessionPercent:43}}],
 players:list.map((p,i)=>({id:p.id,teamId:i<11?'1':'2',minutes:63,active:true,stamina:.65,stats:{goals:0,assists:0,shotStops:0,tackleAttempts:i===6?10:0,tackles:i===6?4:0,shots:0,yellowCards:0,redCards:0}})),
 events:[{type:'goal',minute:10,team:1,player:'hp8',assist:'hp6'}, {type:'goal',minute:35,team:2,player:'ap8',assist:'ap6'}, {type:'goal',minute:58,team:1,player:'hp9',assist:'hp7'}]};
// Make an immutable prefix including the per-player TacticMesh counters.
const by=new Map(partial.players.map(p=>[p.id,p]));
for(const e of partial.events){by.get(e.player).stats.goals++;by.get(e.assist).stats.assists++}
by.get('hp6').stats.yellowCards=1;
// Send off a striker at minute 40; no future goals or minutes are permitted.
by.get('ap10').active=false;by.get('ap10').sentOff=true;by.get('ap10').minutes=40;by.get('ap10').stats.redCards=1;
const saved=JSON.stringify(partial),a=finish(preview,partial),b=finish(preview,partial);
assert.equal(JSON.stringify(a),JSON.stringify(b),'same prefix must always yield identical continuation');
assert.equal(JSON.stringify(partial),saved,'handoff input must remain immutable');
assert.equal(a.origin,'hybrid');assert.equal(a.handoff.minute,63);assert.deepEqual(a.handoff.score,[2,1]);
assert.ok(a.score[0]>=2&&a.score[1]>=1,'existing score cannot decrease');
assert.equal(a.box.hp8.goals>=1,true);assert.equal(a.box.hp6.assists>=1,true);
assert.equal(a.box.hp6.yellowCards,1,'preserve yellow card');assert.equal(a.box.ap10.redCards,1,'preserve red card');
assert.equal(a.box.ap10.minutes,40,'sent-off player cannot gain minutes');assert.equal(a.box.ap10.active,false);
assert.ok(a.events.slice(0,3).every(e=>e.origin==='tacticmesh'));
assert.equal(a.events.filter(e=>e.type==='goal'&&String(e.team)==='1').length,a.score[0]);
assert.equal(a.events.filter(e=>e.type==='goal'&&String(e.team)==='2').length,a.score[1]);
assert.ok(a.events.filter(e=>e.origin==='quick-continuation').every(e=>e.minute>=63&&e.minute<=90),'Quick Sim may not rewrite earlier timeline');
assert.ok(a.stats[0].shots>=8&&a.stats[1].shots>=4,'shots accumulate');
assert.equal(a.stats[0].shotsOnTarget,null,'do not fabricate unsupported TacticMesh metric');
assert.ok(a.stats.every(x=>x.possession>=0&&x.possession<=100),'possession is a percentage');
assert.ok(Math.abs(a.stats[0].possession+a.stats[1].possession-100)<.2,'team possession adds to 100 percent');
assert.ok(a.box.hp1.minutes>=89.999&&a.box.hp1.minutes<=90.001,'active starters complete the 90-minute model');
assert.ok(a.box.hp6.tackles>=4,'existing defensive actions preserved');
assert.ok(a.box.hp6.tackleAttempts>=10,'existing challenge attempts preserved');
assert.ok(a.stats[0].tackleAttempts>=21&&a.stats[1].tackleAttempts>=17,'existing team challenge attempts preserved');
assert.ok(a.stats.every(s=>s.tackles<=s.tackleAttempts),'tackles won cannot exceed attempts');
assert.equal(a.stats[0].goals,a.score[0]);
assert.throws(()=>finish(preview,{...partial,score:{home:3,away:1}}),/events do not match/);
assert.throws(()=>finish(preview,{...partial,teams:[{id:'2'}, {id:'1'}]}),/teams differ/);
const nearEnd={...partial,elapsedSeconds:5400,tick:324000};
const last=finish(preview,nearEnd);assert.deepEqual(last.score,[2,1]);assert.equal(last.box.hp1.minutes,63);
console.log('PASS hybrid: atomic 63-minute continuation, immutable score and goal ledger, sent-off exclusions, card/XP stats, deterministic simulation, result merge, invalid state rejection');
