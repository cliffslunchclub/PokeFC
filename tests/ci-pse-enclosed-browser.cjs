'use strict';
// Real Chromium no-whistle enclosed Watch QA, after native Soccer-JS bundle.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const qs=require('../assets/js/quick-sim.js'),bridge=require('../watch/soccerjs/watch-bridge.js');
const root=path.resolve(__dirname,'..');
const roles=['GK','DEF','DEF','DEF','DEF','MID','MID','MID','FWD','FWD','FWD'];
function team(id,offset){
 return {id,name:id+' FC',tactic:'press',lineup:roles.map((pos,i)=>({
  id:id+'-'+i,name:id+' Pokémon '+i,pos,speciesId:offset+i+1,jerseyNumber:i+1,
  main:{finishing:73+i,shortPassing:74+i,vision:73+i,firstTouch:72+i,sprintSpeed:75+i,tackling:75+i},
  detail:{reflexes:72,handling:73,positioning:75,diving:73,kicking:74,composure:73}
 }))};
}
const preview={seed:'PSE-ENCLOSED-BROWSER',home:team('home',0),away:team('away',11)};
let result;
for(let n=0;n<100;n++){
 const next=qs.simulate(preview,{seed:'ENCLOSED-BROWSER-'+n});
 if(next.events.some(e=>e.type==='goal'&&e.minute>3&&e.minute<86)){result=next;break;}
}
assert(result,'Need a deterministic seeded match with a goal');
assert(result.events.every(e=>e.type==='goal'||e.type==='save'));
const fixture=bridge.snapshot(preview,result);
assert.equal(fixture.setPieceRules,undefined);
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
 throw Error('Enclosed-pitch browser server did not initialize');
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
   assert.equal(initial.enclosedPitch,true,'Enclosure not rendered '+device);
   assert.equal(initial.boardSegments,6,'Goal openings or boards missing '+device);
   const step=Number(await page.locator('#scrub').getAttribute('step'))||.05;
   for(const minute of [5,15,30,55,80]){
    const scrub=Math.floor(minute/step)*step;
    await page.locator('#scrub').evaluate((el,v)=>{
     el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));
    },scrub);
    const snap=await page.evaluate(()=>window.__PFC_SNAPSHOT__);
    assert.equal(snap.enclosedPitch,true);
    assert.equal(snap.boardSegments,6);
    assert(!['official-corner','official-foul','official-free-kick','official-penalty-kick'].includes(snap.animation),
     'Unexpected retired whistle scene');
    if(!['official-goal','illustrative-goal-buildup','illustrative-shot','illustrative-kickoff'].includes(snap.animation))
     assert(snap.ball.x>=0&&snap.ball.x<=106&&snap.ball.y>=0&&snap.ball.y<=68,
      'Ball escaped enclosure without a goal');
    assert.deepEqual(snap.score,bridge.scoreAt(fixture,scrub),'Viewer changed official score');
   }
   const firstGoal=fixture.events.find(e=>e.type==='goal'&&e.minute>3&&e.minute<86);
   await page.locator('#scrub').evaluate((el,v)=>{
    el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));
   },Math.ceil((firstGoal.minute+.03)/step)*step);
   await page.locator('#highlightToggle').click();
   await page.locator('[data-highlight-filter="set"]').click();
   assert.equal(await page.locator('#highlightList .highlight-entry').count(),0,
    'No set-piece highlights permitted in regulation');
   await page.locator('[data-highlight-filter="goal"]').click();
   assert((await page.locator('#highlightList .highlight-entry').count())>0,
    'Official goal replay missing');
   await page.screenshot({path:path.join(screenshots,'enclosed-no-whistles-'+device+'.png')});
   await page.locator('#highlightList .highlight-entry button').first().click();
   const replay=await page.evaluate(()=>window.__PFC_SNAPSHOT__);
   assert.equal(replay.replay?.kind,'goal');
   await page.locator('#highlightReplayReturn').click();
   const resumed=await page.evaluate(()=>window.__PFC_SNAPSHOT__);
   assert.equal(resumed.replay,null);
   assert.deepEqual(resumed.score,bridge.scoreAt(fixture,resumed.minute));
   if(device==='mobile'){
    const dim=await page.evaluate(()=>({page:document.documentElement.scrollWidth,screen:innerWidth}));
    assert(dim.page<=dim.screen+4,'Mobile set-piece Watch overflow');
   }
   assert.deepEqual(errors,[],'Browser JS error '+device+': '+errors.join('; '));
   console.log('PASS enclosed PokéFC Chromium '+device+
    ' six perimeter boards, goals and saves only, no whistle highlights, stable replay');
   await page.close();
  }
 }finally{if(browser)await browser.close();server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1});
