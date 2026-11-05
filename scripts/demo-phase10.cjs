'use strict';
const quick=require('../quick-sim.js');
const director=require('../match-director/timeline.js');
const positions=['GK','DEF','DEF','DEF','DEF','MID','MID','MID','FWD','FWD','FWD'];
function team(id){
 return {id,name:id==='home'?'Pewter City FC':'Cerulean City FC',tactic:'balanced',
  lineup:positions.map((pos,i)=>({
   id:id+'-'+i,name:'Player '+(i+1),pos,
   main:{shortPassing:70,firstTouch:70,vision:70,sprintSpeed:70,tackling:70,finishing:70},
   detail:{positioning:70,strength:70,reflexes:70,handling:70,diving:70,kicking:70,decisionMaking:70}
  }))};
}
const fixture={seed:'phase10-demo',home:team('home'),away:team('away')};
const result=quick.simulate(fixture,{seed:'phase10-demo-v1'});
const plan=director.build(fixture,result,{seed:'phase10-demo-v1'});
director.validate(plan);
const fiveMinutes=director.eventsBetween(plan,0,5);
const firstEvent=plan.events[0]||null;
const clipStart=firstEvent?Math.floor(firstEvent.minute/5)*5:0;
const clip=director.eventsBetween(plan,clipStart,clipStart+5);
console.log(JSON.stringify({
 mode:'phase10-chunk1-shot-ledger-only',
 official:{score:plan.official.score,shots:plan.official.teams.map(x=>x.shots),
  onTarget:plan.official.teams.map(x=>x.shotsOnTarget),
  goals:plan.official.teams.map(x=>x.goals)},
 officialScoringEvents:plan.events.filter(e=>e.outcome==='goal').map(e=>({
  minute:e.minute,teamId:e.teamId,playerId:e.playerId,assistId:e.assistId
 })),
 openingFiveMinutes:{from:0,to:5,events:fiveMinutes},
 exampleFiveMinuteClip:{from:clipStart,to:clipStart+5,events:clip},
 scoreAtHalf:director.scoreAt(plan,45),
 scoreAtFull:director.scoreAt(plan,90),
 note:'Non-goal shot timestamps are reconstruction slots. No passes, tackles, or movement are scripted in this chunk.'
},null,2));
