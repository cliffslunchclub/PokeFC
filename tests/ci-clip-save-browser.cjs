'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const Q=require('../assets/js/quick-sim.js'),Bridge=require('../watch/soccerjs/watch-bridge.js');
const base=require('../watch/soccerjs/fixture.json');
const preview={home:base.home,away:base.away},result=Q.simulate(preview,{seed:'official-saves-1'});
const fixture={...Bridge.snapshot(preview,result),visualSeed:'opposite-save-clearance-2'};
const event=fixture.events.find(e=>e.type==='save'&&e.minute===86.5);
assert(event&&event.shooter,'Need official recorded shooter for save clip');
const root=path.resolve(__dirname,'..'),out=path.join(root,'clip-browser-artifacts'),port=8771;
fs.mkdirSync(out,{recursive:true});
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',root],{stdio:'ignore'});
const origin='http://127.0.0.1:'+port;
const html=`<!doctype html><html><head><meta charset="utf-8"><script>
const fixture=${JSON.stringify(fixture)};
window.addEventListener('message',e=>{
 if(e.data?.type==='pfc-phase10-ready')e.source.postMessage({type:'pfc-phase10-fixture',fixture},location.origin);
});</script></head><body style="margin:0">
<iframe src="/watch/soccerjs/dist/index.html?embedded=1&inline=1" style="width:100vw;height:100vh;border:0"></iframe>
</body></html>`;
(async()=>{let browser;
 try{
  for(let i=0;i<40;i++){try{if((await fetch(origin+'/play/')).ok)break}catch(_){}await new Promise(r=>setTimeout(r,100))}
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1280,height:720},acceptDownloads:true});
  const page=await context.newPage(),downloads=[],errors=[];
  page.on('download',d=>downloads.push(d));page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/__pfc_export_save__',r=>r.fulfill({contentType:'text/html',body:html}));
  await page.goto(origin+'/__pfc_export_save__');
  await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.__PFC_VIEWER_READY__===true,
   null,{timeout:90000});
  const frame=page.frames().find(f=>f.url().includes('/watch/soccerjs/dist/index.html'));
  await page.evaluate(minute=>document.querySelector('iframe').contentWindow.postMessage(
   {type:'pfc-phase10-control',action:'seek',minute},location.origin),event.minute+.01);
  await frame.waitForFunction(t=>Math.abs(window.__PFC_SNAPSHOT__.minute-t)<.001,event.minute+.01);
  await frame.locator('#highlightToggle').click();
  await frame.locator('[data-highlight-filter="save"]').click();
  await frame.locator('#highlightList .highlight-entry button').last().click();
  await frame.waitForFunction(()=>!document.querySelector('#highlightReplay').hidden);
  const before=await frame.evaluate(()=>window.__PFC_SNAPSHOT__);
  assert.equal(before.replay.kind,'save');
  await frame.locator('#clipExportSpeed').selectOption('1');
  await frame.locator('#clipExportDownload').click();
  await frame.waitForFunction(()=>/ready|failed|error|cannot/i.test(document.querySelector('#clipExportStatus').textContent),
   null,{timeout:65000});
  assert((await frame.locator('#clipExportStatus').innerText()).includes('ready'),'Save recorder did not finish');
  await page.waitForTimeout(600);
  const video=downloads.find(d=>/\.(mp4|webm)$/.test(d.suggestedFilename()));
  const json=downloads.find(d=>d.suggestedFilename().endsWith('.json'));
  assert(video&&json,'Save video and companion JSON must both download');
  const data=JSON.parse(fs.readFileSync(await json.path(),'utf8'));
  assert.equal(data.highlight.kind,'save');
  assert.equal(data.highlight.minute,86.5);
  assert.deepEqual(data.official.events,fixture.events);
  assert(data.referenceId&&video.suggestedFilename().includes(data.referenceId));
  assert(data.highlight.startSeconds<=5177.267073293539,'Clip omits preceding clearance');
  assert(fs.statSync(await video.path()).size>2500,'Empty save video');
  fs.copyFileSync(await video.path(),path.join(out,'save-'+video.suggestedFilename()));
  fs.writeFileSync(path.join(out,'save-'+json.suggestedFilename()),JSON.stringify(data,null,2));
  assert.equal((await frame.evaluate(()=>window.__PFC_SNAPSHOT__)).replay.kind,'save');
  await frame.locator('#highlightReplayReturn').click();
  assert.deepEqual(fixture.events,Bridge.snapshot(preview,result).events);
  assert.deepEqual(errors,[]);
  console.log('PASS browser official-save MP4/WebM export, full preceding clearance, JSON and PSE immutability');
 }finally{if(browser)await browser.close();server.kill('SIGTERM')}
})().catch(e=>{console.error(e);process.exitCode=1});
