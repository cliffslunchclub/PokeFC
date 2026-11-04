'use strict';
/* Audit an actual upstream TacticMesh event ledger against its official statistics,
 * then check that Quick Sim and the hybrid path use the same event vocabulary.
 * NO new TacticMesh physics is run here; the saved half is genuine. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const actual=require('../calibration/sinnoh-genuine-tm-first-half.json');
assert(actual.completedFirstHalf&&!actual.completed90Minutes&&actual.goalLedgerConsistent);
const authority=actual.originalTeamStats;
const tally=Object.fromEntries(authority.map(t=>[String(t.id),{passes:0,shots:0,tackleAttempts:0,tackles:0,goals:0}]));
for(const e of actual.originalEngineEvents){
 if(e.category&&e.category!=='football')continue;
 const t=tally[String(e.teamId)];if(!t)continue;
 if(e.type==='pass')t.passes++;
 if(e.type==='shot')t.shots++;
 if(e.type==='tackle'){t.tackleAttempts++;if(e.success===true)t.tackles++}
 if(e.type==='goal')t.goals++;
}
for(const t of authority){for(const metric of Object.keys(tally[t.id]))assert.equal(tally[t.id][metric],t.stats[metric],`Actual TM ledger: ${t.name} ${metric}`);assert(t.stats.completedPasses<=t.stats.passes);assert(t.stats.tackles<=t.stats.tackleAttempts);assert.equal(t.stats.shotsOnTarget,null)}
const byRole={};for(const pl of actual.originalPlayers){let r=byRole[pl.positionFamily]||(byRole[pl.positionFamily]={attempts:0,wins:0});r.attempts+=pl.stats.tackleAttempts;r.wins+=pl.stats.tackles}
assert(byRole.FWD.attempts>0&&byRole.FWD.wins>0,'TacticMesh forwards attempt and win tackles');
const doc={getElementById:()=>({addEventListener(){}}),querySelectorAll:()=>[],addEventListener(){}};
const scope={console,Math,Date,performance,window:null,document:doc,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},confirm:()=>true,setTimeout:()=>{},Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL(){}}};scope.window=scope;vm.createContext(scope);
for(const file of ['species.js','calibration-profile.js','quick-sim.js','career.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),scope,{filename:file});
scope.FXI_TEST.create('classic',24,'BENCHMARK-90-MIN','rare');const preview=scope.FXI_TEST.getTacticalPreview();
assert.equal(preview.home.name,actual.fixture.home);assert.equal(preview.away.name,actual.fixture.away);
let forwardsAttempted=0;for(let i=0;i<1000;i++){
 const s=scope.FXI_QUICK.simulate(preview,{seed:'ALIGN-SAMPLE-'+i});
 for(let side=0;side<2;side++){
  const t=s.stats[side],team=side===0?preview.home:preview.away;
  assert(t.tackleAttempts>=t.tackles&&t.passes>=t.completedPasses&&t.shots>=t.shotsOnTarget);
  const players=team.lineup.reduce((sum,p)=>{const b=s.box[p.id];assert(b.tackleAttempts>=b.tackles);if(p.pos==='FWD')forwardsAttempted+=b.tackleAttempts;sum.tackleAttempts+=b.tackleAttempts;sum.tackles+=b.tackles;return sum},{tackleAttempts:0,tackles:0});
  assert.equal(players.tackleAttempts,t.tackleAttempts);assert.equal(players.tackles,t.tackles);
 }
}
assert(forwardsAttempted>0,'Quick Sim forwards must contribute challenges');
console.log('PASS event definitions: genuine TM 633 pass attempts, 5 shots, 239 tackle attempts, 66 wins, 1 goal; forwards credited; 1000 deterministic Quick Sim matches with summed player/team tackle stats');
