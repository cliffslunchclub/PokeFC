'use strict';
// Run the REAL deployed Watch bundle with the exact preserved PSE fixture and
// a second fully authoritative saved-shot fixture. This test never modifies production.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const Q=require('../assets/js/quick-sim.js'),Bridge=require('../watch/soccerjs/watch-bridge.js');
const goalFixture=require('../watch/soccerjs/repros/opposite-clearance-buildup-64.json');
const origin='https://pfc.cliffslunchclub.com',out=path.resolve(__dirname,'../pse-live-artifacts');
fs.mkdirSync(out,{recursive:true});
const preview={home:goalFixture.home,away:goalFixture.away};
const officialResult=Q.simulate(preview,{seed:'official-saves-1'});
const saveFixture={...Bridge.snapshot(preview,officialResult),visualSeed:'opposite-save-clearance-2'};
const save=saveFixture.events.find(e=>e.type==='save'&&e.minute===86.5);
assert(save,'Saved seed must retain official 86:30 PSE save');
const presets=[
 {kind:'goal',fixture:goalFixture,event:goalFixture.events.find(e=>e.type==='goal'&&e.minute===74.95),
  start:goalFixture.reproduction.clearanceStartSeconds,arrival:goalFixture.reproduction.clearanceArrivalSeconds,
  receiver:20},
 {kind:'save',fixture:saveFixture,event:save,start:5177.267073293539,arrival:5180.297135906402,receiver:8}
];
const host=f=>`<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#101821;width:100%;height:100%;overflow:hidden}
iframe{position:fixed;inset:0;width:100%;height:100%;border:0}
</style></head><body><iframe src="/watch/soccerjs/dist/index.html?embedded=1&inline=1"></iframe>
<script>const fixture=${JSON.stringify(f)};window.addEventListener('message',e=>{
if(e.data?.type==='pfc-phase10-ready')e.source.postMessage({type:'pfc-phase10-fixture',fixture},location.origin);
});</script></body></html>`;
const dist=(a,b)=>Math.hypot(a[0]-b.x,a[1]-b.y);
(async()=>{let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message||String(e)));
  for(const route of ['/','/play/','/challenge/','/franchise/']){
   const response=await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:40000});
   assert(response?.ok(),'SiteGround production page failed: '+route);
  }
  for(const entry of presets){
   const pagePath='/__pfc_live_buildup_'+entry.kind+'__';
   await page.route('**'+pagePath,r=>r.fulfill({contentType:'text/html',body:host(entry.fixture)}));
   await page.goto(origin+pagePath,{waitUntil:'domcontentloaded',timeout:40000});
   // DOMContentLoaded does not guarantee the nested iframe has navigated.
   await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.__PFC_VIEWER_READY__===true,
    null,{timeout:90000});
   const frame=page.frames().find(f=>f.url().includes('/watch/soccerjs/dist/index.html'));
   assert(frame,'Deployed Soccer-JS iframe missing for '+entry.kind);
   const seek=async second=>{
    await page.evaluate(t=>document.querySelector('iframe').contentWindow.postMessage(
     {type:'pfc-phase10-control',action:'seek',minute:t/60},location.origin),second);
    await frame.waitForFunction(t=>Math.abs(window.__PFC_SNAPSHOT__?.minute*60-t)<.001,second,{timeout:25000});
    return frame.evaluate(()=>window.__PFC_SNAPSHOT__);
   };
   const clear=await seek((entry.start+entry.arrival)/2);
   assert.equal(clear.animation,'illustrative-upfield-clearance',
    entry.kind+' live Watch masks the original defensive clearance');
   await frame.locator('.pitchwrap').screenshot({path:path.join(out,entry.kind+'-clearance.png')});
   const received=await seek(entry.arrival+.5);
   assert.equal(received.carrier,entry.receiver,entry.kind+' receiving carrier changed');
   assert(dist(received.actorWorldPositions[entry.receiver],received.ball)<1.5,
    entry.kind+' receiver not at ball');
   await frame.locator('.pitchwrap').screenshot({path:path.join(out,entry.kind+'-reception.png')});
   const end=await seek(entry.event.minute*60);
   assert.equal(end.officialEventType,entry.kind,entry.kind+' PSE event changed');
   assert.deepEqual(end.score,entry.kind==='goal'?[2,1]:[...saveFixture.score]
    .map((_,side)=>saveFixture.events.filter(e=>e.type==='goal'&&e.minute<=entry.event.minute&&e.team===(side?saveFixture.away.id:saveFixture.home.id)).length),
    entry.kind+' PSE score mismatch at incident');
   await frame.locator('.pitchwrap').screenshot({path:path.join(out,entry.kind+'-official-outcome.png')});
   for(const speed of [1,4,16]){
    await page.evaluate(speed=>document.querySelector('iframe').contentWindow.postMessage(
     {type:'pfc-phase10-control',action:'speed',speed},location.origin),speed);
    const mid=await seek((entry.start+entry.arrival)/2);
    assert.equal(mid.animation,'illustrative-upfield-clearance',
     entry.kind+' missing clearance at '+speed+'×');
   }
   console.log('PASS production '+entry.kind+': clearance, physical receiver, official outcome, 1/4/16× seeks');
  }
  assert.deepEqual(errors,[],'Production Javascript error');
  assert.deepEqual(saveFixture.events,Bridge.snapshot(preview,officialResult).events,'PSE event ledger unchanged');
  console.log('PASS production SiteGround all routes and both saved clearance-to-incident fixtures');
 }finally{if(browser)await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
