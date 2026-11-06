'use strict';
// Integration test: only PSE-authored set pieces may reach the Watch/reports.
const assert=require('node:assert/strict');
const qs=require('../quick-sim.js'),bridge=require('../watch/soccerjs/watch-bridge.js');
const {motionFrame}=require('../watch/soccerjs/phase10-motion.cjs');
require('../challenge/match-report.js');
const report=globalThis.PFC_MATCH_REPORT;
const roles=['GK','DEF','DEF','DEF','DEF','MID','MID','MID','FWD','FWD','FWD'];
function team(id){
 return {id,name:id+' Gym FC',tactic:'press',lineup:roles.map((pos,i)=>({
  id:id+'-'+i,name:'Pokémon '+id+'-'+i,pos,main:{
   finishing:68+i,shortPassing:72+i,vision:71+i,sprintSpeed:75+i,firstTouch:71+i,tackling:76+i},
  detail:{strength:75,reflexes:72,positioning:73,handling:74,diving:75,kicking:73,decisionMaking:72,composure:70}
 }))};
}
const preview={home:team('home'),away:team('away'),seed:'pse-fixture'};
const field={width:106,height:68};let seen=0,goals=0,poses=0,corners=0,penalties=0,converted=0;
for(let i=0;i<120;i++){
 const result=qs.simulate(preview,{seed:'INTEGRATION-'+i,setPieces:'v1'});
 const raw=JSON.stringify(result);
 const fixture=bridge.snapshot(preview,result);
 assert.equal(fixture.setPieceRules,'v1');
 assert.deepEqual(bridge.scoreAt(fixture,90),result.score);
 assert.deepEqual(bridge.scoreAt(fixture,0),[0,0]);
 assert.equal(fixture.events.length,result.events.length,'Never silently drop official PSE events');
 assert.deepEqual(fixture.events.map(e=>e.id),result.events.map(e=>e.id),'Keep official event identity');
 assert.equal(new Set(fixture.events.map(e=>e.id)).size,fixture.events.length);
 assert.equal(fixture.events.filter(e=>e.type==='goal').length,result.score[0]+result.score[1]);
 assert.equal(fixture.events.filter(e=>e.type==='shot').length,result.stats[0].shots+result.stats[1].shots);
 for(const type of ['corner','foul','free-kick','penalty-kick']){
  assert.equal(fixture.events.filter(e=>e.type===type).length,result.events.filter(e=>e.type===type).length);
 }
 const parsed=report.fromResult(result,preview);
 assert.equal(parsed.status,'complete');
 assert.equal(parsed.setPieceRules,'v1');
 assert.equal(parsed.timeline.length,result.events.length);
 assert.equal(parsed.goals.length,result.score[0]+result.score[1]);
 const rendered=report.renderGroupedTimeline(parsed.timeline);
 for(const type of ['corner','foul','free-kick','penalty-kick']){
  if(result.events.some(e=>e.type===type))
   assert(rendered.includes({corner:'CORNER',foul:'FOUL','free-kick':'FREE KICK','penalty-kick':'PENALTY KICK'}[type]));
 }
 for(const e of fixture.events.filter(x=>['corner','free-kick','penalty-kick'].includes(x.type))){
  const collisions=fixture.events.filter(x=>
   ['corner','free-kick','penalty-kick','goal'].includes(x.type)&&
   x!==e&&Math.abs(x.minute-e.minute)<.3);
  if(collisions.length)continue;
  const frame=motionFrame(fixture,Math.min(89.995,e.minute+.02),field);
  assert.equal(frame.officialEvent?.id,e.id,'Illustrative scene must anchor to an official event');
  assert(frame.action.startsWith('official-'));
  assert.equal(frame.illustrative,false);
  poses++;
 }
 for(const e of fixture.events.filter(e=>e.type==='goal'&&e.setPiece==='penalty')){
  const side=e.team===fixture.home.id?0:1;
  const moment=motionFrame(fixture,e.minute,field);
  assert.equal(moment.action,'official-penalty-kick','Converted match penalty should finish shot at goal timestamp');
  assert.equal(moment.officialEvent?.outcome,'goal');
  assert((moment.ball.x-(side===0?field.width:0))*(side===0?1:-1)>.5,
   'Converted penalty ball stops before end line');
  const keeper=moment.actors[(1-side)*11];
  assert((moment.ball.x-keeper.x)*(side===0?1:-1)>2,
   'Converted penalty must pass the goalkeeper');
  assert(Math.abs(moment.ball.y-keeper.y)>2,'Keeper must miss converted penalty');
  converted++;
 }
 for(const e of fixture.events){
  if(e.causedBy){
   const parent=fixture.events.find(x=>x.id===e.causedBy);
   assert(parent,'Missing cause for event '+e.id);
   assert(parent.minute<=e.minute);
  }
 }
 corners+=result.stats[0].corners+result.stats[1].corners;
 penalties+=result.stats[0].penaltyKicks+result.stats[1].penaltyKicks;
 goals+=result.score[0]+result.score[1];
 assert.equal(JSON.stringify(result),raw,'Watch/Match Report must not mutate official result');
 seen++;
}
assert(poses>50&&corners>50&&penalties>0&&goals>0&&converted>0);
const old=qs.simulate(preview,{seed:'LEGACY-COMPAT'});
const oldFixture=bridge.snapshot(preview,old);
assert.equal(oldFixture.setPieceRules,undefined);
assert(oldFixture.events.every(e=>e.type==='goal'||e.type==='save'),
 'Legacy exports only existing official goals and goalkeeper saves');
assert.deepEqual(bridge.scoreAt(oldFixture,90),old.score);
assert.equal(report.fromResult(old,preview).setPieceRules,undefined);
const valid=qs.simulate(preview,{seed:'INTEGRATION-0',setPieces:'v1'});
const altered=JSON.parse(JSON.stringify(valid));
altered.events.find(e=>e.type==='corner').id=''; 
assert.throws(()=>bridge.snapshot(preview,altered),/event ID/);
console.log('PASS PSE Watch/report integration:',seen,'full matches;',corners,
 'official corners;',penalties,'regulation penalties;',poses,'validated set-piece poses');
