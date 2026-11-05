'use strict';
/* Integration test from locked Challenge -> watched TacticMesh controller ->
 * one-way Sim to End -> champion record -> local leaderboard.
 * TacticMesh controller is mocked; installed engine bridge & hybrid calculations
 * have their own authoritative integration tests. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const playHtml=fs.readFileSync(path.join(root,'play/index.html'),'utf8');
assert.match(playHtml,/<h3>MATCH TIMELINE<\/h3>/,'Play labels the shared event feed as one Match Timeline');
assert.equal((playHtml.match(/id="liveEventFeed"/g)||[]).length,1,'Exactly one persistent match event timeline');
assert.doesNotMatch(playHtml,/RECORDED MATCH TIMELINE|LIVE MATCH EVENTS/,'No duplicate event section headings');
const roster=[25,6,3,9,149,94,131,143,68,135,196];
const history=['Lorelei','Bruno','Agatha','Lance','Blue'].map((boss,i)=>({boss,round:i+1,score:[2,1],shots:[12,7],passes:[360,275],outcome:'Victory'}));
const state={version:1,phase:'locked',pool:9,legends:true,formation:'4-3-3',tactic:'press',roster,items:Array(11).fill(null),selected:0,rng:191121,
 locked:{roster,items:Array(11).fill(null),formation:'4-3-3',tactic:'press',score:85.7},round:5,history,result:null};
const store=new Map([['pokefc-challenge-alpha-1',JSON.stringify(state)]]);
const elements=new Map(),callbacks={};
let opened=0,closed=0,hybridCalls=0,liveFixture=null;
const paint={clearRect(){},fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){},fillText(){},
 set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){},set font(v){},set textAlign(v){}};
function el(id){
 if(!elements.has(id))elements.set(id,{
  value:id==='region'?'all':id==='watchSpeed'?'4':id==='tactic'?'press':'',innerHTML:'',textContent:'',hidden:false,disabled:false,
  events:{},addEventListener(key,fn){this.events[key]=fn},getContext(){return paint}
 });
 return elements.get(id);
}
const ctx=vm.createContext({window:{location:{search:'?challenge=1&watch=tacticmesh'},addEventListener(){}},URLSearchParams,console,Date,Math,
 document:{getElementById:el},
 localStorage:{getItem:key=>store.get(key)||null,setItem:(k,v)=>store.set(k,v)}});
for(const file of ['national-species.js','calibration-profile.js','quick-sim.js','play/opponents.js','challenge/special-items-data.js','challenge/leaderboard.js','challenge/match-report.js']){
 vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file,timeout:20000});
}
ctx.window.FXI_TM={
 installed:async()=>true,
 connect(fixture,h){
  assert.equal(fixture.challengeRound,5);assert.equal(fixture.opponent.leader,'Red');
  assert.equal(fixture.home.lineup.length,11);
  assert.equal(fixture.home.tactic,'press');
  liveFixture=fixture;
  Object.assign(callbacks,h);
  return {
   play(){opened++},pause(){},speed(){},close(){closed++},
   handoff(){
    callbacks.handoff({elapsedSeconds:45*60}, {score:[1,0],players:[],ball:{x:50,y:34},elapsedSeconds:45*60});
   }
  };
 }
};
ctx.window.FXI_HYBRID={
 finish(fixture,partial){
  hybridCalls++;
  assert.equal(fixture.challengeRound,5);
  assert.equal(partial.elapsedSeconds,2700);
  return {origin:'hybrid',handoff:{minute:45},score:[3,1],stats:[{shots:10,passes:330},{shots:5,passes:205}],events:[
   {type:'goal',team:fixture.home.id,player:fixture.home.lineup[9].id,assist:fixture.home.lineup[8].id,minute:12.4,minuteLabel:'13',origin:'tacticmesh'},
   {type:'goal',team:fixture.away.id,player:fixture.away.lineup[5].id,minute:36.2,minuteLabel:'37',origin:'tacticmesh'},
   {type:'goal',team:fixture.home.id,player:fixture.home.lineup[10].id,minute:66.4,minuteLabel:'67',origin:'quick-continuation'},
   {type:'goal',team:fixture.home.id,player:fixture.home.lineup[7].id,assist:fixture.home.lineup[9].id,minute:82.1,minuteLabel:'83',origin:'quick-continuation'}
  ]};
 }
};
vm.runInContext(fs.readFileSync(path.join(root,'play/play.js'),'utf8'),ctx,{filename:'play/play.js',timeout:15000});
(async()=>{
 await el('watch').events.click();
 await Promise.resolve();
 assert(callbacks.ready,'TacticMesh engine callbacks registered');
 callbacks.ready({score:[0,0],players:[],ball:{x:52,y:34},elapsedSeconds:0});
 assert.equal(opened,1,'Watched match started');
 const liveSnapshot={score:[1,0],players:[],ball:{x:50,y:34},elapsedSeconds:31*60};
 const streamed=[
  {type:'goal',minute:12.4,team:liveFixture.home.id,player:liveFixture.home.lineup[9].id,origin:'tacticmesh'},
  {type:'foul',minute:18.2,team:liveFixture.away.id,player:liveFixture.away.lineup[5].id,origin:'tacticmesh'},
  {type:'card',minute:23.2,team:liveFixture.away.id,player:liveFixture.away.lineup[5].id,card:'yellow',origin:'tacticmesh'},
  {type:'substitution',minute:30.2,team:liveFixture.home.id,playerOff:liveFixture.home.lineup[8].id,
   playerOn:liveFixture.home.lineup[7].id,origin:'tacticmesh'}
 ];
 callbacks.snapshot(liveSnapshot,streamed);
 assert.equal(el('liveEventCount').textContent,'4 RECORDED','Match Center shows four verified streamed events');
 assert.match(el('liveEventFeed').innerHTML,/data-timeline-group="goals" open/,'Goal timeline defaults expanded during live play');
 assert.match(el('liveEventFeed').innerHTML,/data-timeline-group="other"/,'Saves and incidents can be expanded');
 assert.doesNotMatch(el('liveEventFeed').innerHTML,/data-timeline-group="other" open/,'Secondary timeline defaults minimized');

 for(const label of ['GOAL','FOUL','YELLOW CARD','SUBSTITUTION'])
  assert.match(el('liveEventFeed').innerHTML,new RegExp(label),'Live commentary includes '+label);
 callbacks.snapshot(liveSnapshot,streamed);
 assert.equal(el('liveEventCount').textContent,'4 RECORDED','Repeat engine snapshots do not duplicate feed entries');
 assert.equal(el('simRemaining').disabled,false,'Sim to End enabled');
 el('simRemaining').events.click();
 assert.equal(hybridCalls,1,'One hybrid continuation');
 assert.equal(closed,1,'Worker closed after handoff');
 const final=JSON.parse(store.get('pokefc-challenge-alpha-1'));
 assert.equal(final.phase,'finished','Winning Red ends six-match gauntlet');
 assert.equal(final.result.boss,'Red');
 assert.equal(final.result.origin,'hybrid');
 assert.equal(final.result.report.status,'complete','Watched + simulated goal events preserved');
 assert.equal(final.result.report.goals.length,4);
 assert.equal(final.result.report.timeline.length,4,'Handoff saves exact source-labeled timeline to Challenge');
 assert.deepEqual(Array.from(final.result.report.timeline.map(e=>e.origin)),['tacticmesh','tacticmesh','quick-continuation','quick-continuation']);
 assert.equal(el('liveEventCount').textContent,'4 RECORDED','Unified Match Timeline contains all final events');
 assert.match(el('liveEventFeed').innerHTML,/Jolteon/,'Completed timeline shows scorer details');
 assert.doesNotMatch(el('liveEventFeed').innerHTML,/SIM TO END|WATCHED|QUICK SIM|pfc-event-origin/,'Per-event source labels are not displayed');
 assert.doesNotMatch(el('matchResult').innerHTML,/RECORDED MATCH TIMELINE|class="event-feed"/,'Result summary does not duplicate Match Timeline');
 assert.match(el('modeTag').textContent,/WATCH → SIM/,'Match-level source context remains visible');
 assert.equal(final.result.report.goals[0].minuteLabel,'13');
 assert.equal(final.result.report.goals[0].origin,'tacticmesh');
 assert.equal(final.result.report.goals[2].origin,'quick-continuation');
 assert.equal(final.result.report.goals[0].player,'Jolteon');
 assert.equal(final.history.length,6);
 assert.equal(final.history.filter(m=>m.outcome==='Victory').length,6);
 assert.equal(final.locked.score,85.7);
 assert.equal(el('matchClock').textContent,'FULL TIME');
 assert.equal(el('returnChallenge').hidden,false);
 const board=ctx.window.PFC_CHALLENGE_LEADERBOARD;
 const entries=board.rankings('national-legends',{getItem:k=>store.get(k)||null});
 assert.equal(entries.length,1);
 assert.equal(entries[0].champion,true);
 assert.equal(entries[0].wins,6);
 assert.equal(entries[0].teamScore,85.7);
 // Completed run can no longer be started as a locked challenge via Play.
 assert.equal(ctx.window.PFC_PLAY.getXI(),null);
 console.log('PASS watched Challenge -> 45m TacticMesh prefix -> hybrid Sim to End -> Red victory -> six-boss champion leaderboard');
})().catch(e=>{console.error(e);process.exitCode=1});
