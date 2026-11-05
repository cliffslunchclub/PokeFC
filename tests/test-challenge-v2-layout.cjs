'use strict';
/* Challenges v2 UI integration: full-pitch stage, draft popup, and a floating
 * shop whose items can be equipped directly by clicking the Pokémon pitch. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'challenge/index.html'),'utf8');
const inline=html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>'));
const css=fs.readFileSync(path.join(root,'challenge/challenge.css'),'utf8');
assert.match(css,/\.challenge-frame \.challenge-run-layout\{display:flex!important/,'Active stage is not two-column');
assert.match(css,/\.challenge-shop-drawer\{position:fixed/,'Item Shop is floating, not another column');
assert.match(css,/\.challenge-draft-panel.+position:fixed!important/,'Draft popup floats above the pitch');
const roster=[233,6,9,94,25,1,2,3,4,5,7];
function launch(phase){
 const state={version:1,phase,pool:4,legends:false,formation:'4-3-3',tactic:'balanced',
  roster:phase==='draft'?Array(11).fill(null):roster,items:Array(11).fill(null),
  roll:phase==='draft'?{gen:1,type:'fire'}:null,rollHistory:['1:fire'],
  selected:9,rng:78249,rerollType:1,rerollGen:1,moves:1,formationChanges:1,
  locked:phase==='locked'?{roster:roster.slice(),items:Array(11).fill(null),formation:'4-3-3',tactic:'balanced',score:70}:null,
  round:0,result:null,history:[]};
 let stored=JSON.stringify(state),cache=new Map();
 const app={markup:'',get innerHTML(){return this.markup},set innerHTML(v){this.markup=v;cache.clear()},querySelectorAll(sel){
  if(cache.has(sel))return cache.get(sel);
  let buttons=[];
  const patterns={
   '[data-pick]':[/\<button data-pick="(\d+)"([^>]*)>/g,'pick'],
   '[data-slot]':[/\<button type="button" data-slot="(\d+)"([^>]*)>/g,'slot'],
   '[data-slot-card]':[/data-slot-card="(\d+)"/g,'slotCard'],
   '[data-shop-pick]':[/\<button type="button" data-shop-pick="([^"]+)"([^>]*)>/g,'shopPick'],
   '[data-shop-stat]':[/data-shop-stat="([^"]+)"/g,'shopStat'],
   '[data-shop-clear]':[/data-shop-clear="(\d+)"/g,'shopClear']
  };
  const parsed=patterns[sel];
  if(parsed)buttons=[...this.markup.matchAll(parsed[0])].map(match=>({
   dataset:{[parsed[1]]:match[1]},disabled:/\bdisabled\b/.test(match[2]||''),
   onclick:null,onmouseenter:null,onmouseleave:null,onfocus:null,onblur:null,classList:{toggle(){}}
  }));
  cache.set(sel,buttons);return buttons;
 }};
 const nodes=new Map();
 const document={getElementById(id){
  if(id==='app')return app;
  if(!nodes.has(id))nodes.set(id,{
   id,value:id==='tactic'?'balanced':'',textContent:'',hidden:false,open:false,scrollTop:0,
   setAttribute(k){if(k==='open')this.open=true},
   removeAttribute(k){if(k==='open')this.open=false},
   show(){this.open=true},showModal(){this.open=true},close(){this.open=false},
   onclick:null,onchange:null,oninput:null,onfocus:null,onkeydown:null
  });
  return nodes.get(id);
 }};
 const win={},ctx=vm.createContext({window:win,document,console,
  crypto:{getRandomValues(x){x[0]=78249;return x}},
  localStorage:{getItem(){return stored},setItem(_k,value){stored=value}},
  confirm:()=>true,alert:s=>{throw Error('Unexpected alert: '+s)}
 });
 for(const file of ['national-species.js','calibration-profile.js','quick-sim.js','challenge/special-items-data.js','challenge/tiers.js','play/opponents.js'])
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file,timeout:20000});
 vm.runInContext(inline,ctx,{filename:'challenge-inline',timeout:20000});
 return {app,document,nodes,state:()=>JSON.parse(stored)};
}
const draft=launch('draft');
assert.match(draft.app.innerHTML,/class="challenge-run-layout stage-draft"/);
assert.match(draft.app.innerHTML,/id="challengeDraftModal"/);
assert.match(draft.app.innerHTML,/id="draftSearch"/);
assert(draft.app.innerHTML.indexOf('id="challengeSlotMachine"')<draft.app.innerHTML.indexOf('class="challenge-run-layout stage-draft"'),
 'Animated scouting machine is above the full-width pitch');
assert.equal(draft.nodes.get('challengeDraftModal').open,true,'Pokémon picker automatically opens on a new draft');
assert.equal((draft.app.innerHTML.match(/id="challengePickGrid"/g)||[]).length,1,'Exactly one candidate grid');
draft.nodes.get('closeDraftPicker').onclick();
assert.equal(draft.nodes.get('challengeDraftModal').open,false,'Picker can close to show the pitch');
draft.nodes.get('openDraftPicker').onclick();
assert.equal(draft.nodes.get('challengeDraftModal').open,true,'Picker can reopen');
const firstPick=draft.app.querySelectorAll('[data-pick]').find(b=>!b.disabled);
assert(firstPick?.onclick,'Existing draft callbacks remain active inside modal');
firstPick.onclick();
assert.equal(draft.state().roster[9]>0,true,'Default striker position receives the chosen Pokémon');
assert.equal(draft.state().selected,8,'Next draft target advances to winger');
assert.equal(draft.nodes.get('challengeDraftModal').open,true,'Picker reopens for next roll');

const shop=launch('shop');
assert.match(shop.app.innerHTML,/class="challenge-run-layout stage-shop shop-open"/);
assert.match(shop.app.innerHTML,/id="challengeShopDrawer"/);
assert.match(shop.app.innerHTML,/id="toggleShopDrawer"/);
const choose=name=>{
 const btn=shop.app.querySelectorAll('[data-shop-pick]').find(b=>b.dataset.shopPick===name);
 assert(btn?.onclick,'Item '+name+' remains selectable');btn.onclick();
};
const tap=index=>{
 const btn=shop.app.querySelectorAll('[data-slot]').find(b=>Number(b.dataset.slot)===index);
 assert(btn?.onclick&&!btn.disabled,'Equipping via pitch click is enabled at '+index);
 btn.onclick();
};
choose('Leftovers');
assert.match(shop.app.innerHTML,/shop-target/,'Compatible pitch targets highlight after selecting item');
tap(0);
assert.equal(shop.state().items[0],'Leftovers','Clicking Porygon2 equipped selected held item');
choose('Muscle Band');
shop.nodes.get('closeShopDrawer').onclick();
assert.match(shop.app.innerHTML,/id="challengeShopDrawer"[^>]*hidden/,'Item drawer can collapse without removing pitch');
tap(1);
assert.equal(shop.state().items[1],'Muscle Band','Pitch still accepts selected item while drawer hidden');
assert.match(shop.app.innerHTML,/id="challengeShopDrawer"[^>]*hidden/,'Pitch item assignment does not force drawer open');
shop.nodes.get('toggleShopDrawer').onclick();
assert.doesNotMatch(shop.app.innerHTML,/id="challengeShopDrawer"[^>]*hidden/,'Item drawer can reopen');

const locked=launch('locked');
assert.match(locked.app.innerHTML,/id="openOpponentModal"/,'Opponent scouting available from Gauntlet strip');
assert.match(locked.app.innerHTML,/id="challengeOpponentModal"/,'Opponent pitch lives in dialog');
locked.nodes.get('openOpponentModal').onclick();
assert.equal(locked.nodes.get('challengeOpponentModal').open,true);
locked.nodes.get('closeOpponentModal').onclick();
assert.equal(locked.nodes.get('challengeOpponentModal').open,false);
console.log('PASS Challenges v2: single pitch, scouting modal, candidate callback, responsive shop drawer, pitch equip and opponent scouting modal');
