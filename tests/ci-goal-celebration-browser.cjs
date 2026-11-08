'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const Q=require('../assets/js/quick-sim.js'),B=require('../watch/soccerjs/watch-bridge.js');
const base=require('../watch/soccerjs/fixture.json'),preview={home:base.home,away:base.away};
const result=Q.simulate(preview,{seed:'official-saves-0'}),fixture=B.snapshot(preview,result);
const goal=fixture.events.find(e=>e.type==='goal');assert(goal);
const original=JSON.stringify(result),root=path.resolve(__dirname,'..'),out=path.join(root,'celebration-browser-artifacts');fs.mkdirSync(out,{recursive:true});
const live=process.env.PFC_LIVE_ORIGIN,origin=live||'http://127.0.0.1:8778';
const server=live?null:spawn('python3',['-m','http.server','8778','--bind','127.0.0.1','--directory',root],{stdio:'ignore'});
const host='<!doctype html><html><body style="margin:0;background:#14213a"><div id="stage" style="height:95vh"></div><script src="/watch/soccerjs/watch-bridge.js"></script><script>window.ready=false;window.records=0;window.session=FXI_PHASE10_WATCH.mountInline({preview:'+JSON.stringify(preview)+',result:'+JSON.stringify(result)+',container:document.getElementById("stage"),viewerUrl:"/watch/soccerjs/dist/index.html?embedded=1&inline=1&celebrationqa=1",onReady:()=>window.ready=true,onRecord:()=>window.records++});</script></body></html>';
(async()=>{let browser;try{
 if(!live)for(let i=0;i<40;i++){try{if((await fetch(origin+'/play/')).ok)break}catch(_){}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const [device,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const context=await browser.newContext({viewport,recordVideo:{dir:out,size:viewport}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage,clear=proto.clearRect;
   proto.clearRect=function(...args){if(this.canvas.id==='pitch'){window.__spriteWidths=[];window.__ballWidth=null;}return clear.apply(this,args)};
   proto.drawImage=function(...args){if(this.canvas.id==='pitch'){
    if(args[0]?.src?.includes('/sprites/pokemon/'))window.__spriteWidths.push(args[3]);
    if(args[0]?.src?.includes('pfc-soccer-ball.svg'))window.__ballWidth=args[3];
   }return draw.apply(this,args)};
  });
  await page.route('**/celebration-qa',r=>r.fulfill({contentType:'text/html',body:host}));
  await page.goto(origin+'/celebration-qa');await page.waitForFunction(()=>window.ready,null,{timeout:120000});
  const frame=page.frames().find(f=>f.url().includes('/dist/index.html'));assert(frame);
  const snap=()=>frame.evaluate(()=>window.__PFC_SNAPSHOT__);
  if(process.env.PFC_EXPECTED_BUILD_ID)assert.equal((await snap()).buildId,process.env.PFC_EXPECTED_BUILD_ID,'Verify the exact deployed renderer commit');
  const seek=async t=>{await page.evaluate(t=>window.session.seek(t),t);await frame.waitForFunction(t=>Math.abs(window.__PFC_SNAPSHOT__.minute-t)<1e-7,t)};
  const save=fixture.events.find(e=>e.type==='save');assert(save);
  await seek(save.minute);const held=await snap();
  assert(held.saveSequence.release-held.saveSequence.end<=.8+1e-7,'Deployed keeper release deadline');
  await seek((held.saveSequence.release+.01)/60);assert.equal((await snap()).animation,'illustrative-keeper-punt');
  const savedBall=(await snap()).ball;assert(Math.hypot(savedBall.x-held.ball.x,savedBall.y-held.ball.y)>0,'Keeper must start distributing');
  for(const view of ['orthographic','isometric','topdown']){
   await seek(1);await page.evaluate(v=>window.session.setProjection(v),view);
   const a=await frame.evaluate(()=>({s:window.__PFC_SNAPSHOT__,width:window.__spriteWidths[0],ball:window.__ballWidth}));
   await frame.locator('#zoomIn').click();const b=await frame.evaluate(()=>({s:window.__PFC_SNAPSHOT__,width:window.__spriteWidths[0],ball:window.__ballWidth}));
   assert(a.width>0&&a.ball>0);const ratio=b.s.scale/a.s.scale;
   assert(Math.abs(b.width/a.width-ratio)<1e-6,'Sprite and pitch must share zoom');
   assert(Math.abs(b.ball/a.ball-ratio)<1e-6,'Ball and pitch must share zoom');
   assert.deepEqual(a.s.actorWorldPositions,b.s.actorWorldPositions,'Zoom must not move feet');
   await frame.locator('#zoomOut').click();
   const feet=(await snap()).actorWorldPositions;
   await page.evaluate(()=>FXI_PHASE10_WATCH.toggleFullscreen(document.getElementById('stage')));
   await frame.waitForFunction(()=>document.documentElement.classList.contains('pfc-watch-fullscreen'));
   assert.deepEqual((await snap()).actorWorldPositions,feet,'Fullscreen must preserve world positions');
   await page.evaluate(()=>FXI_PHASE10_WATCH.leaveFullscreen(document.getElementById('stage')));
   await frame.waitForFunction(()=>!document.documentElement.classList.contains('pfc-watch-fullscreen'));
   for(const speed of [1,4,16]){
    await seek(goal.minute-.01/60);await page.evaluate(s=>window.session.play(s),speed);
    await frame.waitForFunction(()=>window.__PFC_SNAPSHOT__.celebration&&!window.__PFC_SNAPSHOT__.celebration.done,null,{timeout:15000});
    const start=await snap();assert.equal(start.minute,goal.minute);assert.equal(start.officialEventType,'goal');
    if(view==='orthographic'&&speed===1){
     await page.evaluate(()=>window.session.pause());await page.waitForTimeout(100);
     const paused=await snap();await page.waitForTimeout(250);assert.equal((await snap()).celebration.elapsed,paused.celebration.elapsed);
     await page.evaluate(s=>window.session.play(s),speed);
    }
    await frame.waitForFunction(()=>window.__PFC_SNAPSHOT__.celebration?.elapsed>1.2&&Math.max(...window.__PFC_SNAPSHOT__.actorHeights)>.2,null,{timeout:6000});
    const close=await snap();assert.equal(close.minute,goal.minute);assert(close.scale>start.scale);
    assert(Math.max(...close.actorHeights)>.01,'Scorer must visibly hop');
    await frame.locator('.pitchwrap').screenshot({path:path.join(out,'celebration-'+device+'-'+view+'-'+speed+'.png')});
    if(speed===16)await frame.locator('#skipCelebration').click();
    await frame.locator('#highlightNotice').waitFor({state:'visible',timeout:6000});
    assert.equal((await snap()).minute,goal.minute,'Celebration cannot advance PSE clock');
    await frame.locator('#highlightNoticeDismiss').click();
    await frame.waitForFunction(()=>window.__PFC_SNAPSHOT__.ballContact==='kickoff-setup',null,{timeout:3000});
    await page.evaluate(()=>window.session.pause());const k=await snap();
    assert(Math.hypot(k.ball.x-53,k.ball.y-34)<.01);
    assert.equal(k.actorWorldPositions.filter(p=>Math.hypot(p[0]-53,p[1]-34)<9.15).length,2);
   }
  }
  // The same scene honors reduced motion; no hops or orbit/zoom.
  await page.emulateMedia({reducedMotion:'reduce'});await seek(goal.minute-.01/60);await page.evaluate(()=>window.session.play(16));
  await frame.waitForFunction(()=>window.__PFC_SNAPSHOT__.celebration?.elapsed>.3&&!window.__PFC_SNAPSHOT__.celebration.done,null,{timeout:10000});
  assert((await snap()).actorHeights.every(h=>h===0));await frame.locator('#skipCelebration').click();
  assert.equal(await page.evaluate(()=>window.records),0);assert.deepEqual(errors,[]);
  await context.close();console.log('PASS '+device+' celebration/zoom: three views, 1/4/16x, clock freeze, hops, pause/resume, skip, reduced motion and two-player restart');
 }
 assert.equal(JSON.stringify(result),original);
}finally{if(browser)await browser.close();if(server)server.kill('SIGTERM')}})().catch(e=>{console.error(e);process.exitCode=1});
