'use strict';
// Read-only, public-site browser reproduction after the production deploy.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const fixture=require('../watch/soccerjs/repros/opposite-clearance-buildup-64.json');
const origin='https://pfc.cliffslunchclub.com',out=path.resolve(__dirname,'../pse-live-artifacts');
fs.mkdirSync(out,{recursive:true});
const host='<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#091421}iframe{width:100vw;height:100vh;border:0}</style></head><body>'+
 '<iframe src="/watch/soccerjs/dist/index.html?embedded=1&inline=1"></iframe>'+
 '<script>const fixture='+JSON.stringify(fixture)+';window.addEventListener("message",e=>{'+
 'if(e.data?.type==="pfc-phase10-ready")e.source.postMessage({type:"pfc-phase10-fixture",fixture},location.origin)});</script></body></html>';
(async()=>{let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  for(const pathname of ['/play/','/challenge/','/franchise/']){
   const response=await page.goto(origin+pathname,{waitUntil:'domcontentloaded',timeout:40000});
   assert(response?.ok(),'Production route unavailable: '+pathname);
  }
  await page.route('**/__pfc_live_buildup_proof__',r=>r.fulfill({contentType:'text/html',body:host}));
  await page.goto(origin+'/__pfc_live_buildup_proof__',{timeout:40000});
  const frame=page.frames().find(x=>x.url().includes('/watch/soccerjs/dist/index.html'));
  assert(frame,'Production Soccer-JS iframe not found');
  await frame.waitForFunction(()=>window.__PFC_VIEWER_READY__===true,null,{timeout:90000});
  const seek=async second=>{
   await page.evaluate(t=>document.querySelector('iframe').contentWindow.postMessage(
    {type:'pfc-phase10-control',action:'seek',minute:t/60},location.origin),second);
   await frame.waitForFunction(t=>Math.abs(window.__PFC_SNAPSHOT__?.minute*60-t)<.001,second,{timeout:25000});
   return frame.evaluate(()=>window.__PFC_SNAPSHOT__);
  };
  const mid=(fixture.reproduction.clearanceStartSeconds+fixture.reproduction.clearanceArrivalSeconds)/2;
  const cleared=await seek(mid);
  assert.equal(cleared.animation,'illustrative-upfield-clearance',
   'Live release still masks the recorded clearance');
  await frame.locator('.pitchwrap').screenshot({path:path.join(out,'live-clearance.png')});
  const received=await seek(fixture.reproduction.clearanceArrivalSeconds+1);
  assert.equal(received.carrier,20,'Recorded scorer must receive the upfield clearance');
  assert(Math.hypot(received.ball.x-received.actorWorldPositions[20][0],
   received.ball.y-received.actorWorldPositions[20][1])<1.5,'Live scorer detached from ball');
  await frame.locator('.pitchwrap').screenshot({path:path.join(out,'live-scorer-possession.png')});
  const goal=await seek(fixture.reproduction.goalMinute*60);
  assert.equal(goal.officialEventType,'goal');assert.deepEqual(goal.score,[2,1]);
  assert.deepEqual(errors,[]);
  await frame.locator('.pitchwrap').screenshot({path:path.join(out,'live-official-goal.png')});
  console.log('PASS live PokeFC: 3 mode pages + same saved clearance-reception-goal PSE fixture');
 }finally{if(browser)await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
