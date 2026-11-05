'use strict';
const assert=require('node:assert/strict');
const sim=require('../quick-sim.js');
const roles=['GK','DEF','DEF','DEF','DEF','MID','MID','MID','FWD','FWD','FWD'];
function team(id){
 return {id,tactic:id==='home'?'press':'possession',lineup:roles.map((pos,i)=>({
  id:id+'-'+i,name:id+' player '+i,pos,
  main:{finishing:68+i,sprintSpeed:69+i,shortPassing:67+i,firstTouch:70+i,
   vision:72+i,tackling:75+i},
  detail:{reflexes:70+i,handling:69+i,positioning:73+i,diving:68+i,
   kicking:71+i,composure:71+i,decisionMaking:72+i,strength:72+i}
 }))};
}
const preview={home:team('home'),away:team('away'),seed:'official-pse-set-piece-test'};
let corners=0,fouls=0,freeKicks=0,penalties=0,scores=0,misses=0;
for(let seed=0;seed<500;seed++){
 const key='PIECE-'+seed;
 const original=sim.simulate(preview,{seed:key});
 assert.deepEqual(sim.simulate(preview,{seed:key,setPieces:false}),original,
  'Default Quick Sim output must remain byte-for-byte compatible');
 const played=sim.simulate(preview,{seed:key,setPieces:'v1'});
 assert.equal(played.setPieceRules,'v1');
 assert.deepEqual(sim.simulate(preview,{seed:key,setPieces:'v1'}),played,
  'The same seed must produce exactly the same set-piece ledger');
 assert.equal(played.events.some(e=>!Number.isFinite(e.minute)||e.minute<0||e.minute>=90),false);
 assert.deepEqual(played.events.map(x=>x.minute),played.events.map(x=>x.minute).sort((a,b)=>a-b));
 for(const side of [0,1]){
  const stats=played.stats[side],opponent=played.stats[1-side],team=side?preview.away:preview.home;
  assert.equal(stats.goals,played.score[side]);
  assert(stats.shots>=stats.shotsOnTarget);
  assert.equal(stats.shotsOnTarget,stats.goals+opponent.saves);
  assert.equal(team.lineup.reduce((sum,p)=>sum+played.box[p.id].shots,0),stats.shots);
  assert.equal(team.lineup.reduce((sum,p)=>sum+played.box[p.id].shotsOnTarget,0),stats.shotsOnTarget);
  assert.equal(team.lineup.reduce((sum,p)=>sum+played.box[p.id].cornersTaken,0),stats.corners);
  assert.equal(team.lineup.reduce((sum,p)=>sum+played.box[p.id].freeKicksTaken,0),stats.freeKicks);
  assert.equal(team.lineup.reduce((sum,p)=>sum+played.box[p.id].penaltiesTaken,0),stats.penaltyKicks);
  assert.equal(played.events.filter(e=>e.type==='goal'&&e.team===team.id).length,stats.goals);
  assert.equal(played.events.filter(e=>e.type==='corner'&&e.team===team.id).length,stats.corners);
  assert.equal(played.events.filter(e=>e.type==='free-kick'&&e.team===team.id).length,stats.freeKicks);
  assert.equal(played.events.filter(e=>e.type==='penalty-kick'&&e.team===team.id).length,stats.penaltyKicks);
  assert.equal(played.events.filter(e=>e.type==='foul'&&e.team===team.id).length,stats.foulsCommitted);
 }
 for(const pk of played.events.filter(e=>e.type==='penalty-kick')){
  assert(['goal','saved','off-target'].includes(pk.outcome));
  assert.equal(played.events.filter(e=>e.type==='goal'&&e.setPiece==='penalty'&&e.team===pk.team&&e.player===pk.player&&e.minute===pk.minute).length,pk.outcome==='goal'?1:0);
  if(pk.outcome==='goal')scores++;else misses++;
 }
 for(const e of played.events.filter(e=>['corner','foul','free-kick','penalty-kick'].includes(e.type)))
  assert.equal(e.origin,'quick-sim');
 corners+=played.stats[0].corners+played.stats[1].corners;
 fouls+=played.stats[0].foulsCommitted+played.stats[1].foulsCommitted;
 freeKicks+=played.stats[0].freeKicks+played.stats[1].freeKicks;
 penalties+=played.stats[0].penaltyKicks+played.stats[1].penaltyKicks;
}
assert(corners>100&&fouls>100&&freeKicks>100&&penalties>5);
assert(scores>0&&misses>0,'Test both saved/missed and converted penalties');
console.log('PASS PSE opt-in set pieces: 500 deterministic full matches; '+corners+
 ' corners, '+fouls+' fouls, '+freeKicks+' free kicks, '+penalties+
 ' penalty kicks, no legacy output drift');
