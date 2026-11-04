#!/usr/bin/env node
/* Genuine first-half TacticMesh physics and 45-minute Quick Sim comparison.
 * Original engine source unchanged. This is an observational HALF, NOT a completed
 * regulation match; it MUST NOT be used as a full-match calibration reference.
 * Writes progress/checkpoints so it can resume if interrupted. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks'),{TextEncoder,TextDecoder}=require('node:util');
const root=path.resolve(__dirname,'..'),vendor=path.join(root,'tacticmesh','vendor');
const MODULES=['core','analysis','world','tactics','intelligence','physics','rules','telemetry','product-data','engine-facade','product-reports'];
const args=process.argv.slice(2),resume=args.includes('--resume');
if(args.some(a=>a!=='--resume'))throw Error('Usage: node tests/benchmark-45min.cjs [--resume]');
const dest=path.join(root,'calibration'),output=path.join(dest,'sinnoh-genuine-tm-first-half.json'),checkpointFile=path.join(dest,'sinnoh-first-half-checkpoint.json');
fs.mkdirSync(dest,{recursive:true});
const lock=JSON.parse(fs.readFileSync(path.join(root,'tacticmesh/source-lock.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(vendor,'installed.json'),'utf8'));
assert.equal(manifest.commit,lock.commit,'Original engine source commit mismatch');
for(const name of [...MODULES,'LICENSE','THIRD_PARTY_NOTICES.md']){
 const file=fs.readFileSync(path.join(vendor, (name==='LICENSE'||name==='THIRD_PARTY_NOTICES.md') ? name : name+'.js'));
 const blobSha=crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${file.length}\0`),file])).digest('hex');
 const expected=lock.files[name==='LICENSE'||name==='THIRD_PARTY_NOTICES.md'?name:'src/'+name+'.js'];
 assert.equal(blobSha,expected,'Original engine hash mismatch: '+name);
}
const doc={querySelectorAll:()=>[],getElementById:()=>({innerHTML:'',addEventListener(){}}),addEventListener(){}};
const scope={console,window:null,Math,Date,performance,TextEncoder,TextDecoder,document:doc,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},confirm:()=>true,setTimeout:()=>0,clearTimeout(){},Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL(){}}};
scope.window=scope;vm.createContext(scope);
const load=file=>vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),scope,{filename:file});
for(const f of ['species.js','calibration-profile.js','quick-sim.js','career.js','tm-engine-bridge.js'])load(f);
for(const mod of MODULES)load('tacticmesh/vendor/'+mod+'.js');
const franchise=scope.FXI_TEST,quick=scope.FXI_QUICK,TF=scope.TF;
franchise.create('classic',24,'BENCHMARK-90-MIN','rare');
const preview=franchise.getTacticalPreview();
const cfg=scope.FXI_TM.matchConfig(preview);
assert(TF.engine.validateMatchConfig(cfg).ok);
const franchiseBefore=JSON.stringify(franchise.state());
let handle,savedSeconds=0,priorMilestones=[];
if(resume){
 const saved=JSON.parse(fs.readFileSync(checkpointFile,'utf8'));
 assert.equal(saved.commit,lock.commit);assert.equal(saved.seed,cfg.seed);assert.equal(saved.matchId,cfg.matchId);
 handle=TF.engine.restoreCheckpoint(saved.checkpoint);
 savedSeconds=Number(saved.wallSeconds||0);priorMilestones=saved.milestones||[];
}else handle=TF.engine.createMatch(cfg);
const started=performance.now();let lastMinute=Math.floor(handle.match.clock.elapsedSeconds/300)*5;
const milestones=priorMilestones.slice();
const atomic=(file,obj)=>{const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(obj,null,2)+'\n');fs.renameSync(tmp,file)};
const writeCheckpoint=()=>atomic(checkpointFile,{commit:lock.commit,matchId:cfg.matchId,seed:cfg.seed,wallSeconds:savedSeconds+(performance.now()-started)/1000,milestones,checkpoint:TF.engine.saveCheckpoint(handle)});
console.log('ORIGINAL TACTICMESH 45-MIN HALF | '+preview.home.name+' vs '+preview.away.name);
console.log('Seed '+cfg.seed+' | commit '+lock.commit+' | original engine, real 60 Hz physics | 22 Pokémon');
if(resume)console.log('Resuming from '+(handle.match.clock.elapsedSeconds/60).toFixed(1)+' game minutes');
const MAX_TICKS=55*60*60; // genuine halftime may include several minutes of stoppage timelet iterations=0;
try{
 while(handle.status!=='half-time'){
  const before=handle.match.tick;
  const result=TF.engine.stepMatch(handle,600);
  if(result.status==='error'||result.status==='cancelled')throw Error('Engine status '+result.status);
  if(handle.match.tick===before)throw Error('Engine made no progress at tick '+before);
  if(handle.match.tick>MAX_TICKS)throw Error('Exceeded half-time safety budget');
  iterations++;
  const current=Math.floor((handle.match.clock.elapsedSeconds+0.00001)/300);
  if(current>lastMinute){
   lastMinute=current;
   const msg={minute:+(handle.match.clock.elapsedSeconds/60).toFixed(3),ticks:handle.match.tick,score:{...handle.match.score},wallSeconds:+(savedSeconds+(performance.now()-started)/1000).toFixed(3)};
   milestones.push(msg);console.log(`[${msg.minute.toFixed(1)}'] ${msg.ticks} ticks, ${msg.wallSeconds.toFixed(1)}s wall, score ${msg.score.home}-${msg.score.away}`);
   writeCheckpoint();
  }
  if(iterations>300)throw Error('Iterations exceed safety budget');
 }
 assert.equal(handle.match.clock.period,1,'Expected first period');
 assert(handle.match.state.halfTime,'Engine must reach its genuine halftime status');
 assert(handle.match.clock.elapsedSeconds>=2700-1e-4,'Premature halftime');
 assert(handle.match.clock.elapsedSeconds<3301,'Unexpected added half length');
 const real=TF.productReports.reduce(handle),elapsed=(performance.now()-started)/1000;
 assert(real.consistency,'Goal event history must match authoritative score');
 assert.deepEqual([real.score.home,real.score.away],[handle.match.score.home,handle.match.score.away]);
 const goalEvents=real.events.filter(e=>e.type==='goal');
 assert.equal(goalEvents.length,real.score.home+real.score.away);
 const teamStats=real.teams.map(t=>({id:t.id,name:t.name,stats:t.stats}));
 // One complete Quick Sim run covers 90 minutes. Expected rates over a half
 // are 0.5 of its match totals; for goals use actual first-45 event timestamps.
 const count=5000,numeric=['goals','shots','passes','completedPasses','tackleAttempts','tackles','assists'];
 const sums=[Object.fromEntries(numeric.map(k=>[k,0])),Object.fromEntries(numeric.map(k=>[k,0]))];
 const firstHalfScoreFrequency={};let scoreMean=[0,0],scoreSq=[0,0];
 const simStart=performance.now();
 for(let i=0;i<count;i++){
  const sim=quick.simulate(preview,{seed:String(preview.seed)+'|half-calibration|'+i});
  const halfScores=[0,0];
  for(const event of sim.events){if(event.type==='goal'&&event.minute<45){const side=String(event.team)===String(preview.home.id)?0:1;halfScores[side]++}}
  const scoreKey=halfScores.join('-');firstHalfScoreFrequency[scoreKey]=(firstHalfScoreFrequency[scoreKey]||0)+1;
  for(let side=0;side<2;side++){
   assert.equal(sim.stats[side].goals,sim.score[side]);
   assert(sim.stats[side].passes>=sim.stats[side].completedPasses);
   assert(sim.stats[side].tackleAttempts>=sim.stats[side].tackles);
   const s=sim.stats[side];
   const fields={goals:halfScores[side],shots:s.shots*.5,passes:s.passes*.5,completedPasses:s.completedPasses*.5,tackleAttempts:s.tackleAttempts*.5,tackles:s.tackles*.5,assists:sim.events.filter(e=>e.type==='goal'&&e.minute<45&&e.assist&&String(e.team)===String(side===0?preview.home.id:preview.away.id)).length};
   for(const k of numeric)sums[side][k]+=fields[k];
   scoreMean[side]+=halfScores[side];scoreSq[side]+=halfScores[side]**2;
  }
 }
 const quickWall=(performance.now()-simStart)/1000;
 const compare=teamStats.map((t,side)=>{
  const ref=t.stats,mean=Object.fromEntries(numeric.map(k=>[k,+(sums[side][k]/count).toFixed(3)]));
  return {team:t.name,tacticmesh:Object.fromEntries(numeric.map(k=>[k,ref[k]])),tacticmeshPossessionPct:ref.possessionPercent,quickSimExpectedFirstHalf:mean,differenceTMminusQuick:Object.fromEntries(numeric.map(k=>[k,+(ref[k]-mean[k]).toFixed(3)]))};
 });
 assert.equal(franchiseBefore,JSON.stringify(franchise.state()),'Benchmark cannot modify franchise');
 const outputData={kind:'genuine-TacticMesh-first-half-comparison',sourceCommit:lock.commit,engine:'unchanged-original-TacticMesh',completed90Minutes:false,completedFirstHalf:true,calibrationEligibleFullMatch:false,
 fixture:{home:preview.home.name,away:preview.away.name,seed:cfg.seed,matchId:cfg.matchId,clubId:24},
 gameMinutes:+(handle.match.clock.elapsedSeconds/60).toFixed(4),ticks:handle.match.tick,status:handle.status,
 score:real.score,goalEvents:goalEvents.map(e=>({time:e.time,minute:e.minute,teamId:e.teamId,scorerId:e.scorerId,assistId:e.assistId,scorerName:e.scorerName})),
 elapsedWallSeconds:+(elapsed+savedSeconds).toFixed(3),quickSimReplicates:count,quickSimWallSeconds:+quickWall.toFixed(3),
 originalTeamStats:teamStats,originalPlayers:real.players,engineEventCount:real.events.length,originalEngineEvents:real.events,
 comparison:compare,quickFirstHalfScoreProbabilities:Object.fromEntries(Object.entries(firstHalfScoreFrequency).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([k,n])=>[k,+(n/count*100).toFixed(2)])),
 checkpoints:milestones,goalLedgerConsistent:real.consistency,franchiseUnchanged:true,
 methodNotes:['This is a real 45-minute first half including original physics/AI; it is not a full regulation match or official complete match report.',
 'The halftime statistics are calculated by the unmodified upstream productReports.reduce() event ledger.',
 'Quick Sim currently simulates 90 minutes; for shots/passes/tackle attempts/tackles the 45-minute expected count is half of the 90-minute count; goals/assists use simulated goal timestamps in minutes 0–44.',
 'Only one TacticMesh half, so differences are exploratory and should not yet be fitted to production calibration parameters.',
 'TacticMesh shotsOnTarget and keeper shotStops are not directly comparable to Quick Sim estimates.']};
 atomic(output,outputData);
 atomic(path.join(dest,'sinnoh-first-half-engine-checkpoint.json'),{sourceCommit:lock.commit,fixture:outputData.fixture,checkpoint:TF.engine.saveCheckpoint(handle)});
 if(fs.existsSync(checkpointFile))fs.unlinkSync(checkpointFile);
 console.log('HALFTIME COMPLETE | '+real.score.home+'-'+real.score.away+' | '+handle.match.tick+' original ticks | '+(elapsed+savedSeconds).toFixed(2)+' sec wall');
 for(const x of compare){console.log(x.team+' :: TM '+JSON.stringify(x.tacticmesh)+' :: Quick expected '+JSON.stringify(x.quickSimExpectedFirstHalf))}
 console.log('Saved '+output+' and resumable halftime checkpoint. Production Quick Sim remains unchanged.');
}catch(e){
 writeCheckpoint();console.error('PARTIAL / FAILED at '+(handle.match.clock.elapsedSeconds/60).toFixed(2)+' minutes: '+(e.stack||e));process.exitCode=1;
}
