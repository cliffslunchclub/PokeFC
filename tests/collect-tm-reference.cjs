/* Collect authentic TacticMesh 90-minute reference matches offline.
 * No Quick Sim, synthetic inputs or accelerated match clocks.
 * Uses local pinned original engine; outputs calibrated *data*, not a profile.
 * WARNING: each full match can take many CPU minutes. Resume from checkpoints. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),vendor=path.join(root,'tacticmesh','vendor');
const {REFERENCE_FORMAT,SOURCE_COMMIT,validateReference,verifyCollection,digest}=require('../calibration-fit.js');
const modules=['core','analysis','world','tactics','intelligence','physics','rules','telemetry','product-data','engine-facade','product-reports'];
const opts=process.argv.slice(2);
if(opts.some(x=>!/^--(start|count)=\d+$/.test(x))){console.error('Usage: node tests/collect-tm-reference.cjs [--start=0] [--count=1]');process.exit(2)}
function flag(name,def){const s=opts.find(x=>x.startsWith('--'+name+'='));return s?Number(s.split('=')[1]):def}
const start=flag('start',0),count=flag('count',1);
if(start<0||count<1||count>100||start>100000)throw Error('Invalid reference collection range');
if(!fs.existsSync(path.join(vendor,'installed.json')))throw Error('Install original engine first: python3 tacticmesh/install_engine.py');
const manifest=JSON.parse(fs.readFileSync(path.join(vendor,'installed.json'),'utf8'));
if(manifest.commit!==SOURCE_COMMIT)throw Error('Engine source commit differs from pinned calibration baseline');
const sourceLock=JSON.parse(fs.readFileSync(path.join(root,'tacticmesh','source-lock.json'),'utf8'));
if(sourceLock.commit!==SOURCE_COMMIT)throw Error('Pinned original Git commit differs from source-lock.json');
function gitBlobHash(b){return crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex')}
for(const m of modules){const filename=m+'.js',b=fs.readFileSync(path.join(vendor,filename));
 if(crypto.createHash('sha256').update(b).digest('hex')!==manifest.files[filename]||gitBlobHash(b)!==sourceLock.files['src/'+filename])throw Error('Official TacticMesh pinned source hash mismatch: '+filename);
}
const records=path.join(root,'calibration','references'),checks=path.join(root,'calibration','checkpoints'),reports=path.join(root,'calibration','reports');
for(const dir of [records,checks,reports])fs.mkdirSync(dir,{recursive:true});
const mockDoc={querySelectorAll:()=>[],getElementById:()=>({innerHTML:'',addEventListener:()=>{}}),addEventListener:()=>{}};
const kv={},ctx={document:mockDoc,localStorage:{getItem:k=>kv[k]||null,setItem:(k,v)=>kv[k]=v,removeItem:k=>delete kv[k]},console,Math,Date,
 confirm:()=>true,alert:()=>{},setTimeout:()=>0,clearTimeout:()=>{},Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},TextEncoder,TextDecoder};
ctx.window=ctx;vm.createContext(ctx);
function load(file){vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file})}
load('species.js');load('quick-sim.js');load('career.js');load('tm-engine-bridge.js');
for(const m of modules)load('tacticmesh/vendor/'+m+'.js');
const TF=ctx.TF;
for(let i=start;i<start+count;i++){
 const id='tm-'+String(i).padStart(5,'0'),target=path.join(records,id+'.json'),reportPath=path.join(reports,id+'.json'),checkpoint=path.join(checks,id+'.json');
 if(fs.existsSync(target)){
  if(!fs.existsSync(reportPath))throw Error('Existing '+id+' lacks its original TacticMesh report; refusing to skip');
  verifyCollection(JSON.parse(fs.readFileSync(target,'utf8')),JSON.parse(fs.readFileSync(reportPath,'utf8')));
  console.log('Already verified against raw official report, skipping '+id);continue
 }
 ctx.FXI_TEST.create(i%2?'random':'classic',(i%4)*8+(Math.floor(i/4)%8),`FXI-TM-REF-${i}`,'off');
 const preview=ctx.FXI_TEST.getTacticalPreview();if(!preview)throw Error('No franchise fixture to compare');
 const config=ctx.FXI_TM.matchConfig(preview);
 let h;
 if(fs.existsSync(checkpoint)){
  const saved=JSON.parse(fs.readFileSync(checkpoint,'utf8'));
  if(saved.engineCommit!==SOURCE_COMMIT||saved.matchId!==config.matchId||saved.seed!==config.seed)throw Error('Checkpoint is for a different engine fixture');
  h=TF.engine.restoreCheckpoint(saved.checkpoint);console.log('Resumed '+id+' at '+(h.match.clock.elapsedSeconds/60).toFixed(1)+' game min');
 }else h=TF.engine.createMatch(config);
 const begin=Date.now();let previous=h.match.tick,status='running',nextUpdate=Math.max(5,Math.ceil((h.match.clock.elapsedSeconds/60+1e-8)/5)*5);
 let checkpointBucket=Math.floor((h.match.clock.elapsedSeconds/60)/15);
 console.log('Collecting AUTHENTIC 90-min reference '+id+': '+preview.home.name+' vs '+preview.away.name);
 for(let iter=0;iter<900;iter++){
  const r=TF.engine.stepMatch(h,600);status=r.status;
  if(status==='half-time')TF.engine.continueAfterHalfTime(h);
  if(status==='error'||status==='cancelled')throw Error('Official engine failed during '+id+': '+status);
  if(h.match.tick===previous&&status!=='completed')throw Error('Engine stalled during '+id+' at tick '+h.match.tick);
  previous=h.match.tick;
  const mins=h.match.clock.elapsedSeconds/60;
  if(mins>=nextUpdate){console.log(id+': '+mins.toFixed(1)+' game min; '+((Date.now()-begin)/1000).toFixed(1)+'s wall; score '+h.match.score.home+'-'+h.match.score.away);nextUpdate+=5;}
  if(mins>=15&&Math.floor((mins+1e-6)/15)>checkpointBucket){
   checkpointBucket=Math.floor((mins+1e-6)/15);
   const data={engineCommit:SOURCE_COMMIT,matchId:config.matchId,seed:config.seed,checkpoint:TF.engine.saveCheckpoint(h)};
   const tmp=checkpoint+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data));fs.renameSync(tmp,checkpoint);
  }
  if(status==='completed')break;
 }
 if(status!=='completed')throw Error('Original physics match did not reach full time; no reference saved');
 const official=TF.productReports.fromMatch(h);
 if(!official.complete||official.status!=='completed')throw Error('Official report incomplete');
 const snap=JSON.parse(JSON.stringify(preview));
 const reference={format:REFERENCE_FORMAT,verified:true,fullMatch:true,engineCommit:SOURCE_COMMIT,engineBuild:official.engineBuild,
  referenceId:id,matchId:config.matchId,seed:config.seed,elapsedSeconds:official.durationSeconds,
  preview:{seed:snap.seed,home:snap.home,away:snap.away},
  teamStats:official.teams.map(t=>({teamId:t.id,goals:t.stats.goals,shots:t.stats.shots,passes:t.stats.passes,
   completedPasses:t.stats.completedPasses,tackleAttempts:t.stats.tackleAttempts,tackles:t.stats.tackles,assists:t.stats.assists,possessionPercent:t.stats.possessionPercent,
   shotStops:t.stats.shotStops,shotsOnTarget:null})),
  goalEvents:official.events.filter(e=>e.type==='goal').map(e=>({teamId:e.teamId,scorerId:e.scorerId,assistId:e.assistId,time:e.time})),
  limitations:'Shot stops are not conventional saves; shots on target unavailable. Validated TacticMesh event-based report only.'};
 validateReference(reference);
 reference.verification={source:'pinned-local-tacticmesh-physics',reportSha256:digest(official),payloadSha256:digest(reference)};
 verifyCollection(reference,official);
 const reportTmp=reportPath+'.tmp';fs.writeFileSync(reportTmp,JSON.stringify(official,null,2)+'\n');fs.renameSync(reportTmp,reportPath);
 const tmp=target+'.tmp';fs.writeFileSync(tmp,JSON.stringify(reference,null,2)+'\n');fs.renameSync(tmp,target);
 if(fs.existsSync(checkpoint))fs.unlinkSync(checkpoint);
 console.log('VERIFIED 90-minute match '+id+' '+official.score.home+'-'+official.score.away+' in '+((Date.now()-begin)/1000).toFixed(1)+'s wall. Saved '+target);
}
console.log('Reference collection complete. Fit only when >=8 real full-time references exist: node tests/fit-profile.cjs');
