#!/usr/bin/env node
/* Genuine original TacticMesh partial-match diagnostic vs 90-minute Quick Sim Monte Carlo.
 * This diagnostic NEVER creates a calibration reference, never shortens TacticMesh's
 * full-match clock, and never activates a calibration profile. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {performance}=require('node:perf_hooks');
const {TextEncoder,TextDecoder}=require('node:util');
const ROOT=path.resolve(__dirname,'..');
const argv=process.argv.slice(2);
if(argv.some(a=>!/^--(club|minutes|replicates|out)=/.test(a))){console.error('Usage: node tests/diagnose-quick-vs-tm.cjs [--club=24] [--minutes=5] [--replicates=2000] [--out=calibration/diagnostic.json]');process.exit(2)}
const flag=(k,d)=>{const s=argv.find(a=>a.startsWith('--'+k+'='));return s?s.slice(k.length+3):d};
const club=Number(flag('club','24')), minutes=Number(flag('minutes','5')),reps=Number(flag('replicates','2000'));
const out=path.resolve(ROOT,flag('out','calibration/diagnostic.json'));
if(!Number.isInteger(club)||club<0||club>31||!Number.isFinite(minutes)||minutes<.25||minutes>15||!Number.isInteger(reps)||reps<50||reps>20000)throw Error('Require club 0–31, 0.25–15 minutes, 50–20,000 replicates');
const original=path.join(ROOT,'tacticmesh','vendor');
const modules=['core','analysis','world','tactics','intelligence','physics','rules','telemetry','product-data','engine-facade','product-reports'];
const manifest=JSON.parse(fs.readFileSync(path.join(original,'installed.json'),'utf8'));
const lock=JSON.parse(fs.readFileSync(path.join(ROOT,'tacticmesh','source-lock.json'),'utf8'));
if(manifest.commit!==lock.commit)throw Error('Original TacticMesh commit is not the locked version');
for(const name of modules){const filename=name+'.js',bytes=fs.readFileSync(path.join(original,filename));
 const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 const sha1=crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
 if(sha256!==manifest.files[filename]||sha1!==lock.files['src/'+filename])throw Error('Original TacticMesh file mismatch: '+name);
}
const env={window:null,document:{querySelectorAll:()=>[],getElementById:()=>({innerHTML:'',addEventListener:()=>{}}),addEventListener:()=>{}},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console,Math,Date,TextEncoder,TextDecoder,performance,confirm:()=>true,alert:()=>{},setTimeout:()=>0,clearTimeout:()=>{},Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}}};
env.window=env;vm.createContext(env);
const load=f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),env,{filename:f});
for(const f of ['species.js','calibration-profile.js','quick-sim.js','career.js','tm-engine-bridge.js'])load(f);
for(const m of modules)load(`tacticmesh/vendor/${m}.js`);
const franchise=env.FXI_TEST, quick=env.FXI_QUICK,TF=env.TF;
franchise.create('classic',club,'BENCHMARK-90-MIN','rare');
const preview=franchise.getTacticalPreview();assert(preview&&preview.home.lineup.length===11&&preview.away.lineup.length===11);
const config=env.FXI_TM.matchConfig(preview),before=JSON.stringify(franchise.state());
const fixture={home:preview.home.name,away:preview.away.name,club,matchId:config.matchId,seed:config.seed};
console.log(`GENUINE TM diagnostic: ${fixture.home} vs ${fixture.away}; official 60 Hz AI/physics for ${minutes} real game minutes, not a full match.`);
const engine=TF.engine.createMatch(config),start=performance.now();
const target=minutes*60;let iter=0,lastTick=0;
while(engine.match.clock.elapsedSeconds+1e-7<target){
 const result=TF.engine.stepMatch(engine,600);iter++;
 if(result.status==='half-time')TF.engine.continueAfterHalfTime(engine);
 if(result.status==='cancelled'||result.status==='error'||engine.match.tick===lastTick)throw Error('Original engine stalled/failed');
 lastTick=engine.match.tick;
 if(result.status==='completed')break;
 if(iter>100)throw Error('Exceeded diagnostic safety limit');
}
const wall=performance.now()-start;
const real=TF.productReports.reduce(engine), observed=real.teams.map(t=>({team:t.name,teamId:t.id,
 goals:t.stats.goals,shots:t.stats.shots,passes:t.stats.passes,completedPasses:t.stats.completedPasses,
 tackles:t.stats.tackles,assists:t.stats.assists,possessionPercent:t.stats.possessionPercent}));
assert(real.consistency,'TacticMesh actual goal events disagree with score');
assert.deepEqual([observed[0].goals,observed[1].goals],[engine.match.score.home,engine.match.score.away]);
assert(engine.match.tick>=target*60-60,'Real ticks lower than requested segment');
console.log(`Real TM: ${engine.match.clock.elapsedSeconds.toFixed(1)} sec, ${engine.match.tick} ticks, ${(wall/1000).toFixed(2)} sec CPU wall, score ${real.score.home}-${real.score.away}`);
const keys=['goals','shots','passes','completedPasses','tackles','assists'];
const sums=[{},{}],sq=[{},{}];for(let side=0;side<2;side++)for(const k of [...keys,'possessionPercent']){sums[side][k]=0;sq[side][k]=0}
const scoreCount={};let exactPriorScore=0,validReports=0;
const qStart=performance.now();
for(let rep=0;rep<reps;rep++){
 const sim=quick.simulate(preview,{seed:String(preview.seed)+'|audit|'+rep});
 const sc=sim.score.join('-');scoreCount[sc]=(scoreCount[sc]||0)+1;if(sc==='0-3')exactPriorScore++;
 for(let side=0;side<2;side++){
  const s=sim.stats[side];const vals={...s,assists:sim.events.filter(e=>String(e.team)===String(side===0?preview.home.id:preview.away.id)&&e.assist).length,possessionPercent:s.possession};
  assert(s.goals===sim.score[side]&&s.passes>=s.completedPasses&&s.shots>=s.shotsOnTarget);
  for(const k of Object.keys(sums[side])){sums[side][k]+=vals[k];sq[side][k]+=vals[k]*vals[k]}
 }
 validReports++;
}
const qWall=performance.now()-qStart,ratio=engine.match.clock.elapsedSeconds/5400;
const byTeam=observed.map((o,side)=>{const sim={};for(const k of Object.keys(sums[side])){
 const mean=sums[side][k]/reps,variance=Math.max(0,sq[side][k]/reps-mean*mean);
 sim[k]={per90:+mean.toFixed(3),perObservedMinutes:k==='possessionPercent'?null:+(mean*ratio).toFixed(3),stdDev90:+Math.sqrt(variance).toFixed(3)};
 }return {team:o.team,originalTacticMeshObserved:o,quickSimMonteCarlo:sim}});
const result={format:'fxi-quick-vs-tm-diagnostic-v1',sourceCommit:lock.commit,
 engineMode:'verified-unmodified-original',
 provenance:{realTacticMeshTicks:engine.match.tick,realTacticMeshSeconds:engine.match.clock.elapsedSeconds,realTacticMeshStatus:engine.status,fullMatch:false,calibrationEligible:false,goalEventConsistent:real.consistency},
 fixture,parametersStatus:quick.profile().status,replicates:reps,wallSeconds:{realTM:+(wall/1000).toFixed(3),quickSimBatch:+(qWall/1000).toFixed(3)},
 observations:byTeam,allScoreProbabilities:Object.fromEntries(Object.entries(scoreCount).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([sc,n])=>[sc,+(n/reps*100).toFixed(2)])),
 historicalScoreReference:{score:'0-3',source:'earlier FUTBOL XI completed benchmark discussion (NOT saved original official report)',monteCarloExactScorePct:+(exactPriorScore/reps*100).toFixed(2)},
 limitations:['One shortened observational WINDOW of genuine full-speed TacticMesh physics, NOT a shortened match rule','Rate-normalized comparison is exploratory because events are clustered over a match','Possession percentages are definitions of different estimators; treat as diagnostic only','No TacticMesh full-match report included; no parameter fitting and no calibration activation'],
 franchiseUnchanged:before===JSON.stringify(franchise.state()),validQuickSimReports:validReports};
assert(result.franchiseUnchanged);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(`Quick Sim: ${reps} completed matches in ${(qWall/1000).toFixed(3)} sec; saved ${out}`);
for(const team of byTeam){const a=team.originalTacticMeshObserved,b=team.quickSimMonteCarlo;console.log(`${team.team}: observed ${minutes}m TM shots=${a.shots} passes=${a.passes} tackles=${a.tackles}, quick expected same minutes shots=${b.shots.perObservedMinutes} passes=${b.passes.perObservedMinutes} tackles=${b.tackles.perObservedMinutes}`)}
console.log('CALIBRATION: not activated. Need multiple VERIFIED official 90-minute match reports before tuning parameters.');
