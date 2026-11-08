'use strict';
// Native Soccer-JS Chromium test. All generated match data remains PSE-owned.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const fixture=require('../watch/soccerjs/repros/opposite-clearance-buildup-64.json');
const root=path.resolve(__dirname,'..'),out=path.join(root,'celebration-browser-artifacts');
const dist=path.join(root,'watch/soccerjs/dist'),origin='http://127.0.0.1:8773';
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(dist,'fixture.json'),JSON.stringify(fixture));
const server=spawn('python3',['-m','http.server','8773','--bind','127.0.0.1','--directory',root],{stdio:'ignore'});
const url=origin+'/watch/soccerjs/dist/index.html';
const original=JSON.stringify(fixture);
const goals=fixture.events.filter(e=>e.type==='goal');
const chosen=[goals[0],goals.find(e=>e.team===fixture.away.id)];
assert(chosen.every(Boolean),'Both scoring sides required');
const expectedScore=t=>[fixture.home.id,fixture.away.id].map(team=>
 goals.filter(e=>e.team===team&&e.minute<=t).length);
function dist(a,b){return Math.hypot(a[0]-b.x,a[1]-b.y)}
(async()=>{let browser;
 try{
  for(let i=0;i<60;i++){try{if((await fetch(url)).ok)break}catch(_){}await new Promise(r=>setTimeout(r,100))}
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const [device,viewport] of [['desktop',{width:1440,height:960}],['mobile',{width:390,height:844}]]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__PFC_VIEWER_READY__===true,null,{timeout:90000});
   const snap=()=>page.evaluate(()=>window.__PFC_SNAPSHOT__);
   const seek=async minute=>{
    await page.locator('#scrub').evaluate((el,value)=>{
     el.step='any';el.value=String(value);
     el.dispatchEvent(new Event('input',{bubbles:true}));
    },minute);
    await page.waitForFunction(v=>Math.abs(window.__PFC_SNAPSHOT__.minute-v)<.00001,minute);
   };
   for(const [i,goal] of chosen.entries()){
    const rate=i===0?1:16;
    await seek(goal.minute-.012);
    await page.locator('#speed').selectOption(String(rate));
    await page.locator('#play').click();
    await page.waitForFunction(()=>window.__PFC_SNAPSHOT__?.goalCelebrationActive===true,
     null,{timeout:15000});
    const first=await snap();
    assert.equal(first.animation,'official-goal-celebration');
    assert.equal(first.officialEventType,'goal');
    assert.equal(first.celebration.scorerName,fixture[goal.team===fixture.home.id?'home':'away'].lineup.find(x=>x.id===goal.player).name);
    assert(Math.abs(first.minute-goal.minute)<.00001,'3s celebration must NOT advance PSE clock');
    assert.deepEqual(first.score,expectedScore(goal.minute));
    assert.equal(first.celebration.duration,3);
    assert(!first.celebration.reducedMotion);
    for(const view of ['orthographic','isometric','topdown']){
     await page.locator('#projection').selectOption(view);
     const scene=await snap();
     assert.equal(scene.projection,view);
     assert.equal(scene.officialEventType,'goal');
     assert(scene.celebration.angleDegrees>=-19&&scene.celebration.angleDegrees<=19);
     assert(scene.celebration.zoom>=1&&scene.celebration.zoom<=1.24);
     if(i===0)await page.locator('.pitchwrap').screenshot({path:path.join(out,
      'scorer-'+device+'-'+view+'.png')});
    }
    await page.locator('#projection').selectOption('orthographic');
    await page.locator('#pause').click();
    const paused=(await snap()).celebration.elapsed;
    await page.waitForTimeout(250);
    assert(Math.abs((await snap()).celebration.elapsed-paused)<.03,
     'Celebration continues during pause');
    const lo=await snap();await page.locator('#zoomOut').click();
    const small=await snap();await page.locator('#zoomIn').click();await page.locator('#zoomIn').click();
    const large=await snap();
    assert(large.spritePixelSize>small.spritePixelSize,'Pokémon sprites ignore zoom');
    assert(large.ballPixelRadius>small.ballPixelRadius,'Ball ignores proportional zoom');
    assert(Math.abs(large.spritePixelSize/large.ballPixelRadius-
     small.spritePixelSize/small.ballPixelRadius)<.15,'Ball scales differently from Pokémon');
    assert(Math.abs(large.minute-goal.minute)<.00001);
    // Fullscreen layout should retain the same celebration and scalable art.
    await page.evaluate(()=>document.documentElement.classList.add('pfc-watch-fullscreen'));
    assert((await snap()).celebration);
    await page.evaluate(()=>document.documentElement.classList.remove('pfc-watch-fullscreen'));
    await page.locator('#play').click();
    await page.waitForFunction(v=>window.__PFC_SNAPSHOT__?.celebration?.elapsed>v+.18,
     paused,{timeout:5000});
    await page.locator('#skipCelebration').click();
    await page.waitForFunction(()=>!document.querySelector('#highlightNotice').hidden);
    assert.equal((await snap()).goalCelebrationActive,false);
    // The existing replay modal remains available AFTER the celebration.
    await page.locator('#highlightNoticePlay').click();
    await page.waitForFunction(()=>!document.querySelector('#highlightReplay').hidden);
    await page.locator('#highlightReplayReturn').click();
    await page.waitForFunction(()=>!document.querySelector('#highlightNotice').hidden);
    await page.locator('#highlightNoticeDismiss').click();
    const kick=await snap();
    assert.equal(kick.ballContact,'kickoff-setup',
     'Continue shows players walking/ball rolling back to midfield');
    assert.equal(kick.ball.x,53);assert.equal(kick.ball.y,34);
    assert(kick.kickoff,'Existing two-player midfield restart must be reused');
    const players=kick.actorWorldPositions.map((p,id)=>({p,id}))
     .filter(o=>Math.hypot(o.p[0]-53,o.p[1]-34)<9.15).map(x=>x.id);
    assert.deepEqual(players,[kick.kickoff.kicker,kick.kickoff.receiver]);
    assert.deepEqual(kick.score,expectedScore(kick.minute),'PSE score changed at restart');
    console.log('PASS '+device+' scoring side '+goal.team+' @ '+rate+'×: scorer, pause, 3 cameras, zoom, skip, replay and direct kickoff');
    await page.locator('#pause').click();
   }
   // Verify reduced-motion static scorer (no orbit, hops or zoom) with full 3s hold.
   await page.emulateMedia({reducedMotion:'reduce'});
   const goal=chosen[0];
   await seek(goal.minute-.012);await page.locator('#speed').selectOption('4');
   await page.locator('#play').click();
   await page.waitForFunction(()=>window.__PFC_SNAPSHOT__?.goalCelebrationActive,
    null,{timeout:15000});
   const reduced=await snap();assert(reduced.celebration.reducedMotion);
   assert.equal(reduced.celebration.angleDegrees,0);assert.equal(reduced.celebration.zoom,1);
   assert.equal(reduced.celebration.duration,3);
   await page.locator('#skipCelebration').click();
   await page.waitForFunction(()=>!document.querySelector('#highlightNotice').hidden);
   assert.deepEqual(errors,[],'Uncaught Soccer-JS JavaScript error');
   console.log('PASS '+device+' reduced-motion scorer fallback, no unintended PSE events');
   await page.close();
  }
  assert.equal(JSON.stringify(fixture),original);
 }finally{if(browser)await browser.close();server.kill('SIGTERM')}
})().catch(e=>{console.error(e);process.exitCode=1});
