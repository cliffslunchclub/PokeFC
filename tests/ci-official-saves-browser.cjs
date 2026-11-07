'use strict';
// Real Chromium tests run in the public PokeFC PR, never against production.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const qs=require('../assets/js/quick-sim.js'),bridge=require('../watch/soccerjs/watch-bridge.js');
const base=require('../watch/soccerjs/fixture.json'),root=path.resolve(__dirname,'..');
const preview={home:base.home,away:base.away},result=qs.simulate(preview,{seed:'official-saves-1'});
const fixture=bridge.snapshot(preview,result),first=fixture.events.find(e=>e.type==='save');
const incidents=fixture.events.filter(e=>e.type==='save'||e.type==='goal');
const {presentationFrame}=require('../watch/soccerjs/phase10-motion.cjs');
const field={width:106,height:68};
assert(first);
for(let i=1;i<incidents.length;i++)assert(incidents[i].minute-incidents[i-1].minute>=3-1e-9);
const original=JSON.stringify(result),out=path.join(root,'pse-browser-artifacts');fs.mkdirSync(out,{recursive:true});
const server=spawn('python3',['-m','http.server','8767','--bind','127.0.0.1','--directory',root],{stdio:'ignore'});
const origin='http://127.0.0.1:8767';
const host='<!doctype html><html><body style="margin:0;background:#14213a;color:white"><style>iframe{width:100%;height:100%;border:0}</style><label>Watch speed <select id="watchSpeed"><option>16</option></select></label><div id="stage" style="height:85vh"></div><script src="/watch/soccerjs/watch-bridge.js"></script><script>window.records=0;window.ready=false;window.session=FXI_PHASE10_WATCH.mountInline({preview:'+JSON.stringify(preview)+',result:'+JSON.stringify(result)+',container:document.getElementById("stage"),viewerUrl:"/watch/soccerjs/dist/index.html?embedded=1&inline=1",autoRecordOnSimToEnd:true,onRecord:()=>window.records++,onReady:()=>window.ready=true});</script></body></html>';
(async()=>{let browser;try{
 for(let n=0;n<40;n++){try{if((await fetch(origin+'/play/')).ok)break}catch(_){}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PFC_CHROME_BIN?{executablePath:process.env.PFC_CHROME_BIN}:{})});
 for(const [device,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const proto=CanvasRenderingContext2D.prototype;
   for(const name of ['clearRect','stroke','drawImage']){
    const original=proto[name];proto[name]=function(...args){
     if(this.canvas.id==='pitch'){
      if(name==='clearRect')window.__paintOrder=[];
      if(name==='stroke'&&this.strokeStyle==='#e53935')window.__paintOrder?.push('wall');
      if(name==='drawImage'&&args[0]?.src?.includes('/sprites/pokemon/'))window.__paintOrder?.push('pokemon');
     }
     return original.apply(this,args);
    };
   }
  });
  await page.route('**/save-host-test',r=>r.fulfill({contentType:'text/html',body:host}));
  await page.goto(origin+'/save-host-test');await page.waitForFunction(()=>window.ready,null,{timeout:120000});
  let frame=page.frames().find(f=>f.url().includes('dist/index.html'));
  assert(frame);const snap=()=>frame.evaluate(()=>window.__PFC_SNAPSHOT__);
  const seek=async t=>{await page.evaluate(t=>window.session.seek(t),t);await frame.waitForFunction(t=>Math.abs(window.__PFC_SNAPSHOT__.minute-t)<1e-7,t);};
  assert.equal((await snap()).autoContinueSaves,false);
  assert.equal(await page.locator('.pfc-save-auto-control input').isChecked(),false);
  // Match start is a stationary two-player centre kick with both halves set.
  assert.equal((await snap()).ballContact,'kickoff-setup');
  for(const speed of [1,4,16]){
   await seek(0);await page.evaluate(speed=>window.session.play(speed),speed);
   await frame.waitForFunction(()=>window.__PFC_SNAPSHOT__.kickoffIntro?.elapsed>=1,null,{timeout:10000});
   await page.evaluate(()=>window.session.pause());
   const held=await snap();assert.equal(held.minute,0);assert.equal(held.ballContact,'kickoff-setup');
   assert(held.kickoffIntro.elapsed<2,'Setup must hold for two real seconds at every speed');
   const circle=held.actorWorldPositions.map((p,i)=>({p,i})).filter(({p})=>Math.hypot(p[0]-53,p[1]-34)<9.15);
   assert.deepEqual(circle.map(a=>a.i),[held.kickoff.kicker,held.kickoff.receiver]);
   if(speed===1)await frame.locator('.pitchwrap').screenshot({path:path.join(out,'two-player-kickoff-'+device+'.png')});
   await page.waitForTimeout(250);assert.equal((await snap()).kickoffIntro.elapsed,held.kickoffIntro.elapsed);
   await page.evaluate(speed=>window.session.play(speed),speed);
   await frame.waitForFunction(()=>window.__PFC_SNAPSHOT__.kickoffIntro?.elapsed>=3,null,{timeout:10000});
   const ramp=await snap();
   assert(ramp.kickoffIntro.elapsed<4);assert(ramp.minute>0);
   const expected=speed*(ramp.kickoffIntro.elapsed-2)**2/4;
   assert(Math.abs(ramp.minute*60-expected)<.01,'Live clock follows continuous acceleration');
   await frame.waitForFunction(()=>window.__PFC_SNAPSHOT__.kickoffIntro?.elapsed>=4,null,{timeout:10000});
   await page.evaluate(()=>window.session.pause());
  }
  // Render both teams' kickoff setup after half-time and after a goal.
  const goal=fixture.events.find(e=>e.type==='goal');
  for(const start of [2700,...(goal?[(goal.minute+.22)*60]:[])]){
   const k=presentationFrame(fixture,start,field).kickoff;assert(k);
   await seek(k.ready/60);const ready=await snap();
   assert.equal(ready.ballContact,'kickoff-setup');
   for(const [id,p] of ready.actorWorldPositions.entries()){
    assert(id<11?p[0]<=53:p[0]>=53);
    if(Math.floor(id/11)!==Math.floor(k.kicker/11))assert(Math.hypot(p[0]-53,p[1]-34)>=9.15);
   }
  }
  // At an actual border scene, all six rails paint before all 22 sprites.
  let border=60,best=Infinity;
  for(let sec=30;sec<240;sec+=3)for(const a of presentationFrame(fixture,sec,field).actors){
   const edge=Math.min(a.x,106-a.x,a.y,68-a.y);if(edge<best){best=edge;border=sec;}
  }
  for(const view of ['orthographic','isometric','topdown']){
   await seek(border/60);await page.evaluate(view=>window.session.setProjection(view),view);
   await frame.waitForFunction(view=>window.__PFC_SNAPSHOT__.projection===view,view);
   const order=await frame.evaluate(()=>window.__paintOrder);
   assert.equal(order.filter(x=>x==='wall').length,6);
   assert.equal(order.filter(x=>x==='pokemon').length,22);
   assert(order.lastIndexOf('wall')<order.indexOf('pokemon'),'Walls must never paint across a sprite');
   const positions=(await snap()).actorWorldPositions;
   assert(positions.every(p=>p[0]>=.9&&p[0]<=105.1&&p[1]>=.9&&p[1]<=67.1));
   await frame.locator('.pitchwrap').screenshot({path:path.join(out,'border-layering-'+device+'-'+view+'.png')});
  }
  await page.evaluate(()=>window.session.setProjection('orthographic'));
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
   if(speed===16){
    const card=await frame.locator('.goal-prompt-card').boundingBox(),pitch=await frame.locator('.pitchwrap').boundingBox();
    assert(card.y>=pitch.y&&card.y+card.height<=pitch.y+pitch.height,'Entire save alert must fit the pitch');
   }
   if(speed===16)await frame.locator('.pitchwrap').screenshot({path:path.join(out,'official-save-alert-'+device+'.png')});
  }
  // Toggling in the alert persists and synchronizes to the host checkbox.
  await frame.locator('#saveAutoAlert').check();await page.waitForFunction(()=>document.querySelector('.pfc-save-auto-control input').checked);
  await frame.locator('#highlightNoticePlay').click();await page.waitForTimeout(3200);
  assert.equal((await snap()).replay.kind,'save','Replay cannot be interrupted by automatic Continue');
  if(device==='desktop')await frame.waitForFunction(()=>!window.__PFC_SNAPSHOT__.replay&&window.__PFC_SNAPSHOT__.savePaused,null,{timeout:25000});
  else await frame.locator('#highlightReplayReturn').click();
  await page.waitForTimeout(3200);
  assert((await snap()).savePaused,'Returning from replay must not restart canceled countdown');
  await frame.locator('#highlightNoticeDismiss').click();
  await frame.waitForFunction(()=>window.__PFC_SNAPSHOT__.animation==='illustrative-keeper-punt',null,{timeout:10000});
  const punt=await snap();
  await frame.waitForFunction(sec=>window.__PFC_SNAPSHOT__.minute*60>=sec,punt.saveSequence.arrival,{timeout:10000});
  await page.evaluate(()=>window.session.pause());
  const received=await snap(),side=Math.floor(received.saveSequence.keeper/11);
  assert(Math.min(...received.actorWorldPositions.slice(side*11+1,side*11+11).map(p=>Math.hypot(p[0]-received.ball.x,p[1]-received.ball.y)))<2.8,'Rendered long punt must reach an actual receiving player');
  // A new save gets a fresh real three-second countdown, at unchanged 16x.
  await seek(first.minute-.03/60);await page.evaluate(()=>window.session.play(16));
  await frame.locator('#highlightNotice').waitFor({state:'visible'});
  await page.waitForTimeout(1800);assert((await snap()).savePaused,'Auto-continue fired before three seconds');
  await frame.waitForFunction(()=>!window.__PFC_SNAPSHOT__.savePaused&&window.__PFC_SNAPSHOT__.watchPlaying,null,{timeout:5000});
  await page.evaluate(()=>window.session.pause());
  await page.reload();await page.waitForFunction(()=>window.ready,null,{timeout:120000});
  frame=page.frames().find(f=>f.url().includes('dist/index.html'));
  assert.equal((await snap()).autoContinueSaves,true,'Save preference must survive across matches');
  assert(await page.locator('.pfc-save-auto-control input').isChecked());
  await page.locator('.pfc-save-auto-control input').uncheck();
  await frame.waitForFunction(()=>!window.__PFC_SNAPSHOT__.autoContinueSaves);
  // Spaced saves retain separate stable replay entries and no queue.
  const next=fixture.events.filter(e=>e.type==='save')[1];assert(next);
  await seek(next.minute-.03/60);await page.evaluate(()=>window.session.play(16));
  await frame.locator('#highlightNotice').waitFor({state:'visible'});
  assert.equal((await snap()).queuedSaveCount,0);
  assert.equal((await snap()).minute,next.minute);
  await frame.locator('#highlightNoticePlay').click();
  assert.equal((await snap()).replay.id,'save-1');
  await frame.locator('#highlightReplayReturn').click();
  // Sim to End from a save alert records the original result exactly once.
  await page.evaluate(()=>window.session.simToEnd());await page.waitForFunction(()=>window.records===1);
  await page.evaluate(()=>{window.session.record();window.session.record()});assert.equal(await page.evaluate(()=>window.records),1);
  assert.deepEqual((await snap()).score,result.score);assert.equal(JSON.stringify(result),original);assert.deepEqual(errors,[]);
  console.log('PASS '+device+': saves at 1/4/16x, replay cancel/return, synced persistent preference, real 3s automatic Continue, long punt, spaced-save replay entries, once-only Watch→Sim');
  await page.close();
 }
 // A goal only 5.4 seconds after a save must settle continuously at its
 // immutable clock time rather than teleport from an unfinished keeper punt.
 const sandbox={module:{exports:{}}};sandbox.globalThis=sandbox;
 require('node:vm').runInNewContext(fs.readFileSync(require.resolve('../assets/js/quick-sim.js'),'utf8').replace('  spaceEvents(events);','  events.sort((a,b)=>a.minute-b.minute);'),sandbox);
 const clustered=sandbox.module.exports.simulate(preview,{seed:'official-saves-12'});
 const closeSave=clustered.events.find(e=>e.type==='save'&&clustered.events.some(g=>g.type==='goal'&&g.minute>e.minute&&g.minute-e.minute<.1));
 assert(closeSave);const closeGoal=clustered.events.find(g=>g.type==='goal'&&g.minute>closeSave.minute&&g.minute-closeSave.minute<.1);
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('**/cluster-host-test',r=>r.fulfill({contentType:'text/html',body:host.replace(JSON.stringify(result),JSON.stringify(clustered))}));
 await page.goto(origin+'/cluster-host-test');await page.waitForFunction(()=>window.ready,null,{timeout:120000});
 const frame=page.frames().find(f=>f.url().includes('dist/index.html'));
 await page.evaluate(t=>window.session.seek(t),closeSave.minute-.03/60);
 await page.evaluate(()=>window.session.play(16));await frame.locator('#highlightNotice').waitFor({state:'visible'});
 await frame.locator('#highlightNoticeDismiss').click();
 await frame.waitForFunction(t=>window.__PFC_SNAPSHOT__.goalPaused&&window.__PFC_SNAPSHOT__.minute===t,closeGoal.minute,{timeout:15000});
 const end=await frame.evaluate(()=>window.__PFC_SNAPSHOT__);
 assert.equal(end.officialEventType,'goal');assert(end.ball.x>106||end.ball.x<0,'Goal alert must wait for ball to reach net');
 assert.equal(await frame.locator('#highlightNoticeTitle').textContent(),"GOAL! · "+Math.floor(closeGoal.minute+1)+"′ · "+preview.home.lineup.find(p=>p.id===closeGoal.player).name);
 assert.equal(await page.evaluate(()=>window.records),0);
 console.log('PASS tightly clustered official save→goal: held presentation clock, secured save, natural punt transition and goal alert only after ball reaches net');
 await page.close();
}finally{if(browser)await browser.close();server.kill('SIGTERM')}})().catch(e=>{console.error(e);process.exitCode=1});
