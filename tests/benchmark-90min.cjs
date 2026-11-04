#!/usr/bin/env node
/*
 * FUTBOL XI / TacticMesh 90-minute local performance and integrity benchmark.
 * Uses the actual v0.8 four-region franchise generator and upstream TacticMesh physics/AI,
 * NOT the game's instant Quick Sim. No saves/deployment/network writes.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {performance} = require('node:perf_hooks');
const {createHash} = require('node:crypto');
const {TextEncoder,TextDecoder} = require('node:util');
const ROOT = path.resolve(__dirname, '..');
const ENGINE_MODE = process.argv.includes('--engine=optimized') ? 'optimized' : 'vendor';
const VENDOR = path.join(ROOT, 'tacticmesh', ENGINE_MODE);
const MODULES = ['core','analysis','world','tactics','intelligence','physics','rules','telemetry','product-data','engine-facade','product-reports'];
const ARTIFACT = path.join(ROOT,'benchmark-90min-results.json');
const PROFILE_ARTIFACT = path.join(ROOT,'benchmark-profile-results.json');
const CHECKPOINT_ARTIFACT = path.join(ROOT,'benchmark-90min-checkpoint.json');
const args=process.argv.slice(2);
const profileArg=args.find(x=>x.startsWith('--profile-seconds='));
const clubArg=args.find(x=>x.startsWith('--club='));
const clubId=clubArg?Number(clubArg.split('=')[1]):24;
const profileSeconds=profileArg?Number(profileArg.split('=')[1]):null;
const saveContinuously=args.includes('--checkpoint')||args.includes('--resume');
const resume=args.includes('--resume');
if (args.some(x=>!['--checkpoint','--resume'].includes(x)&&!x.startsWith('--profile-seconds=')&&!x.startsWith('--club=')&&x!=='--engine=optimized')) {
 console.error('Usage: node tests/benchmark-90min.cjs [--club=24] [--profile-seconds=60] [--checkpoint] [--resume]');process.exit(2);
}
if (profileSeconds!=null&&(!Number.isFinite(profileSeconds)||profileSeconds<1||profileSeconds>5400||saveContinuously)) {
 console.error('Profile seconds must be between 1 and 5400, and cannot be combined with checkpoint/resume.');process.exit(2);
}

if(!Number.isInteger(clubId)||clubId<0||clubId>=32){console.error('Club must be an integer 0–31');process.exit(2)}
const MINUTES = 90;
const TICK_RATE = 60;
const EXPECTED_REGULATION_TICKS = MINUTES * 60 * TICK_RATE;
const MAX_TICKS = EXPECTED_REGULATION_TICKS + 56000; // bounded stoppage allowance; still fail safely
const PROGRESS_INTERVAL = 1;
const fmtSecs = n => `${(n/1000).toFixed(1)} s`;
const fmtClock = n => `${Math.floor(n/1000/60)}m ${Math.floor(n/1000%60)}s`;
function die(message) { console.error('BENCHMARK SETUP ERROR: '+message); process.exit(2); }
if (!fs.existsSync(path.join(VENDOR,'installed.json'))) {
 die('TacticMesh is not installed. Run: python3 tacticmesh/install_engine.py (or use --source /local/tacticmesh).');
}
const manifest = JSON.parse(fs.readFileSync(path.join(VENDOR,'installed.json'),'utf8'));
for (const mod of MODULES) {
 const fp=path.join(VENDOR,mod+'.js');
 if (!fs.existsSync(fp) || !manifest.files[mod+'.js']) die('Missing verified module: '+mod+'.js');
 const digest=createHash('sha256').update(fs.readFileSync(fp)).digest('hex');
 if (digest!==manifest.files[mod+'.js']) die('Modified or corrupted source module: '+mod+'.js');
}
const el = {app:{innerHTML:''},exportBtn:{addEventListener(){}},importFile:{addEventListener(){}}};
const fakeDocument = {
 querySelectorAll(){return []}, getElementById(id){return el[id]||null},
 addEventListener(){}
};
const store = {};
const localStorage = {getItem(k){return store[k]||null},setItem(k,v){store[k]=String(v)},removeItem(k){delete store[k]}};
const browser = {document:fakeDocument,localStorage,console,confirm:()=>true,
 setTimeout:()=>0,clearTimeout:()=>{},Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},
 TextEncoder,TextDecoder,Math,Date,performance};
browser.window = browser;
vm.createContext(browser);
function load(file){vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),browser,{filename:file});}
// Use the same data and lineup routines as the browser franchise game.
load('species.js');load('quick-sim.js');load('career.js');load('tm-engine-bridge.js');
const test=browser.FXI_TEST,bridge=browser.FXI_TM;
assert(test && bridge, 'Franchise/bridge APIs must exist');
test.create('classic',clubId,'BENCHMARK-90-MIN', 'rare');
const preview=test.getTacticalPreview();
assert(preview && preview.home.lineup.length===11 && preview.away.lineup.length===11);
assert.equal(test.state().week,0);
const config=bridge.matchConfig(preview);
// Read upstream modules unchanged: no simplified engine, fake snapshots, or altered clock.
for (const mod of MODULES) load('tacticmesh/'+ENGINE_MODE+'/'+mod+'.js');
const TF=browser.TF;
// Lightweight instrumentation of the *original*, unchanged engine methods.
// Wrappers measure runtime without changing the computed simulation.
const segments={tacticsMs:0,aiMs:0,worldMs:0};
for(const [key,field] of [['updateTactics','tacticsMs'],['updateAI','aiMs'],['updateWorld','worldMs']]){
 const method=TF[key];assert.equal(typeof method,'function','Engine subsystem missing: '+key);
 TF[key]=function(...params){const start=performance.now();try{return method.apply(this,params)}finally{segments[field]+=performance.now()-start}};
}
assert(TF.engine && TF.productReports && TF.createCore, 'Original engine APIs must load');
const validated=TF.engine.validateMatchConfig(config);
if(!validated.ok)die('Real Pokémon fixture rejected by TacticMesh: '+JSON.stringify(validated.errors));
console.log(`REAL 90-MIN TEST | ${preview.home.name} vs ${preview.away.name}`);
console.log(`Official engine source commit: ${(manifest.commit || manifest.sourceCommit)}`);
console.log(`Fixture ID: ${config.matchId} | Seed: ${config.seed} | 22 actual Pokémon starters`);
console.log('Running genuine TacticMesh AI/physics at 60 ticks/second. No Quick Sim and no match-clock shortcuts.');
let savedWallSeconds=0,oldMilestones=[];
let handle;
if(resume){
 if(!fs.existsSync(CHECKPOINT_ARTIFACT))die('No local checkpoint exists. Start without --resume.');
 const saved=JSON.parse(fs.readFileSync(CHECKPOINT_ARTIFACT,'utf8'));
 if(saved.sourceCommit!==(manifest.commit || manifest.sourceCommit)||saved.matchId!==config.matchId||saved.seed!==config.seed)
  die('Saved checkpoint belongs to a different engine source or fixture.');
 handle=TF.engine.restoreCheckpoint(saved.checkpoint);
 savedWallSeconds=Number(saved.totalWallSeconds)||0;
 oldMilestones=Array.isArray(saved.milestones)?saved.milestones:[];
 console.log('Resumed genuine TacticMesh checkpoint at minute '+(handle.match.clock.elapsedSeconds/60).toFixed(2));
}else handle=TF.engine.createMatch(config);
const begin=performance.now(),milestones=oldMilestones.slice();
let next=Math.floor((handle.match.clock.elapsedSeconds||0)/60)+PROGRESS_INTERVAL,
 lastStatus='running',iterations=0,stopReason='';
let lastCheckpointMinute=Math.floor((handle.match.clock.elapsedSeconds||0)/900)*15;
let current=(handle.match.clock.elapsedSeconds||0)/60;
function profileTotals(){const wall=performance.now()-begin;
 return {tacticsMs:Number(segments.tacticsMs.toFixed(2)),aiMs:Number(segments.aiMs.toFixed(2)),worldMs:Number(segments.worldMs.toFixed(2)),
  totalWallMs:Number(wall.toFixed(2)),otherMs:Number(Math.max(0,wall-segments.tacticsMs-segments.aiMs-segments.worldMs).toFixed(2))};
}
function writeCheckpoint(){const totalWallSeconds=savedWallSeconds+(performance.now()-begin)/1000;
 const data={format:'futbol-xi-engine-benchmark-checkpoint-v1',sourceCommit:(manifest.commit || manifest.sourceCommit),engineMode:ENGINE_MODE,
   matchId:config.matchId,seed:config.seed,totalWallSeconds:Number(totalWallSeconds.toFixed(3)),
   milestones,checkpoint:TF.engine.saveCheckpoint(handle)};
 const pending=CHECKPOINT_ARTIFACT+'.tmp';fs.writeFileSync(pending,JSON.stringify(data));fs.renameSync(pending,CHECKPOINT_ARTIFACT);
}

try{
 while(iterations<MAX_TICKS/600+10){
  const prev=handle.match.tick;
  const state=TF.engine.stepMatch(handle,600);
  if(state.status==='half-time')TF.engine.continueAfterHalfTime(handle);
  else if(state.status==='error'||state.status==='cancelled')throw Error('Engine stopped: '+state.status);
  const newTick=handle.match.tick;
  if(newTick===prev && state.status!=='completed' && state.status!=='half-time')throw Error('Engine tick stalled at '+newTick);
  if(newTick>MAX_TICKS)throw Error('Match exceeded safety tick budget '+MAX_TICKS);
  lastStatus=state.status;
  iterations++;
  current=(handle.match.clock.elapsedSeconds||0)/60;
  while(current>=next && next<=MINUTES){
   const ms=performance.now()-begin+savedWallSeconds*1000;
   milestones.push({minute:next,ticks:newTick,wallSeconds:Number((ms/1000).toFixed(3))});
   console.log(`[${String(next).padStart(2)}'] wall ${fmtClock(ms)} | ${newTick.toLocaleString()} ticks | score ${handle.match.score.home}-${handle.match.score.away}`);
   next+=PROGRESS_INTERVAL;
  }
  if(saveContinuously&&current>=lastCheckpointMinute+15&&!handle.match.state.halfTime){
    writeCheckpoint();lastCheckpointMinute=Math.floor(current/15)*15;
    console.log('Saved resumable full-engine checkpoint at '+current.toFixed(1)+' minutes');
  }
  if(profileSeconds!=null&&handle.match.clock.elapsedSeconds>=profileSeconds){stopReason='profiled';break;}
  if(state.status==='completed'){stopReason='completed';break;}
 }
 if(stopReason==='profiled'){
  const wallSeconds=(performance.now()-begin)/1000;
  const output={test:'FUTBOL XI genuine TacticMesh limited-duration profile',
   checkpointHash:createHash('sha256').update(JSON.stringify(TF.engine.saveCheckpoint(handle))).digest('hex'),
   complete90Minutes:false,verifiedFullMatch:false,sourceCommit:(manifest.commit || manifest.sourceCommit),engineMode:ENGINE_MODE,
   fixture:{home:preview.home.name,away:preview.away.name,matchId:config.matchId,seed:config.seed},
   gameMinutes:Number(current.toFixed(3)),ticks:handle.match.tick,wallSeconds:Number(wallSeconds.toFixed(3)),
   ticksPerWallSecond:Math.round(handle.match.tick/Math.max(.001,wallSeconds)),
   score:handle.match.score,events:handle.match.events.length,profile:profileTotals(),milestones};
  fs.writeFileSync(PROFILE_ARTIFACT,JSON.stringify(output,null,2)+'\n');
  console.log('PROFILE COMPLETE: '+current.toFixed(2)+' genuine game minutes, not a full 90-minute pass.');
  console.log('Subsystem timings (ms): '+JSON.stringify(output.profile));
  console.log('Output: benchmark-profile-results.json');
  process.exit(0);
 }
 if(stopReason!=='completed')throw Error('Match did not finish before iteration budget');
 const official=TF.productReports.fromMatch(handle);
 assert(official.complete && official.status==='completed', 'Full TacticMesh official report incomplete');
 // This also validates goal attribution and translates the report back to FUTBOL XI.
 const translated=bridge.translate({
  complete:official.complete,status:official.status,score:official.score,
  teams:official.teams.map(t=>({id:t.id,stats:t.stats})),
  players:official.players.map(p=>({id:p.id,sourceId:p.sourceId,minutes:p.minutes,stats:p.stats,rating:p.rating})),
  events:official.events.filter(e=>e.type==='goal'),engineBuild:official.engineBuild,ratingModelVersion:official.ratingModelVersion
 },preview);
 assert.equal(JSON.stringify(translated.score),JSON.stringify([official.score.home,official.score.away]));
 assert.equal(translated.events.length,official.score.home+official.score.away,'Goals must have real events');
 assert.equal(test.state().week,0,'Benchmark must not commit result to franchise');
 const end=performance.now(),runDuration=(end-begin)/1000,duration=savedWallSeconds+runDuration;
 const stats=official.teams.map(t=>({id:t.id,name:t.name,goals:t.stats.goals,shots:t.stats.shots,
  passes:t.stats.passes,completedPasses:t.stats.completedPasses,possPct:t.stats.possessionPercent,
  tackles:t.stats.tackles,shotStops:t.stats.shotStops,corners:t.stats.corners}));
 const report={test:'FUTBOL XI 90-minute genuine TacticMesh match',verified:true,version:'v0.8',
  sourceCommit:(manifest.commit || manifest.sourceCommit),engineMode:ENGINE_MODE,fixture:{home:preview.home.name,away:preview.away.name,matchId:config.matchId,seed:config.seed},
  period:handle.match.clock.period,gameMinutes:Number(current.toFixed(3)),ticks:handle.match.tick,
  expectedRegulationTicks:EXPECTED_REGULATION_TICKS,wallSeconds:Number(duration.toFixed(3)),
  ticksPerWallSecond:Math.round(handle.match.tick/duration),runWallSeconds:Number(runDuration.toFixed(3)),
  profile:profileTotals(),score:official.score,
  goals:translated.events.length,events:official.events.length,players:official.players.length,
  teamStats:stats,playerOfMatch:official.playerOfMatch,milestones};
 fs.writeFileSync(ARTIFACT,JSON.stringify(report,null,2)+'\n');
 if(fs.existsSync(CHECKPOINT_ARTIFACT))fs.unlinkSync(CHECKPOINT_ARTIFACT);
 console.log(`\nPASS: Full match ${official.score.home}-${official.score.away} | ${handle.match.tick.toLocaleString()} ticks | ${fmtClock(end-begin)} wall time`);
 console.log('Goals, score and Pokémon match report verified; no franchise standings committed.');
 console.log('Output: benchmark-90min-results.json');
}catch(e){
 const elapsed=(performance.now()-begin)/1000;
 const report={test:'FUTBOL XI 90-minute genuine TacticMesh match',verified:false,
  sourceCommit:(manifest.commit || manifest.sourceCommit),engineMode:ENGINE_MODE,gameMinutes:current,ticks:handle.match.tick,
  wallSeconds:Number((elapsed+savedWallSeconds).toFixed(3)),reason:String(e&&e.stack||e),status:lastStatus,profile:profileTotals(),milestones};
 fs.writeFileSync(ARTIFACT,JSON.stringify(report,null,2)+'\n');
 console.error('\nFAIL: '+e.message+' | '+current.toFixed(2)+' game minutes | '+fmtClock(elapsed*1000));
 console.error('Diagnostics saved to benchmark-90min-results.json');
 process.exitCode=1;
}
