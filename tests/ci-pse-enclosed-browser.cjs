'use strict';
// Real Chromium no-whistle enclosed Watch QA, after native Soccer-JS bundle.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const qs=require('../assets/js/quick-sim.js'),bridge=require('../watch/soccerjs/watch-bridge.js');
const {planFor,sample}=require('../watch/soccerjs/phase10-play-director.cjs');
const {motionFrame}=require('../watch/soccerjs/phase10-motion.cjs');
const OneOnOne=require('../watch/soccerjs/phase10-one-on-one.cjs');
const {rawMotionFrame}=require('../watch/soccerjs/phase10-motion.cjs');
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
let result,keeperSceneSeconds;
for(let n=0;n<100;n++){
 const next=qs.simulate(preview,{seed:'ENCLOSED-BROWSER-'+n});
 const candidate=bridge.snapshot(preview,next),field={width:106,height:68};
 for(const goal of candidate.events.filter(e=>e.type==='goal'&&e.minute>3&&e.minute<86)){
  const attack=goal.team===candidate.home.id?0:1,start=(goal.minute-.7)*60;
  const initial=sample(candidate,field,start);
  const depth=attack===0?106-initial.ball.x:initial.ball.x;
  if(depth>13||Math.abs(initial.ball.y-34)>5||Math.floor(initial.stage.owner/11)!==attack)continue;
  const sec=start+42*.82,frame=motionFrame(candidate,sec/60,field);
  const keeper=frame.actors[(1-attack)*11];
  if(frame.goalkeeperRushSide===1-attack&&Math.hypot(keeper.x-frame.ball.x,keeper.y-frame.ball.y)<2){
   result=next;keeperSceneSeconds=sec;break;
  }
 }
 if(result)break;
}
assert(result,'Need a deterministic seeded match with a goal');
assert(result.events.every(e=>e.type==='goal'||e.type==='save'));
const fixture=bridge.snapshot(preview,result);
assert.equal(fixture.setPieceRules,undefined);
assert.equal(fixture.durationMinutes,90);
const stagePlan=planFor(fixture,{width:106,height:68});
const attempts=OneOnOne.build(fixture,{width:106,height:68},
 sec=>rawMotionFrame(fixture,sec/60,{width:106,height:68}));
const outsideGoal=stage=>!fixture.events.some(e=>e.type==='goal'&&
 stage.start<e.minute*60+18&&stage.end>e.minute*60-43);
const bank=stagePlan.actions.find(stage=>stage.mode==='pass'&&stage.wall&&
 stage.start>120&&stage.end<85*60&&stage.wall.impactU>.2&&
 stage.wall.impactU<.8&&outsideGoal(stage)&&
 !motionFrame(fixture,(stage.start+stage.duration*stage.wall.impactU)/60,{width:106,height:68}).oneOnOne);
const pickup=stagePlan.actions.find(stage=>stage.mode==='rebound'&&
 stage.wall&&stage.start>120&&stage.end<85*60&&outsideGoal(stage)&&
 !motionFrame(fixture,(stage.start+stage.duration*.975)/60,{width:106,height:68}).oneOnOne);
