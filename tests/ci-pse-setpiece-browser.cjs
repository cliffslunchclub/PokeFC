'use strict';
// Real Chromium set-piece Watch QA, run after native Soccer-JS bundle is built.
// This is a non-deploying, opt-in ruleset fixture test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const qs=require('../quick-sim.js'),bridge=require('../watch/soccerjs/watch-bridge.js');
const root=path.resolve(__dirname,'..');
const roles=['GK','DEF','DEF','DEF','DEF','MID','MID','MID','FWD','FWD','FWD'];
function team(id,offset){
 return {id,name:id+' FC',tactic:'press',lineup:roles.map((pos,i)=>({
  id:id+'-'+i,name:id+' Pokémon '+i,pos,speciesId:offset+i+1,jerseyNumber:i+1,
  main:{finishing:73+i,shortPassing:74+i,vision:73+i,firstTouch:72+i,sprintSpeed:75+i,tackling:75+i},
  detail:{reflexes:72,handling:73,positioning:75,diving:73,kicking:74,composure:73}
 }))};
}
const preview={seed:'PSE-SET-BROWSER',home:team('home',0),away:team('away',11)};
function isolated(result,type){
 const target=result.events.find(e=>{
  if(e.type!==type||e.minute>=89.5)return false;
  // A single on-screen action cannot depict two simultaneous incidents.
  return result.events.every(other=>other===e||!['goal','corner','free-kick','penalty-kick'].includes(other.type)||
   Math.abs(other.minute-e.minute)>.55);
 });
 return target||null;
}
let chosen;
for(let n=0;n<900;n++){
 const result=qs.simulate(preview,{seed:'BROWSER-SET-'+n,setPieces:'v1'});
 const corner=isolated(result,'corner'),freeKick=isolated(result,'free-kick'),
  penalty=isolated(result,'penalty-kick');
 if(corner&&freeKick&&penalty){chosen={result,corner,freeKick,penalty};break;}
}
assert(chosen,'Need seeded fixture with isolated PSE corner/free kick/match penalty');
const fixture=bridge.snapshot(preview,chosen.result);
assert.equal(fixture.setPieceRules,'v1');
assert.equal(fixture.durationMinutes,90);
const fixturePath=path.join(root,'watch/soccerjs/dist/fixture.json');
fs.writeFileSync(fixturePath,JSON.stringify(fixture));
const screenshots=path.join(root,'pse-browser-artifacts');
fs.mkdirSync(screenshots,{recursive:true});
const server=spawn('python3',['-m','http.server','8766','--bind','127.0.0.1','--directory',root],{stdio:'ignore'});
const url='http://127.0.0.1:8766/watch/soccerjs/dist/index.html';
async function serve(){
 for(let tries=0;tries<50;tries++){
  try{const res=await fetch(url);if(res.ok)return}catch{}
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 throw Error('Set-piece browser server did not initialize');
}
(async()=>{
 let browser;
 try{
  await serve();
  browser=await chromium.launch({headless:true,args:['--no-sandbox'],
   ...(process.env.PFC_CHROME_BIN?{executablePath:process.env.PFC_CHROME_BIN}:{})});
  for(const [device,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]){
   const page=await browser.newPage({viewport,deviceScaleFactor:1});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.__PFC_VIEWER_READY__||window.__PFC_VIEWER_ERROR__,null,{timeout:120000});
   const initial=await page.evaluate(()=>window.__PFC_SNAPSHOT__);
   assert(initial,'No rendered Watch frame on '+device);
   assert.deepEqual(initial.score,[0,0]);
   assert.equal(initial.players,22);
   assert.equal(initial.durationMinutes,90);
   const step=Number(await page.locator('#scrub').getAttribute('step'))||.05;
   for(const [type,event] of [['corner',chosen.corner],['free-kick',chosen.freeKick],['penalty-kick',chosen.penalty]]){
    const minute=Math.ceil((event.minute+.03)/step)*step;
    await page.locator('#scrub').evaluate((el,v)=>{
     el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));
    },minute);
    const snap=await page.evaluate(()=>window.__PFC_SNAPSHOT__);
    assert.equal(snap.officialEventId,event.id,type+' did not animate an official PSE event on '+device);
    assert.equal(snap.officialEventType,type);
    assert.equal(snap.animation,'official-'+type);
    assert.deepEqual(snap.score,bridge.scoreAt(fixture,minute),'Watch must not change official PSE score');
    assert.equal(snap.players,22);
    await page.screenshot({path:path.join(screenshots,'pse-v1-'+type+'-'+device+'.png')});
   }
   // Match Highlights exposes only already-recorded corners/free kicks/PKs.
   await page.locator('#highlightToggle').click();
   await page.locator('[data-highlight-filter="set"]').click();
   const count=await page.locator('#highlightList .highlight-entry').count();
   assert(count>0,'Recorded set pieces missing from Highlights on '+device);
   await page.locator('#highlightList .highlight-entry button').first().click();
   const replay=await page.evaluate(()=>window.__PFC_SNAPSHOT__);
   assert.equal(replay.replay?.kind,'set-piece');
   await page.locator('#highlightReplayReturn').click();
   const resumed=await page.evaluate(()=>window.__PFC_SNAPSHOT__);
   assert.equal(resumed.replay,null);
   assert.deepEqual(resumed.score,bridge.scoreAt(fixture,resumed.minute));
   if(device==='mobile'){
    const dim=await page.evaluate(()=>({page:document.documentElement.scrollWidth,screen:innerWidth}));
    assert(dim.page<=dim.screen+4,'Mobile set-piece Watch overflow');
   }
   assert.deepEqual(errors,[],'Browser JS error '+device+': '+errors.join('; '));
   console.log('PASS PSE set-piece 2.5D Chromium '+device+
    ' official corner/free kick/match penalty, no result mutation, replay return');
   await page.close();
  }
 }finally{if(browser)await browser.close();server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1});
