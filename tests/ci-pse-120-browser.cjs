'use strict';
// CI-only real Chromium rendering: no deployment or network beyond browser assets.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const qs=require('../quick-sim.js'),knockout=require('../pse-knockout.js'),
 bridge=require('../watch/soccerjs/watch-bridge.js');
const roles=['GK','DEF','DEF','DEF','DEF','MID','MID','MID','FWD','FWD','FWD'];
function team(id,offset){return {id,name:id+' FC',tactic:'balanced',
 lineup:roles.map((pos,i)=>({id:id+'-'+i,name:id+' Pokémon '+i,pos,
 speciesId:offset+i+1,jerseyNumber:i+1,
 main:{finishing:70+i,shortPassing:72+i,vision:70+i,firstTouch:68+i,sprintSpeed:71+i,tackling:71+i},
 detail:{reflexes:70+i,handling:71+i,positioning:71+i,diving:70+i,composure:70+i}}))};}
const preview={seed:'BROWSER-KO',home:team('pewter',0),away:team('cerulean',11)};
let found=null;
for(let n=0;n<800;n++){
 const seed='CI-120-'+n,reg=qs.simulate(preview,{seed});
 const ko=knockout.resolve(preview,reg,{seed});
 if(ko.shootout?.attempts.length>=6){found=ko;break;}
}
assert(found,'No seeded official PSE shootout match available');
const fixture=bridge.snapshot(preview,{...found.match,shootout:found.shootout});
assert.equal(fixture.durationMinutes,120);
const fixturePath=path.join(root,'watch/soccerjs/dist/fixture.json');
fs.writeFileSync(fixturePath,JSON.stringify(fixture));
const screenshotDir=process.env.GITHUB_WORKSPACE?
 path.join(process.env.GITHUB_WORKSPACE,'pse-browser-artifacts'):
 path.join(root,'pse-browser-artifacts');
fs.mkdirSync(screenshotDir,{recursive:true});
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1','--directory',root],
 {stdio:'ignore'});
const url='http://127.0.0.1:8765/watch/soccerjs/dist/index.html';
async function serve(){
 for(let tries=0;tries<50;tries++){
  try{const res=await fetch(url);if(res.ok)return}catch{}
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 throw Error('Local CI viewer web server did not initialize');
}
(async()=>{
 let browser;
 try{
  await serve();
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const [device,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]){
   const page=await browser.newPage({viewport,deviceScaleFactor:1});
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>window.__PFC_VIEWER_READY__||window.__PFC_VIEWER_ERROR__,null,{timeout:120000});
   const state=await page.evaluate(()=>({
    ready:window.__PFC_VIEWER_READY__,error:window.__PFC_VIEWER_ERROR__,
    initial:window.__PFC_SNAPSHOT__,width:document.documentElement.scrollWidth,
    innerWidth:window.innerWidth
   }));
   assert(state.ready,'Native Soccer-JS failed to boot on '+device+': '+state.error+' '+errors.join('; '));
   assert.equal(state.initial.durationMinutes,120);
   assert.equal(state.initial.players,22);
   assert.equal(state.initial.phase,'regulation');
   assert(state.initial.pokemonEntitiesDrawn>0,'No Pokémon sprites drawn on '+device);
   for(const minute of [90,105,119,120]){
    await page.locator('#scrub').evaluate((el,v)=>{
     el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));
    },minute);
    const snap=await page.evaluate(()=>window.__PFC_SNAPSHOT__);
    assert.equal(snap.minute,minute);
    assert.deepEqual(snap.score,bridge.scoreAt(fixture,minute));
    assert.equal(snap.phase,minute===120?'shootout':'extra-time');
   }
   assert(await page.locator('#shootoutOverlay').isVisible(),'Shootout overlay absent');
   assert.match(await page.locator('#shootoutScore').innerText(),/PENALTIES 0 – 0/);
   const initialKicks=fixture.shootout.attempts.length;
   await page.locator('#shootoutAdvance').click();
   const shot=await page.evaluate(()=>window.__PFC_SNAPSHOT__);
   assert.equal(shot.kickIndex,1);
   assert.match(shot.animation,/^official-shootout-/);
   for(let i=1;i<initialKicks;i++)await page.locator('#shootoutAdvance').click();
   const final=await page.evaluate(()=>window.__PFC_SNAPSHOT__);
   assert.equal(final.kickIndex,initialKicks);
   assert.deepEqual(final.score,fixture.score,'Full-time score is not overwritten by shootout');
   const label=await page.locator('#shootoutScore').innerText();
   assert(label.includes(fixture.shootout.home+' – '+fixture.shootout.away),'Final penalty tally wrong');
   await page.screenshot({path:path.join(screenshotDir,'pse-120-'+device+'.png'),fullPage:true});
   if(device==='mobile'){
    const dims=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert(dims.width<=dims.viewport+4,'Mobile layout overflows horizontally: '+JSON.stringify(dims));
    const rect=await page.locator('#shootoutAdvance').boundingBox();
    // Hidden after final kick; the 44px touch target is checked in CSS contract tests.
    assert.equal(rect,null);
   }
   assert.deepEqual(errors,[],'JavaScript console errors on '+device);
   console.log('PASS real Soccer-JS Chromium',device,fixture.score,
    '90–120 minute replay and',initialKicks,'official shootout kicks');
   await page.close();
  }
 }finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
 }
})().catch(error=>{console.error(error);process.exitCode=1});