const attempt=attempts.find(a=>a.start>60&&outsideGoal(a));
assert(attempt,'Need a non-scoring actual one-on-one attempt');
assert(bank&&pickup,'Need native browser bank and loose-ball recovery examples');
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
   // Exact time seek is test-only: production keeps ordinary 0.05-minute
   // scrub steps, while physically meaningful wall impacts occur in seconds.
   const seekExact=async seconds=>page.locator('#scrub').evaluate((el,sec)=>{
    el.step='any';el.value=String(sec/60);
    el.dispatchEvent(new Event('input',{bubbles:true}));
   },seconds);
   for(const view of ['orthographic','isometric','topdown']){
    await page.locator('#projection').selectOption(view);
    await seekExact(attempt.start+.03);
    const shot=await page.evaluate(()=>window.__PFC_SNAPSHOT__);
    assert.equal(shot.animation,'illustrative-one-on-one-shot');
    assert.equal(shot.carrier,-1);assert.equal(shot.oneOnOne.shooter,attempt.shooter);
    await seekExact(attempt.impactSeconds+.0001);
    const blocked=await page.evaluate(()=>window.__PFC_SNAPSHOT__);
    assert.equal(blocked.animation,'illustrative-keeper-block');
    assert.equal(blocked.officialEventType,null);
    const keeper=blocked.actorWorldPositions[attempt.keeper];
    assert(Math.hypot(blocked.ball.x-keeper[0],blocked.ball.y-keeper[1])<.55,
     'Keeper block did not visibly contact the ball');
    assert.deepEqual(blocked.score,bridge.scoreAt(fixture,blocked.minute));
    await page.locator('.pitchwrap').screenshot({path:path.join(screenshots,
     'immediate-shot-block-'+view+'-'+device+'.png')});
   }
   await seekExact(keeperSceneSeconds);
   for(const view of ['orthographic','isometric','topdown']){
    await page.locator('#projection').selectOption(view);
    const scene=await page.evaluate(()=>window.__PFC_SNAPSHOT__);
    for(const goal of scene.goalGeometry){
     const rails=scene.boardGeometry.filter(s=>s[0][0]===goal.x&&s[1][0]===goal.x);
     assert.equal(rails.length,2);
     assert(rails.every(s=>s[1][1]<goal.min||s[0][1]>goal.max),
      'Rendered wall extends between native goalposts in '+view);
    }
    const side=scene.goalkeeperRushSide;
    assert(side===0||side===1,'Goal-scene keeper must charge in '+view);
    const keeper=scene.actorWorldPositions[side*11];
    assert(Math.hypot(keeper[0]-scene.ball.x,keeper[1]-scene.ball.y)<2,
     'Rendered keeper did not close the one-on-one in '+view);
    await page.locator('.pitchwrap').screenshot({path:path.join(screenshots,'goal-clearance-keeper-'+view+'-'+device+'.png')});
   }
   await page.locator('#projection').selectOption('orthographic');
   const at=bank.start+bank.duration*bank.wall.impactU;
   await seekExact(at);
   const impact=await page.evaluate(()=>window.__PFC_SNAPSHOT__);
   assert.equal(impact.animation,'illustrative-bank-pass');
   assert.equal(impact.carrier,-1,'Ball cannot be carried during bank pass');
   assert.equal(impact.wallContact?.axis,bank.wall.axis,'Wrong board contact axis');
   assert.equal(impact.wallContact?.edge,bank.wall.edge,'Wrong board contacted');
   assert(Math.hypot(impact.ball.x-bank.wall.hit.x,
    impact.ball.y-bank.wall.hit.y)<.025,
    'Native renderer never reached physical wall contact');
   assert.deepEqual(impact.score,bridge.scoreAt(fixture,impact.minute));
   await page.screenshot({path:path.join(screenshots,'pfc-wall-bank-'+device+'.png')});
   await seekExact(at+.075);
   const bounce=await page.evaluate(()=>window.__PFC_SNAPSHOT__);
   assert.equal(bounce.animation,'illustrative-bank-pass');
   assert.equal(bounce.ballContact,'bank-rebound');
   await seekExact(pickup.start+pickup.duration*.975);
   const gathered=await page.evaluate(()=>window.__PFC_SNAPSHOT__);
   assert.equal(gathered.animation,pickup.receiver%11===0?
    'illustrative-keeper-collection':'illustrative-wall-pickup',
    'Rebound collector must match the scripted receiver, including GK');
   assert.equal(gathered.ballContact,'collected-loose-ball');
   assert(gathered.carrier>=0,'Loose ball was not recovered by a Pokémon');
   assert.equal(gathered.wallContact?.axis,pickup.wall.axis);
   assert.deepEqual(gathered.score,bridge.scoreAt(fixture,gathered.minute));
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
    ' four-board physical banks, loose-ball pickup, six boards, no whistles, stable goal replay');
   // The production game uses the *embedded* iframe, not the standalone
   // Watch page. Check its actual positioned overlay and zoom controls.
   await page.goto(url+'?embedded=1&inline=1&v=19',
    {waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>
    document.documentElement.classList.contains('pfc-inline'),
    null,{timeout:20000});
   const overlay=await page.evaluate(()=>{
    const pitch=document.querySelector('.pitchwrap')?.getBoundingClientRect();
    const panel=document.getElementById('commentaryPanel');
    const rect=panel?.getBoundingClientRect();
    const style=panel&&getComputedStyle(panel);
    const zoom=document.getElementById('zoomIn');
    const zoomRect=zoom?.getBoundingClientRect();
    const toggle=document.getElementById('commentaryToggle');
    return {pitch:pitch&&{x:pitch.x,y:pitch.y,width:pitch.width,height:pitch.height},
     panel:rect&&{x:rect.x,y:rect.y,width:rect.width,height:rect.height},
     visible:!!style&&style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0',
     positioned:style?.position,zoomVisible:!!zoomRect&&zoomRect.width>20&&zoomRect.height>20,
     hasHistory:!!toggle&&toggle.getAttribute('aria-controls')==='commentaryHistory'};
   });
   assert(overlay.visible&&overlay.positioned==='absolute',
    'Embedded commentary panel was not visibly positioned: '+JSON.stringify(overlay));
   assert(overlay.panel?.width>150&&overlay.panel?.height>30,
    'Embedded commentary is missing its lower third: '+JSON.stringify(overlay));
   assert(overlay.panel.y>=overlay.pitch.y-2&&
    overlay.panel.y+overlay.panel.height<=overlay.pitch.y+overlay.pitch.height+2,
    'Embedded commentary must be inside the visible match pitch');
   assert(overlay.zoomVisible&&overlay.hasHistory,
    'Embedded Watch must show camera zoom and commentary history controls');
   console.log('PASS embedded PokéFC Chromium '+device+
    ' commentary lower-third, zoom buttons, history and pitch positioning');
   await page.close();
  }
 }finally{if(browser)await browser.close();server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1});
