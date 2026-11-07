'use strict';
// Real Chromium tests run in the public PokeFC PR, never against production.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const qs=require('../assets/js/quick-sim.js'),bridge=require('../watch/soccerjs/watch-bridge.js');
const base=require('../watch/soccerjs/fixture.json'),root=path.resolve(__dirname,'..');
const preview={home:base.home,away:base.away},result=qs.simulate(preview,{seed:'official-saves-1'});
const fixture=bridge.snapshot(preview,result),first=fixture.events.find(e=>e.type==='save');
const tied=fixture.events.filter(e=>e.type==='save'&&fixture.events.some(o=>o!==e&&o.type==='save'&&o.minute===e.minute));
assert(first&&tied.length>=2);
const original=JSON.stringify(result),out=path.join(root,'pse-browser-artifacts');fs.mkdirSync(out,{recursive:true});
const server=spawn('python3',['-m','http.server','8767','--bind','127.0.0.1','--directory',root],{stdio:'ignore'});
const origin='http://127.0.0.1:8767';
const host='<!doctype html><html><body style="margin:0;background:#14213a;color:white"><label>Watch speed <select id="watchSpeed"><option>16</option></select></label><div id="stage" style="height:85vh"></div><script src="/watch/soccerjs/watch-bridge.js"></script><script>window.records=0;window.ready=false;window.session=FXI_PHASE10_WATCH.mountInline({preview:'+JSON.stringify(preview)+',result:'+JSON.stringify(result)+',container:document.getElementById("stage"),viewerUrl:"/watch/soccerjs/dist/index.html?embedded=1&inline=1",autoRecordOnSimToEnd:true,onRecord:()=>window.records++,onReady:()=>window.ready=true});</script></body></html>';
(async()=>{let browser;try{
 for(let n=0;n<40;n++){try{if((await fetch(origin+'/play/')).ok)break}catch(_){}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PFC_CHROME_BIN?{executablePath:process.env.PFC_CHROME_BIN}:{})});
 for(const [device,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/save-host-test',r=>r.fulfill({contentType:'text/html',body:host}));
  await page.goto(origin+'/save-host-test');await page.waitForFunction(()=>window.ready,null,{timeout:120000});
  const frame=page.frames().find(f=>f.url().includes('dist/index.html'));
  assert(frame);const snap=()=>frame.evaluate(()=>window.__PFC_SNAPSHOT__);
  const seek=async t=>{await page.evaluate(t=>window.session.seek(t),t);await frame.waitForFunction(t=>Math.abs(window.__PFC_SNAPSHOT__.minute-t)<1e-7,t);};
  assert.equal((await snap()).autoContinueSaves,false);
  assert.equal(await page.locator('.pfc-save-auto-control input').isChecked(),false);
  // Match start is a stationary two-player centre kick with both halves set.
  assert.equal((await snap()).ballContact,'kickoff-setup');
  for(const speed of [1,4,16]){
   await seek(first.minute-.03/60);await page.evaluate(speed=>window.session.play(speed),speed);
   await frame.locator('#highlightNotice').waitFor({state:'visible',timeout:15000});
   const saved=await snap();assert.equal(saved.minute,first.minute);assert(saved.savePaused);assert(!saved.watchPlaying);
   assert.equal(saved.officialEventType,'save');assert.equal(saved.carrier,saved.saveSequence.keeper);
   assert.equal(await frame.locator('#highlightNoticeTitle').textContent(),'Goalkeeper Save!');
   assert.match(await frame.locator('#highlightNoticeMessage').textContent(),/saves the shot from/);
   const keeper=saved.actorWorldPositions[saved.saveSequence.keeper];
   assert(Math.hypot(saved.ball.x-keeper[0],saved.ball.y-keeper[1])<1,'Rendered keeper must secure shot');
   assert.equal(await page.evaluate(()=>window.records),0);
   await frame.locator('#highlightNoticePlay').click();assert.equal((await snap()).replay.kind,'save');
   await frame.locator('#highlightReplayReturn').click();assert.equal((await snap()).minute,first.minute);assert((await snap()).savePaused);
   assert.equal((await snap()).saveAutoCountdown,false);
   if(speed===16)await frame.locator('.pitchwrap').screenshot({path:path.join(out,'official-save-alert-'+device+'.png')});
  }
  // Toggling in the alert persists and synchronizes to the host checkbox.
  await frame.locator('#saveAutoAlert').check();await page.waitForFunction(()=>document.querySelector('.pfc-save-auto-control input').checked);
  await frame.locator('#highlightNoticePlay').click();await page.waitForTimeout(3200);
  assert.equal((await snap()).replay.kind,'save','Replay cannot be interrupted by automatic Continue');
  await frame.locator('#highlightReplayReturn').click();await page.waitForTimeout(3200);
  assert((await snap()).savePaused,'Returning from replay must not restart canceled countdown');
  await frame.locator('#highlightNoticeDismiss').click();
  await frame.waitForFunction(()=>window.__PFC_SNAPSHOT__.animation==='illustrative-keeper-punt',null,{timeout:10000});
  await page.evaluate(()=>window.session.pause());
  // A new save gets a fresh real three-second countdown, at unchanged 16x.
  await seek(first.minute-.03/60);await page.evaluate(()=>window.session.play(16));
  await frame.locator('#highlightNotice').waitFor({state:'visible'});
  await page.waitForTimeout(1800);assert((await snap()).savePaused,'Auto-continue fired before three seconds');
  await frame.waitForFunction(()=>!window.__PFC_SNAPSHOT__.savePaused&&window.__PFC_SNAPSHOT__.watchPlaying,null,{timeout:5000});
  await page.evaluate(()=>window.session.pause());
  await page.locator('.pfc-save-auto-control input').uncheck();
  await frame.waitForFunction(()=>!window.__PFC_SNAPSHOT__.autoContinueSaves);
  // Identical official times queue separate natural reconstructions at a held clock.
  await seek(tied[0].minute-.03/60);await page.evaluate(()=>window.session.play(16));
  await frame.locator('#highlightNotice').waitFor({state:'visible'});
  const before=await snap();assert.equal(before.queuedSaveCount,1);
  await frame.locator('#highlightNoticeDismiss').click();
  await frame.waitForFunction(()=>!!window.__PFC_SNAPSHOT__.queuedSavePresentation);
  assert.equal((await snap()).minute,tied[0].minute);
  await frame.waitForFunction(keeper=>window.__PFC_SNAPSHOT__.savePaused&&window.__PFC_SNAPSHOT__.saveSequence.keeper!==keeper,before.saveSequence.keeper,{timeout:30000});
  assert.equal((await snap()).minute,tied[0].minute);
  // Both timestamp-identical saves have stable replay entries.
  await frame.locator('#highlightNoticePlay').click();assert.equal((await snap()).replay.id,'save-'+fixture.events.filter(e=>e.type==='save').indexOf(tied[1]));
  await frame.locator('#highlightReplayReturn').click();
  // Sim to End from a save alert records the original result exactly once.
  await page.evaluate(()=>window.session.simToEnd());await page.waitForFunction(()=>window.records===1);
  await page.evaluate(()=>{window.session.record();window.session.record()});assert.equal(await page.evaluate(()=>window.records),1);
  assert.deepEqual((await snap()).score,result.score);assert.equal(JSON.stringify(result),original);assert.deepEqual(errors,[]);
  console.log('PASS '+device+': saves at 1/4/16x, replay cancel/return, synced persistent preference, real 3s automatic Continue, long punt, tied-save queue, once-only Watch→Sim');
  await page.close();
 }
}finally{if(browser)await browser.close();server.kill('SIGTERM')}})().catch(e=>{console.error(e);process.exitCode=1});
