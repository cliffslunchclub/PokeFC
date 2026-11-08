'use strict';
// Before/after video: the SAME saved PSE fixture + visualSeed, Broadcast
// follow camera, 4× playback. Pick the first visible clearance in each
// protocol because improved planning changes its absolute match second.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const f=require('../watch/soccerjs/repros/natural-clearance-104.json');
const workspace=path.resolve(__dirname,'../..'),out=path.join(workspace,'natural-clearance-proof');
fs.mkdirSync(out,{recursive:true});
const port='8774',origin='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',port,'--bind','127.0.0.1','--directory',workspace],{stdio:'ignore'});
const host=variant=>'<!doctype html><html><head><meta charset="utf-8"><style>'+
 '*{box-sizing:border-box}body{margin:0;background:#091421}iframe{position:fixed;inset:0;width:100vw;height:100vh;border:0}</style></head><body>'+
 '<iframe src="/'+variant+'/watch/soccerjs/dist/index.html?embedded=1&inline=1"></iframe>'+
 '<script>const fixture='+JSON.stringify(f)+';window.addEventListener("message",e=>{'+
 'if(e.data?.type==="pfc-phase10-ready")e.source.postMessage({type:"pfc-phase10-fixture",fixture},location.origin)});</script></body></html>';
const field={width:106,height:68},distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
(async()=>{let browser;
 try{
  for(let i=0;i<80;i++){try{if((await fetch(origin+'/current/watch/soccerjs/fixture.json')).ok)break}catch(_){}await new Promise(r=>setTimeout(r,100))}
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const variant of ['baseline','current']){
   const D=require(path.join(workspace,variant,'watch/soccerjs/phase10-play-director.cjs'));
   const Motion=require(path.join(workspace,variant,'watch/soccerjs/phase10-motion.cjs'));
   const candidates=D.planFor(f,field).actions.filter(a=>a.pattern==='defensive-clearance'&&
    a.start>90&&a.start<600&&a.end-a.start>1);
   const action=candidates.find(a=>
    Motion.motionFrame(f,(a.start+.15)/60,field).action==='illustrative-upfield-clearance'&&
    Motion.motionFrame(f,(a.start+a.end)/120,field).action==='illustrative-upfield-clearance');
   assert(action,'Need visible seeded clearance in '+variant);
   const length=distance(action.from,action.to);
   if(variant==='baseline')assert(length>=40,'Baseline regression no longer long');
   else assert(length>=25&&length<=35,'New planned clearance outside 25–35m');
   const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,
    recordVideo:{dir:out,size:{width:1280,height:720}}});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.route('**/__natural_clearance_proof__?variant='+variant,
    r=>r.fulfill({contentType:'text/html',body:host(variant)}));
   await page.goto(origin+'/__natural_clearance_proof__?variant='+variant);
   await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.__PFC_VIEWER_READY__===true,
    null,{timeout:90000});
   const frame=page.frames().find(x=>x.url().includes('/watch/soccerjs/dist/index.html'));
   assert(frame,'Watch iframe missing '+variant);
   await frame.evaluate(()=>{
    for(const [id,value] of [['projection','orthographic'],['camera','follow'],['speed','4']]){
     const el=document.getElementById(id);el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));
    }
   });
   const start=action.start-.6;
   await page.evaluate(t=>document.querySelector('iframe').contentWindow.postMessage(
    {type:'pfc-phase10-control',action:'seek',minute:t/60},location.origin),start);
   await frame.waitForFunction(t=>Math.abs(window.__PFC_SNAPSHOT__?.minute*60-t)<.001,start,{timeout:15000});
   await frame.locator('.pitchwrap').screenshot({path:path.join(out,variant+'-before-kick.png')});
   // Playback speed changes must not change sampled physical world pose.
   let reference=null;
   for(const clockSpeed of [1,4,16]){
    await frame.locator('#speed').selectOption(String(clockSpeed));
    const midway=(action.start+action.end)/2;
    await page.evaluate(t=>document.querySelector('iframe').contentWindow.postMessage(
     {type:'pfc-phase10-control',action:'seek',minute:t/60},location.origin),midway);
    await frame.waitForFunction(t=>Math.abs(window.__PFC_SNAPSHOT__?.minute*60-t)<.001,midway);
    const snap=await frame.evaluate(()=>window.__PFC_SNAPSHOT__);
    assert.equal(snap.animation,'illustrative-upfield-clearance');
    assert.equal(snap.carrier,-1,'Clearance ball cannot be owned in mid-flight');
    if(reference)assert(distance(reference,snap.ball)<.000001,'World trajectory changed with speed '+clockSpeed);
    reference=snap.ball;
   }
   await frame.locator('#speed').selectOption('4');
   await page.evaluate(t=>document.querySelector('iframe').contentWindow.postMessage(
    {type:'pfc-phase10-control',action:'seek',minute:t/60},location.origin),start);
   await frame.waitForFunction(t=>Math.abs(window.__PFC_SNAPSHOT__?.minute*60-t)<.001,start);
   await frame.evaluate(()=>document.getElementById('play').click());
   await frame.waitForFunction(t=>window.__PFC_SNAPSHOT__?.minute*60>=t-.02,
    Math.min(f.durationMinutes*60-1,action.end+2),{timeout:30000});
   await frame.locator('.pitchwrap').screenshot({path:path.join(out,variant+'-after-reception.png')});
   const final=await frame.evaluate(()=>window.__PFC_SNAPSHOT__);
   assert.deepEqual(final.score,[0,0],'Same early-seed PSE scoreboard cannot change');
   assert.deepEqual(errors,[],'Browser error');
   const video=page.video();await context.close();
   fs.renameSync(await video.path(),path.join(out,variant+'-broadcast-follow-4x.webm'));
   fs.writeFileSync(path.join(out,variant+'-evidence.json'),JSON.stringify({
    fixture:'natural-clearance-104.json',visualSeed:f.visualSeed,
    camera:'follow',projection:'orthographic',speed:4,
    clearanceStart:action.start,clearanceArrival:action.end,clearanceDistanceMeters:length,
    declaredPhysics:action.clearance||null,fixturePseScore:f.score,
    source:variant==='baseline'?'pre-issue-104-main':'PR-112',build:process.env.GITHUB_SHA||'public-CI'
   },null,2));
   console.log('PASS '+variant+' same-seed Watch video: '+length.toFixed(2)+'m clearance at '+action.start.toFixed(2)+'s');
  }
 }finally{if(browser)await browser.close();server.kill('SIGTERM')}
})().catch(e=>{console.error(e);process.exitCode=1});
