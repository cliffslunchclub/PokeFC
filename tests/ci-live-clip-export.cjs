'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const fixture=require('../watch/soccerjs/repros/opposite-clearance-buildup-64.json');
const origin='https://pfc.cliffslunchclub.com',out=path.resolve(__dirname,'../pfc-live-clip-proof');
fs.mkdirSync(out,{recursive:true});
const host=`<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#101018}iframe{width:100vw;height:100vh;border:0}
</style><script>const fixture=${JSON.stringify(fixture)};
window.addEventListener('message',e=>{
if(e.data?.type==='pfc-phase10-ready')e.source.postMessage({type:'pfc-phase10-fixture',fixture},location.origin);
});</script></head><body><iframe src="/watch/soccerjs/dist/index.html?embedded=1&inline=1"></iframe></body></html>`;
(async()=>{let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1280,height:720},acceptDownloads:true});
  const page=await context.newPage(),downloads=[],errors=[];
  page.on('download',d=>downloads.push(d));page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/__pfc_live_clip_qa__',r=>r.fulfill({contentType:'text/html',body:host}));
  await page.goto(origin+'/__pfc_live_clip_qa__');
  await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.__PFC_VIEWER_READY__===true,
   null,{timeout:90000});
  const frame=page.frames().find(f=>f.url().includes('/watch/soccerjs/dist/index.html'));
  assert(frame,'Production native Watch bundle missing');
  await page.evaluate(()=>document.querySelector('iframe').contentWindow.postMessage(
   {type:'pfc-phase10-control',action:'seek',minute:75},location.origin));
  await frame.waitForFunction(()=>window.__PFC_SNAPSHOT__.minute===75);
  await frame.locator('#highlightToggle').click();
  await frame.locator('#highlightList .highlight-entry button').last().click();
  await frame.waitForFunction(()=>!document.querySelector('#highlightReplay').hidden);
  await frame.locator('#clipExportSpeed').selectOption('1');
  await frame.locator('#clipExportJSON').click();
  await page.waitForTimeout(500);
  const first=downloads.find(d=>d.suggestedFilename().endsWith('.json'));
  assert(first,'Production missing diagnostic JSON');
  const data=JSON.parse(fs.readFileSync(await first.path(),'utf8'));
  assert.equal(data.schema,'pokefc-watch-clip/v1');
  const expectedBuild=process.env.PFC_EXPECTED_DEPLOY_SHA||'3d1ebe6ae4e41d2b45389b8c667f6fafc72e8e12';
  assert.equal(data.app.buildId,expectedBuild,
   'Production Watch bundle must match actual successful SiteGround deployment');
  assert(data.highlight.startSeconds<=fixture.reproduction.clearanceStartSeconds);
  const t=await frame.evaluate(()=>{
   try{document.getElementById('pitch').toDataURL('image/png');return true}catch(e){return String(e)}
  });
  assert.equal(t,true,'Production sprite images tainted the recording canvas');
  await frame.locator('#clipExportDownload').click();
  await frame.waitForFunction(()=>/ready|failed|cannot|error/i.test(document.getElementById('clipExportStatus').textContent),
   null,{timeout:65000});
  const status=await frame.locator('#clipExportStatus').innerText();
  assert(status.includes('ready'),'Live export failed: '+status);
  await page.waitForTimeout(700);
  const video=downloads.find(d=>/\.(mp4|webm)$/.test(d.suggestedFilename()));
  assert(video,'No live browser MP4/WebM download');
  assert(video.suggestedFilename().includes(data.referenceId),'Video and JSON IDs differ');
  assert(fs.statSync(await video.path()).size>2500,'Empty production recording');
  fs.copyFileSync(await video.path(),path.join(out,video.suggestedFilename()));
  fs.writeFileSync(path.join(out,first.suggestedFilename()),JSON.stringify(data,null,2));
  await frame.locator('.pitchwrap').screenshot({path:path.join(out,'production-export.png')});
  await frame.locator('#highlightReplayReturn').click();
  assert.equal((await frame.evaluate(()=>window.__PFC_SNAPSHOT__)).minute,75);
  assert.deepEqual(errors,[]);
  console.log('PASS production browser MP4/WebM goal clip, full-buildup JSON, exact deployed SHA, unchanged Watch state');
 }finally{if(browser)await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
