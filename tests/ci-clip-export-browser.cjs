'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const fixture=require('../watch/soccerjs/repros/opposite-clearance-buildup-64.json');
const root=path.resolve(__dirname,'..'),live=process.env.PFC_LIVE_SITE==='1',
 origin=live?'https://pfc.cliffslunchclub.com':'http://127.0.0.1:8770';
const out=path.join(root,'clip-browser-artifacts');fs.mkdirSync(out,{recursive:true});
const server=live?null:spawn('python3',['-m','http.server','8770','--bind','127.0.0.1','--directory',root],{stdio:'ignore'});
const html=`<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#111}iframe{width:100vw;height:100vh;border:0}
</style><script>const fixture=${JSON.stringify(fixture)};window.addEventListener('message',e=>{
if(e.data?.type==='pfc-phase10-ready')e.source.postMessage({type:'pfc-phase10-fixture',fixture},location.origin);
});</script></head><body><iframe src="/watch/soccerjs/dist/index.html?embedded=1&inline=1"></iframe></body></html>`;
(async()=>{let browser;
 try{
  for(let n=0;n<50;n++){try{if((await fetch(origin+'/play/')).ok)break}catch(_){}await new Promise(r=>setTimeout(r,100))}
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const [device,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
   const context=await browser.newContext({viewport,acceptDownloads:true});
   const page=await context.newPage(),downloads=[],errors=[];
   page.on('download',d=>downloads.push(d));
   page.on('pageerror',e=>errors.push(String(e)));
   await page.route('**/__pfc_clip_export_test__',route=>route.fulfill({contentType:'text/html',body:html}));
   await page.goto(origin+'/__pfc_clip_export_test__');
   await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.__PFC_VIEWER_READY__===true,
    null,{timeout:90000});
   const frame=page.frames().find(x=>x.url().includes('/watch/soccerjs/dist/index.html'));
   assert(frame,'Native viewer missing '+device);
   await page.evaluate(()=>document.querySelector('iframe').contentWindow.postMessage(
    {type:'pfc-phase10-control',action:'seek',minute:75},location.origin));
   await frame.waitForFunction(()=>window.__PFC_SNAPSHOT__?.minute===75);
   await frame.locator('#highlightToggle').click();
   await frame.locator('#highlightList .highlight-entry button').last().click();
   await frame.waitForFunction(()=>!document.querySelector('#highlightReplay').hidden);
   const original=await frame.evaluate(()=>window.__PFC_SNAPSHOT__);
   assert.equal(original.replay.id,'goal-2');
   const clean=await frame.evaluate(()=>{
    try{document.querySelector('#pitch').toDataURL('image/png');return true}
    catch(e){return String(e)}
   });
   assert.equal(clean,true,'Every rendered sprite must be CORS-clean for video capture');
   await frame.locator('#clipExportSpeed').selectOption('1');
   // Cancel never downloads or mutates the paused/selected replay.
   await frame.locator('#clipExportDownload').click();
   await frame.waitForFunction(()=>document.querySelector('#clipExportStatus').textContent.includes('Recording'));
   await frame.locator('#clipExportCancel').click();
   await frame.waitForFunction(()=>document.querySelector('#clipExportStatus').textContent.includes('cancelled'));
   assert.equal(downloads.length,0,'Cancel must not produce a file');
   assert.equal((await frame.evaluate(()=>window.__PFC_SNAPSHOT__)).replay.id,'goal-2');
   // JSON-only is a user-initiated download even when mobile denies multi-download.
   await frame.locator('#clipExportJSON').click();
   await page.waitForTimeout(700);
   assert(downloads.some(d=>d.suggestedFilename().endsWith('.json')),'JSON export missing');
   const jsonDownload=downloads.find(d=>d.suggestedFilename().endsWith('.json'));
   const data=JSON.parse(fs.readFileSync(await jsonDownload.path(),'utf8'));
   assert.equal(data.schema,'pokefc-watch-clip/v1');
   assert.deepEqual(data.official.score,fixture.score);
   assert.equal(data.seeds.visual,fixture.visualSeed);
   assert(data.highlight.startSeconds<=fixture.reproduction.clearanceStartSeconds);
   assert.equal(data.recording.replaySpeed,1);
   assert(data.referenceId&&data.app.buildId);
   if(live)assert.equal(data.app.buildId,process.env.PFC_EXPECTED_BUILD,
    'Production clip JSON has the wrong deployed build ID');
   console.log('EXPORT '+device+' window '+JSON.stringify({start:data.highlight.startSeconds,
    end:data.highlight.endSeconds,speed:data.recording.replaySpeed,reference:data.referenceId}));
   // Report the actual browser recorder state rather than hiding it behind a timeout.
   await frame.locator('#clipExportDownload').click();
   try{
    await frame.waitForFunction(()=>{
     const status=document.querySelector('#clipExportStatus').textContent;
     return /ready|failed|error|cannot/i.test(status);
    },null,{timeout:60000});
   }catch(e){
    console.error('EXPORT STATE '+device+': '+await frame.locator('#clipExportStatus').innerText());
    console.error('PAGE ERRORS '+JSON.stringify(errors));throw e;
   }
   const exportState=await frame.locator('#clipExportStatus').innerText();
   assert(exportState.includes('ready'),'Recorder did not finish: '+exportState);
   await page.waitForTimeout(700);
   const video=downloads.find(d=>/\.(mp4|webm)$/.test(d.suggestedFilename()));
   assert(video,'No MP4/WebM download for '+device);
   const fullName=video.suggestedFilename();
   assert(fullName.includes(data.referenceId),'Video/JSON reference IDs disagree');
   const videoPath=await video.path();
   assert(fs.statSync(videoPath).size>2500,'Empty or invalid video output');
   fs.copyFileSync(videoPath,path.join(out,device+'-'+fullName));
   fs.writeFileSync(path.join(out,device+'-'+jsonDownload.suggestedFilename()),JSON.stringify(data,null,2));
   assert.equal((await frame.evaluate(()=>window.__PFC_SNAPSHOT__)).replay.id,'goal-2',
    'Export did not restore selected replay');
   await frame.locator('#highlightReplayReturn').click();
   assert.equal((await frame.evaluate(()=>window.__PFC_SNAPSHOT__)).minute,75);
   assert.deepEqual(errors,[]);
   console.log('PASS '+device+' MP4/WebM recording '+fullName+' + JSON, cancel, replay restored');
   await context.close();
  }
 }finally{if(browser)await browser.close();server?.kill('SIGTERM')}
})().catch(e=>{console.error(e);process.exitCode=1});
