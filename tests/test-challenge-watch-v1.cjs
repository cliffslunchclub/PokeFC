'use strict';
/* Integration test from locked Challenge -> watched TacticMesh controller ->
 * one-way Sim to End -> champion record -> local leaderboard.
 * TacticMesh controller is mocked; installed engine bridge & hybrid calculations
 * have their own authoritative integration tests. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const roster=[25,6,3,9,149,94,131,143,68,135,196];
const history=['Lorelei','Bruno','Agatha','Lance','Blue'].map((boss,i)=>({boss,round:i+1,score:[2,1],shots:[12,7],passes:[360,275],outcome:'Victory'}));
const state={version:1,phase:'locked',pool:9,legends:true,formation:'4-3-3',tactic:'press',roster,items:Array(11).fill(null),selected:0,rng:191121,
 locked:{roster,items:Array(11).fill(null),formation:'4-3-3',tactic:'press',score:85.7},round:5,history,result:null};
const store=new Map([['pokefc-challenge-alpha-1',JSON.stringify(state)]]);
const elements=new Map(),callbacks={};
let opened=0,closed=0,hybridCalls=0;
const paint={clearRect(){},fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){},fillText(){},
 set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){},set font(v){},set textAlign(v){}};
function el(id){
 if(!elements.has(id))elements.set(id,{
  value:id==='region'?'all':id==='watchSpeed'?'4':id==='tactic'?'press':'',innerHTML:'',textContent:'',hidden:false,disabled:false,
  events:{},addEventListener(key,fn){this.events[key]=fn},getContext(){return paint}
 });
 return elements.get(id);
}
const ctx=vm.createContext({window:{location:{search:'?challenge=1'},addEventListener(){}},URLSearchParams,console,Date,Math,
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
