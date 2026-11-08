'use strict';
const assert=require('node:assert/strict');
const Clip=require('./clip-export.cjs');
const Replay=require('./highlight-replay.cjs');
const fixture=require('./repros/opposite-clearance-buildup-64.json');
const before=JSON.stringify(fixture);
const entry=Replay.catalog(fixture,75).find(e=>e.kind==='goal'&&e.minute===74.95);
assert(entry,'Need preserved official goal');
const window=Replay.clipFor(fixture,entry);
const settings={buildId:'abc123',camera:'follow',projection:'orthographic',zoomFactor:1.3,
 speed:.5,format:'webm',mimeType:'video/webm;codecs=vp8',width:1280,height:720};
const first=Clip.diagnostic(fixture,entry,window,settings);
assert.equal(first.schema,'pokefc-watch-clip/v1');
assert.match(first.referenceId,/^PFC-[0-9A-F]{8}$/);
assert.equal(first.highlight.minute,74.95);
assert(first.highlight.startSeconds<=fixture.reproduction.clearanceStartSeconds);
assert.deepEqual(first.official.events,fixture.events);
assert.deepEqual(first.fixture,fixture);
assert.deepEqual(first.official.score,fixture.score);
assert.equal(first.seeds.visual,'opposite-clearance-buildup-64');
assert.equal(first.recording.replaySpeed,.5);
assert.equal(first.recording.projection,'orthographic');
assert.equal(first.app.buildId,'abc123');
assert.equal(Clip.filename(first.referenceId,entry,'json').replace(/\.json$/,'.webm'),
 Clip.filename(first.referenceId,entry,'webm'));
assert.deepEqual(Clip.diagnostic(fixture,entry,window,settings),first);
assert.notEqual(Clip.refId(fixture,entry,'abc123'),Clip.refId(fixture,entry,'other-build'));
const fromJson=Clip.reproduce(JSON.parse(JSON.stringify(first)),'abc123');
assert.deepEqual(fromJson.fixture,fixture);
assert.equal(fromJson.entry.id,entry.id);
assert.equal(fromJson.speed,.5);
assert.throws(()=>Clip.reproduce(first,'incorrect-build'),/matching Watch build/);
const {motionFrame}=require('./phase10-motion.cjs'),field={width:106,height:68};
for(const second of [fixture.reproduction.clearanceStartSeconds+1,
 fixture.reproduction.clearanceArrivalSeconds+.5,entry.minute*60]){
 const original=motionFrame(fixture,second/60,field);
 const restored=motionFrame(fromJson.fixture,second/60,field);
 assert.deepEqual(restored.ball,original.ball,'Downloaded JSON cannot change deterministic visual trajectory');
 assert.deepEqual(restored.actors.map(p=>[p.x,p.y,p.frame]),
  original.actors.map(p=>[p.x,p.y,p.frame]),'Downloaded JSON must reproduce same Pokémon motion');
 assert.equal(restored.officialEvent?.type,original.officialEvent?.type);
}

assert.equal(Clip.supportedFormat({isTypeSupported:m=>m==='video/mp4'}).extension,'mp4');
assert.equal(Clip.supportedFormat({isTypeSupported:m=>m==='video/webm;codecs=vp8'}).extension,'webm');
assert.equal(Clip.supportedFormat({isTypeSupported:()=>false}),null);
assert.equal(Clip.supportedFormat(null),null);
assert.equal(Clip.durationSeconds(window,.5),window.durationSeconds*2);
assert.equal(Clip.progressAt(Clip.durationSeconds(window,4)/2,window,4),.5);
assert.equal(JSON.stringify(fixture),before,'Clip export cannot modify PSE');
const privateText=JSON.stringify(first);
for(const token of ['userEmail','localStorage','accessToken','accountId','apiSecret'])
 assert(!privateText.includes(token),'Unexpected unrelated private data '+token);
console.log('PASS browser export metadata: matching video/JSON IDs, PSE snapshot, dynamic formats, speed, immutable match');
