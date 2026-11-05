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
  locked:['locked','result'].includes(phase)?{roster:roster.slice(),items:Array(11).fill(null),formation:'4-3-3',tactic:'balanced',score:70}:null,
  round:0,result:phase==='result'?{boss:'Lorelei',round:1,score:[2,1],outcome:'Victory',origin:'quick-sim',
   report:{version:3,score:[2,1],status:'complete',goals:[
    {side:0,minute:18,minuteLabel:'19',player:'Charizard',origin:'quick-sim'},
    {side:1,minute:38,minuteLabel:'39',player:'Lapras',origin:'quick-sim'},
    {side:0,minute:77,minuteLabel:'78',player:'Pikachu',origin:'quick-sim'}
   ],timeline:[{type:'goal',side:0,minute:18,minuteLabel:'19',player:'Charizard',origin:'quick-sim'}]}}:null,history:[]};
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
   '[data-shop-clear]':[/data-shop-clear="(\d+)"/g,'shopClear'],
   '[data-pokemon-info]':[/data-pokemon-info="(\d+)"/g,'pokemonInfo']
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
const pickerAt=draft.app.innerHTML.indexOf('id="challengeDraftModal"');
const machineAt=draft.app.innerHTML.indexOf('id="challengeSlotMachine"');
const candidateAt=draft.app.innerHTML.indexOf('id="challengePickGrid"');
assert(pickerAt>=0&&machineAt>pickerAt&&candidateAt>machineAt,
 'Animated scouting reel is inside the Pokémon picker, before the candidate cards');
assert.equal((draft.app.innerHTML.match(/id="challengeSlotMachine"/g)||[]).length,1,'No duplicate scouting machine');
assert.match(draft.app.innerHTML,/id="draftPositionSelect"/,'Position selector available for mobile and keyboard');
assert.match(draft.app.innerHTML,/id="challengeDraftDragHandle"/,'Desktop picker includes an accessible move handle');
assert.match(css,/height:100dvh!important/,'Mobile picker fills the viewport');
assert.match(css,/\.challenge-draft-panel \.pick-grip\{display:none!important\}/,'Mobile hides precision drag handles');
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
const positionDropdown=draft.nodes.get('draftPositionSelect');
positionDropdown.value='0';
assert(positionDropdown.onchange,'Position picker handles changes without a pitch tap');
positionDropdown.onchange();
assert.equal(draft.state().selected,0,'Changing dropdown commits an open GK position');
assert.match(draft.app.innerHTML,/id="draftPositionSelect"[^>]*>/,'Dropdown remains visible');
const keeperPick=draft.app.querySelectorAll('[data-pick]').find(b=>!b.disabled);
assert(keeperPick?.onclick,'Eligible goalkeeper draft option available');
keeperPick.onclick();
assert.equal(draft.state().roster[0]>0,true,'Single DRAFT tap fills the selected dropdown position');
assert.equal(draft.state().selected,8,'Next draft automatically returns to remaining priority position');

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
const info=shop.app.querySelectorAll('[data-pokemon-info]').find(b=>Number(b.dataset.pokemonInfo)===0);
assert(info?.onclick,'Filled pitch Pokémon provide dedicated details button when equipment selected');
info.onclick({stopPropagation(){}});
assert.equal(shop.nodes.get('challengePokemonDetailModal').open,true,'Info button opens player profile during item shop');
assert.match(shop.nodes.get('pokemonDetailContent').innerHTML,/Porygon2/);
assert.match(shop.nodes.get('pokemonDetailContent').innerHTML,/Leftovers/);
assert.match(shop.nodes.get('pokemonDetailContent').innerHTML,/\+10 FROM ITEM/,'Profile shows effective stat boost from held item');
shop.nodes.get('closePokemonDetailModal').onclick();
assert.equal(shop.nodes.get('challengePokemonDetailModal').open,false,'Profile close works');
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
const card=locked.app.querySelectorAll('[data-slot]').find(b=>Number(b.dataset.slot)===0);
assert(card?.onclick&&!card.disabled,'Occupied pitch positions are clickable when XI is locked');
card.onclick();
assert.equal(locked.nodes.get('challengePokemonDetailModal').open,true,'Clicking occupied pitch shows player profile');
assert.match(locked.nodes.get('pokemonDetailContent').innerHTML,/EFFECTIVE PLAYER STATS/);
assert.match(locked.nodes.get('pokemonDetailContent').innerHTML,/TIER/);
locked.nodes.get('closePokemonDetailModal').onclick();
assert.match(locked.app.innerHTML,/id="challengeOpponentModal"/,'Opponent pitch lives in dialog');
locked.nodes.get('openOpponentModal').onclick();
assert.equal(locked.nodes.get('challengeOpponentModal').open,true);
locked.nodes.get('closeOpponentModal').onclick();
assert.equal(locked.nodes.get('challengeOpponentModal').open,false);
const result=launch('result');
assert.match(result.app.innerHTML,/<dialog id="challengeMatchResultModal"/,'Victory report is a modal');
assert.equal(result.nodes.get('challengeMatchResultModal').open,true,'Saved victory autopens after reload or returning from watched match');
assert.match(result.app.innerHTML,/MATCH EVENT TIMELINE/,'Match report remains in result modal');
assert.match(result.app.innerHTML,/id="next"[^>]*>ADVANCE TO BRUNO/,'Advance button is inside result modal');
assert.equal((result.app.innerHTML.match(/id="next"/g)||[]).length,1,'Exactly one Advance button');
result.nodes.get('closeMatchResultModal').onclick();
assert.equal(result.nodes.get('challengeMatchResultModal').open,false,'Result modal can be dismissed');
result.nodes.get('openMatchResultModal').onclick();
assert.equal(result.nodes.get('challengeMatchResultModal').open,true,'Result modal reopens from Gauntlet progress');
result.nodes.get('next').onclick();
assert.equal(result.state().phase,'locked','Advancing via result modal preserves locked XI and gauntlet state');
assert.equal(result.state().round,1,'Advance increments exactly one boss');
assert.equal(result.state().roster[0],roster[0],'Lineup persists through modal advancement');
console.log('PASS Challenges v2: single pitch, scout and equipment overlays, Pokémon profile, and boss result modal with advance');
