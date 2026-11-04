'use strict';
/* Synthetic fixtures in unit-test memory ONLY. They are never saved as calibration. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const fit=require('../calibration-fit.js');
const lock=require('../tacticmesh/source-lock.json');
assert.equal(lock.commit,fit.SOURCE_COMMIT);
assert.equal(Object.keys(lock.files).length,13);
assert.equal(crypto.createHash('sha1').update('blob 6\0hello\n').digest('hex'),'ce013625030ba8dba906f756967f9e9ca394464a');
const players=pos=>[{id:pos+'-gk',pos:'GK'},...Array.from({length:10},(_,i)=>({id:pos+'-'+i,pos:i<4?'DEF':i<7?'MID':'FWD'}))];
const preview={seed:'UNIT-ONLY',home:{id:'home',lineup:players('home')},away:{id:'away',lineup:players('away')}};
const events=[{type:'goal',teamId:'home',scorerId:'tm-h-p-1',assistId:null,time:1200}];
const official={format:'tacticmesh-result',complete:true,status:'completed',shortenedForTesting:false,halfSeconds:2700,
 engineBuild:'UNIT-SYNTHETIC-NOT-REAL',matchId:'UNIT-PROVENANCE',seed:'UNIT-ONLY',durationSeconds:5400,
 teamSnapshots:[{id:'home'},{id:'away'}],events,teams:[
  {id:'home',stats:{goals:1,shots:11,passes:320,completedPasses:260,tackles:12,assists:0,possessionPercent:53}},
  {id:'away',stats:{goals:0,shots:9,passes:290,completedPasses:220,tackles:16,assists:0,possessionPercent:47}}
 ]};
const raw={format:fit.REFERENCE_FORMAT,verified:true,fullMatch:true,engineCommit:fit.SOURCE_COMMIT,
 engineBuild:official.engineBuild,referenceId:'UNIT-PROVENANCE',matchId:official.matchId,seed:official.seed,
 elapsedSeconds:5400,preview,teamStats:official.teams.map(t=>({teamId:t.id,...t.stats})),
 goalEvents:events.map(e=>({teamId:e.teamId,scorerId:e.scorerId,assistId:e.assistId,time:e.time}))};
const reference={...raw,verification:{source:'pinned-local-tacticmesh-physics',reportSha256:fit.digest(official),payloadSha256:fit.digest(raw)}};
assert.equal(fit.verifyCollection(reference,official),reference);
assert.throws(()=>fit.verifyCollection({...reference,verification:undefined},official),/lacks pinned local/);
assert.throws(()=>fit.verifyCollection(reference,{...official,shortenedForTesting:true}),/full official/);
assert.throws(()=>fit.verifyCollection(reference,{...official,teams:official.teams.map((t,i)=>i?{...t,stats:{...t.stats,passes:291}}:t)}),/checksum mismatch/);
const altered={...reference,teamStats:reference.teamStats.map((t,i)=>i?{...t,passes:t.passes+1}:t)};
assert.throws(()=>fit.verifyCollection(altered,official),/payload checksum mismatch/);
altered.verification={...reference.verification,payloadSha256:fit.digest({...altered,verification:undefined})};
assert.throws(()=>fit.verifyCollection(altered,official),/Original report statistic does not match/);
assert.throws(()=>fit.validateReference({...raw,teamStats:raw.teamStats.map((t,i)=>i?{...t,teamId:'home'}:t)}),/misaligned/);
assert.throws(()=>fit.validateReference({...raw,goalEvents:[{...raw.goalEvents[0],time:5600}]}),/outside match clock/);
console.log('PASS pinned upstream object hashes, paired original-report provenance, reference tampering, full-time/identity invariants; synthetic fixtures exist only inside this test');
