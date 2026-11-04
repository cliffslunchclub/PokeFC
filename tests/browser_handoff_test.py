import subprocess, time, json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python3','run_local.py'],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
try:
    time.sleep(.6)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1280,'height':820},accept_downloads=True)
        mock_worker_js='''
        class FakeTMWorker {
          constructor(){this.config=null;this.terminated=false;this.onmessage=null}
          emit(data){if(!this.terminated)setTimeout(()=>this.onmessage?.({data}),0)}
          sendSnapshot(minute){const c=this.config;let ps=[...c.home.players.map((p,i)=>({id:p.id,teamId:c.home.id,position:{x:13+i*6,y:17+(i%4)*12},active:true})),...c.away.players.map((p,i)=>({id:p.id,teamId:c.away.id,position:{x:91-i*6,y:17+(i%4)*12},active:true}))];return {players:ps,ball:{x:55,y:33},score:{home:minute?2:0,away:minute?1:0},elapsedSeconds:minute*60,period:minute>45?2:1,status:'running',phase:'open-play'}}
          postMessage(d){
           if(d.type==='init'){this.config=d.config;this.emit({type:'ready',snapshot:this.sendSnapshot(0)})}
           else if(d.type==='play'){this.emit({type:'snapshot',snapshot:this.sendSnapshot(63),events:[{type:'goal',minute:10,team:this.config.home.id,player:this.config.home.players[8].id},{type:'goal',minute:35,team:this.config.away.id,player:this.config.away.players[8].id},{type:'goal',minute:58,team:this.config.home.id,player:this.config.home.players[9].id}]})}
           else if(d.type==='handoff'){
            const c=this.config,ids=[c.home.id,c.away.id],ps=c.home.players.map(x=>({...x,teamId:ids[0]})).concat(c.away.players.map(x=>({...x,teamId:ids[1]})));
            const partial={origin:'tacticmesh',tick:226800,elapsedSeconds:3780,score:{home:2,away:1},period:2,
              teams:ids.map((id,i)=>({id,stats:{shots:i===0?8:6,shotStops:i===0?2:3,passes:i===0?260:200,completedPasses:i===0?160:125,tackles:i===0?6:5,possessionSeconds:i===0?1450:1000,shotsOnTarget:null}})),
              players:ps.map(x=>({id:x.id,teamId:x.teamId,active:true,stamina:.8,minutes:63,stats:{goals:x.id===c.home.players[8].id?1:x.id===c.home.players[9].id?1:x.id===c.away.players[8].id?1:0,assists:0,shotStops:0,shots:0,tackles:0,yellowCards:0,redCards:0}})),
              events:[{type:'goal',minute:10,team:ids[0],player:c.home.players[8].id},{type:'goal',minute:35,team:ids[1],player:c.away.players[8].id},{type:'goal',minute:58,team:ids[0],player:c.home.players[9].id}]};
            this.emit({type:'handoff',partial,snapshot:this.sendSnapshot(63)})
           }
           else if(d.type==='finish'){throw Error('should not run full TM in hybrid test')}
          }
          terminate(){this.terminated=true}
        }
        window.Worker=FakeTMWorker;
        Object.defineProperty(window,'localStorage',{configurable:true,value:{_m:{},getItem(k){return this._m[k]||null},setItem(k,v){this._m[k]=v},removeItem(k){delete this._m[k]}}});
        const actualFetch=window.fetch;window.fetch=(url,opts)=>String(url).includes('/tacticmesh/vendor/installed.json')?Promise.resolve({ok:true,json:async()=>({files:{'core.js':'yes','engine-facade.js':'yes','LICENSE':'yes'}})}):actualFetch(url,opts);
        '''
        page=context.new_page()
        errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        # Intercept local paths so this sandbox's browser doesn't need network access.
        from urllib.parse import urlsplit,unquote
        import mimetypes
        def serve(route):
            target=unquote(urlsplit(route.request.url).path).lstrip('/') or 'index.html'
            local=(root/target).resolve()
            if not local.is_relative_to(root) or not local.is_file():return route.fulfill(status=404,body='Not found')
            return route.fulfill(status=200,body=local.read_bytes(),content_type=mimetypes.guess_type(str(local))[0] or 'application/octet-stream')
        page.route('http://127.0.0.1:8765/**',serve)
        page.route('**/tacticmesh/vendor/installed.json',lambda route:route.fulfill(status=200,content_type='application/json',body=json.dumps({'files':{'core.js':'yes','engine-facade.js':'yes','LICENSE':'yes'}})))
        import re
        html=root.joinpath('index.html').read_text()
        html=re.sub(r'<script[^>]*></script>', '', html)
        html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*>', '', html)
        page.set_content(html,wait_until='domcontentloaded')
        page.add_script_tag(content=mock_worker_js)
        page.add_style_tag(content=root.joinpath('career.css').read_text())
        for js in ['species.js','calibration-profile.js','quick-sim.js','hybrid-sim.js','tm-engine-bridge.js','tactical-viewer.js','career.js']:
            page.add_script_tag(content=root.joinpath(js).read_text())
        page.locator('[data-action="start"]').click()
        page.locator('.nav [data-view="tactical"]').click()
        page.wait_for_timeout(250)
        assert page.locator('#viewerPlay').is_enabled()
        initial=page.evaluate('window.FXI_TEST.state().week')
        assert initial==0
        page.locator('#viewerPlay').click()
        page.wait_for_timeout(200)
        assert page.locator('#liveScore').inner_text().strip()=='2 – 1',page.locator('#liveScore').inner_text()
        assert page.locator('#viewerMode').is_disabled(),'mode selector should lock after kick-off'
        page.once('dialog',lambda dialog:dialog.accept())
        page.locator('#viewerComplete').click()
        page.wait_for_timeout(200)
        assert 'Finish' in page.locator('#viewerComplete').inner_text() or 'Record' in page.locator('#viewerComplete').inner_text(), page.locator('#viewerComplete').inner_text()
        assert page.locator('#viewerComplete').inner_text().startswith('✓ Record')
        assert page.evaluate('window.FXI_TEST.state().week')==0,'should not commit before confirmation'
        assert 'TacticMesh + Quick Sim' in page.locator('#viewerEvents').inner_text()
        page.screenshot(path='/mnt/data/futbol-xi-v07b-hybrid-preview.png',full_page=True)
        page.locator('#viewerComplete').click()
        page.wait_for_timeout(300)
        assert page.evaluate('window.FXI_TEST.state().week')==1,'should commit one week'
        result=page.evaluate('window.FXI_TEST.state().results[0][window.FXI_TEST.getTacticalPreview()?.fixtureIndex ?? 0]') if False else page.evaluate('window.FXI_TEST.state().results[0].find(x => x.origin === "hybrid")')
        assert result is not None,'saved one hybrid result'
        assert result['handoff']['minute']==63
        assert errors==[],errors
        assert page.evaluate('window.FXI_QUICK.profile().status')=='provisional','provisional model should remain active with 0 real samples'
        print(json.dumps({'ui':'PASS','week_before':initial,'week_after':page.evaluate('window.FXI_TEST.state().week'),'origin':result['origin'],'score':result['score'],'handoff_minute':result['handoff']['minute'],'page_errors':errors}))
        browser.close()
finally:
    server.terminate()
    try:server.wait(timeout=2)
    except:server.kill()
