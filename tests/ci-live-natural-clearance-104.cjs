'use strict';
// Read-only deployed SiteGround reproduction of Issue #104. This runs only
// AFTER the main deployment completes successfully; never mutates production.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const Director=require('../watch/soccerjs/phase10-play-director.cjs');
const {motionFrame}=require('../watch/soccerjs/phase10-motion.cjs');
const fixture=require('../watch/soccerjs/repros/natural-clearance-104.json');
const field={width:106,height:68},origin='https://pfc.cliffslunchclub.com';
const out=path.resolve(__dirname,'../natural-clearance-live-proof');
fs.mkdirSync(out,{recursive:true});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const plan=Director.planFor(fixture,field);
const stages=plan.actions.filter(a=>a.pattern==='defensive-clearance'&&a.clearance&&
 !a.clearance.truncated&&a.start>30&&a.end<5300&&
 motionFrame(fixture,(a.start+a.end)/120,field).action==='illustrative-upfield-clearance');
const selected=[0,1].map(side=>stages.find(a=>Math.floor(a.owner/11)===side));
assert(selected.every(Boolean),'Need both-team visibly illustrated 25–35m clearances');
const host='<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}iframe{width:100vw;height:100vh;border:0}</style></head><body>'+
 '<iframe src="/watch/soccerjs/dist/index.html?embedded=1&inline=1"></iframe>'+
 '<script>const fixture='+JSON.stringify(fixture)+';window.addEventListener("message",e=>{'+
 'if(e.data?.type==="pfc-phase10-ready")e.source.postMessage({type:"pfc-phase10-fixture",fixture},location.origin)});</script></body></html>';
(async()=>{let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/__pfc_natural_clearance_proof__',r=>r.fulfill({contentType:'text/html',body:host}));
  await page.goto(origin+'/__pfc_natural_clearance_proof__',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.__PFC_VIEWER_READY__===true,
   null,{timeout:90000});
  const frame=page.frames().find(f=>f.url().includes('/watch/soccerjs/dist/index.html'));
  assert(frame,'Live production Soccer-JS iframe missing');
  const seek=async seconds=>{
   await page.evaluate(s=>document.querySelector('iframe').contentWindow.postMessage(
    {type:'pfc-phase10-control',action:'seek',minute:s/60},location.origin),seconds);
   await frame.waitForFunction(s=>Math.abs(window.__PFC_SNAPSHOT__?.minute*60-s)<.001,seconds);
   return frame.evaluate(()=>window.__PFC_SNAPSHOT__);
  };
  for(const [side,a] of selected.entries()){
   const range=distance(a.from,a.to);
   assert(range>=24.99&&range<=35.01,'Natural clearance no longer within 25–35m');
   let baseline;
   for(const speed of [1,4,16]){
    await frame.evaluate(speed=>{const el=document.querySelector('#speed');
     el.value=String(speed);el.dispatchEvent(new Event('change',{bubbles:true}));},speed);
    const at=await seek((a.start+a.end)/2);
    assert.equal(at.animation,'illustrative-upfield-clearance',
     'Deployed build does not contain physical clearance on team '+side);
    assert.equal(at.carrier,-1,'Ball must be in flight, not held by idle keeper');
    assert.equal(at.scheduleConflict,null);
    if(baseline)assert(distance(baseline,at.ball)<.00001,'Speed changed ball trajectory');
    baseline=at.ball;
   }
   const received=await seek(a.end+.02);
   assert.equal(received.carrier,a.receiver,'Visible first touch assigned to wrong Pokémon');
   assert(distance({x:received.actorWorldPositions[a.receiver][0],y:received.actorWorldPositions[a.receiver][1]},received.ball)<1.6,
    'Receiver did not physically meet the ball');
   await frame.locator('.pitchwrap').screenshot({path:path.join(out,'side-'+side+'-arrival.png')});
   console.log('PASS live side '+side+' '+range.toFixed(2)+'m controlled clearance, 1x/4x/16x reproducibility');
  }
  for(const goal of fixture.events.filter(e=>e.type==='goal')){
   const frameAt=await seek(goal.minute*60);
   assert.equal(frameAt.officialEventType,'goal','Watch displaced official PSE goal');
  }
  assert.deepEqual(errors,[],'Production browser error');
  console.log('PASS deployed SiteGround natural clearance #104, both teams, official PSE goals, all playback speeds');
 }finally{if(browser)await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
