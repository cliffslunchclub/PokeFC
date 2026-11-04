from pathlib import Path
import json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1370,'height':900},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content((R/'index.html').read_text(),wait_until='domcontentloaded')
 page.add_style_tag(content=(R/'career.css').read_text())
 for f in ['species.js','calibration-profile.js','quick-sim.js','hybrid-sim.js','tm-engine-bridge.js','tactical-viewer.js','career.js']:
  page.add_script_tag(content=(R/f).read_text())
 assert page.locator('#club option').count()==32
 assert page.locator('#mode option').count()==3
 page.locator('#mode').select_option('classic')
 page.locator('#club').select_option('24')
 page.locator('[data-action="start"]').click()
 assert 'Oreburgh' in page.locator('#app').inner_text()
 assert page.evaluate('window.FXI_TEST.state().teams.length')==32
 assert page.evaluate('window.FXI_TEST.state().players[window.FXI_TEST.state().teams[24].roster[0]].species')==408
 page.locator('.nav [data-view="schedule"]').click()
 assert page.locator('.grid .card').count()>=4
 for region in ['Kanto','Johto','Hoenn','Sinnoh']:
  assert region+' Conference' in page.locator('#app').inner_text()
 page.screenshot(path=str(R/'v08-league-desktop.png'),full_page=True)
 page.locator('[data-view="dashboard"]').click()
 page.locator('[data-action="week"]').click()
 assert page.evaluate('window.FXI_TEST.state().results[0].length')==16
 assert page.evaluate('window.FXI_TEST.state().week')==1
 assert not errors,errors
 print(json.dumps({'browser':'passed','regionTables':4,'gymSelectorOptions':32,'gen4Signature':'Cranidos','week1FixtureResults':16,'pageErrors':errors}))
 browser.close()
