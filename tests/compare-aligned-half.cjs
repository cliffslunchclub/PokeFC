#!/usr/bin/env node
/* Recompute Quick Sim expectations using genuine SAVED first-half report.
 * Never call the first-half file a calibrated full-time reference. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {performance}=require('node:perf_hooks'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),actual=require('../calibration/sinnoh-genuine-tm-first-half.json');
const scope={console,Math,Date,performance,window:null,document:{getElementById:()=>({addEventListener(){}}),querySelectorAll:()=>[],addEventListener(){}},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},confirm:()=>true,setTimeout:()=>{},Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL(){}}};scope.window=scope;vm.createContext(scope);
for(const file of ['species.js','calibration-profile.js','quick-sim.js','career.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),scope,{filename:file});
scope.FXI_TEST.create('classic',24,'BENCHMARK-90-MIN','rare');const preview=scope.FXI_TEST.getTacticalPreview();assert.equal(preview.home.name,actual.fixture.home);assert.equal(preview.away.name,actual.fixture.away);
const K=['goals','shots','passes','completedPasses','tackleAttempts','tackles','assists'];
const sums=Array.from({length:2},()=>Object.fromEntries(K.map(k=>[k,0]))),reps=5000;let winners=0;
for(let i=0;i<reps;i++){
 const s=scope.FXI_QUICK.simulate(preview,{seed:String(preview.seed)+'|half-calibration|'+i});
 for(let side=0;side<2;side++){
  const t=s.stats[side];assert(t.tackleAttempts>=t.tackles);for(const k of K){
   let value;
   if(k==='goals'||k==='assists'){value=s.events.filter(e=>e.type==='goal'&&e.minute<45&&String(e.team)===String(side===0?preview.home.id:preview.away.id)&&(k==='goals'||e.assist)).length;}
   else value=t[k]*.5;
   sums[side][k]+=value;
  }
 }
}
const teams=actual.originalTeamStats.map((t,side)=>({team:t.name,actual:Object.fromEntries(K.map(k=>[k,t.stats[k]])),quickExpected:Object.fromEntries(K.map(k=>[k,+(sums[side][k]/reps).toFixed(2)]))}));
const aggregate={};for(const k of K)aggregate[k]={tm:teams.reduce((s,t)=>s+t.actual[k],0),quick:+teams.reduce((s,t)=>s+t.quickExpected[k],0).toFixed(2)};
const result={kind:'event-definition-alignment-audit-v1',originalTacticMeshCommit:actual.sourceCommit,
 source:'saved-real-original-TacticMesh-46-minute-first-half',fullMatch:false,productionCalibrated:false,fixture:actual.fixture,
 quickSimReplicates:reps,quickModel:'provisional-with-tackle-attempt-events',
 tackleSuccessRateInTM:66/239,provisionalQuickAttemptWinProbability:scope.FXI_QUICK.TACKLE_WIN_RATE,
 definitions:{passes:'pass attempts',completedPasses:'passes received/controlled by a different teammate',shots:'shot attempts (NOT shots on target)',tackleAttempts:'all tackle challenges, including failed tackles, by any outfield position',tackles:'successful challenges only',goals:'official goal events',assists:'credited goal assistance',possession:'controlled-ball time percentage (TM); possession model estimate (Quick Sim)',shotsOnTarget:'not comparable: original TacticMesh value unavailable',saves:'not comparable: Quick Sim approximate saves versus TM shotStops'},
 teams,aggregate,
 warnings:['One observed TM half, including 1 minute of stoppage time vs 45-minute Quick Sim expectation; no production fitting.',
 'Quick Sim tackle attempts are modeled events, not real physics outcomes.',
 'Differences in metric frequency remain and require independent full-match references; aligning names/definitions does not eliminate them.']};
const dest=path.join(root,'calibration','aligned-first-half-comparison.json');fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({aggregate,winRate:(66/239).toFixed(3),destination:dest},null,2));
