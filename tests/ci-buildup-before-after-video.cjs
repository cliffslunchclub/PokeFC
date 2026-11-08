'use strict';
// Matching before/after browser video of the same saved PSE goal, visualSeed,
// Broadcast camera, follow-ball framing and 4x clock speed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const f=require('../watch/soccerjs/repros/opposite-clearance-buildup-64.json');
const workspace=path.resolve(__dirname,'../..'),out=path.join(workspace,'buildup-proof');
fs.mkdirSync(out,{recursive:true});
const port='8769',origin='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',port,'--bind','127.0.0.1','--directory',workspace],{stdio:'ignore'});
const host=variant=>'<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#091421}iframe{position:fixed;inset:0;width:100vw;height:100vh;border:0}</style></head><body>'+
 '<iframe src="/'+variant+'/watch/soccerjs/dist/index.html?embedded=1&inline=1"></iframe>'+
 '<script>const fixture='+JSON.stringify(f)+';window.addEventListener("message",e=>{'+
 'if(e.data?.type==="pfc-phase10-ready")e.source.postMessage({type:"pfc-phase10-fixture",fixture},location.origin)});</script></body></html>';
(async()=>{let browser;
 try{
  for(let i=0;i<80;i++){try{if((await fetch(origin+'/current/watch/soccerjs/fixture.json')).ok)break}catch(_){}await new Promise(r=>setTimeout(r,100))}
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const variant of ['baseline','current']){
   const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,
    recordVideo:{dir:out,size:{width:1280,height:720}}});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.route('**/proof?variant='+variant,r=>r.fulfill({contentType:'text/html',body:host(variant)}));
   await page.goto(origin+'/proof?variant='+variant);
   const frame=page.frames().find(x=>x.url().includes('/watch/soccerjs/dist/index.html'));
   assert(frame,'Viewer iframe '+variant);
   await frame.waitForFunction(()=>window.__PFC_VIEWER_READY__===true,null,{timeout:90000});
   await frame.evaluate(()=>{
    const p=document.querySelector('#projection'),c=document.querySelector('#camera'),s=document.querySelector('#speed');
    p.value='orthographic';p.dispatchEvent(new Event('change',{bubbles:true}));
    c.value='follow';c.dispatchEvent(new Event('change',{bubbles:true}));
    s.value='4';s.dispatchEvent(new Event('change',{bubbles:true}));
   });
   const start=f.reproduction.clearanceStartSeconds-1.5;
   await frame.evaluate(t=>{const e=document.querySelector('#scrub');e.value=String(t/60);
    e.dispatchEvent(new Event('input',{bubbles:true}))},start);
   await frame.waitForFunction(t=>Math.abs(window.__PFC_SNAPSHOT__.minute*60-t)<.001,start);
   const setup=await frame.evaluate(()=>window.__PFC_SNAPSHOT__);
   assert.equal(setup.projection,'orthographic');assert.equal(setup.camera,'follow');
   await page.waitForTimeout(250);
   await frame.evaluate(()=>document.querySelector('#play').click());
   await frame.waitForFunction(t=>window.__PFC_SNAPSHOT__?.minute*60>=t-.02,
    f.reproduction.goalMinute*60,{timeout:20000});
   await page.waitForTimeout(650);
   const at=await frame.evaluate(()=>window.__PFC_SNAPSHOT__);
   assert.equal(at.officialEventType,'goal');
   assert.deepEqual(errors,[]);
   const recorded=page.video();
   await context.close();
   const videoPath=await recorded.path();
   fs.renameSync(videoPath,path.join(out,variant+'-broadcast-follow-4x.webm'));
   fs.writeFileSync(path.join(out,variant+'-proof.json'),JSON.stringify({
    visualSeed:f.visualSeed,officialGoalMinute:f.reproduction.goalMinute,
    camera:'follow',projection:'orthographic',speed:4,
    expectedClearance:f.reproduction.clearanceStartSeconds,
    commit:variant==='baseline'?f.reproduction.sourceCommit:process.env.GITHUB_SHA||'current',
    endedWithOfficialGoal:true},null,2));
   console.log('PASS same-camera/speed proof '+variant+': '+at.officialEventType);
  }
 }finally{if(browser)await browser.close();server.kill('SIGTERM')}
})().catch(e=>{console.error(e);process.exitCode=1});
