'use strict';
/* Manual Challenge slots regression: one per Classic/National × Standard/Legends.
 * Confirms separately versioned snapshots, overwrite/cancel, cross-division load,
 * legacy autosave, corruption rejection and display of all four slots. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'challenge/index.html'),'utf8');
const inline=html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>'));
const css=fs.readFileSync(path.join(root,'challenge/challenge.css'),'utf8');
const ACTIVE_KEY='pokefc-challenge-alpha-1',SLOT_KEY='pokefc-challenge-manual-saves-v1';
const divisions=[
 ['classic-standard',4,false],
 ['classic-legends',4,true],
 ['national-standard',9,false],
 ['national-legends',9,true]
];
const roster=[6,3,9,94,25,131,143,68,135,65,149];
function fixture(pool,legends,rng,phase='shop'){
 const run={
  version:1,phase,pool,legends,formation:'4-3-3',tactic:'balanced',
  roster:roster.slice(),items:Array(11).fill(null),roll:null,rollHistory:['1:fire'],
  selected:9,rng,rerollType:1,rerollGen:1,moves:1,formationChanges:1,
  locked:null,result:null,round:0,history:[]
 };
 if(phase==='locked')run.locked={
  roster:run.roster.slice(),items:run.items.slice(),formation:run.formation,
  tactic:run.tactic,score:65
 };
 return run;
}
function launch(storage,initial){
 if(initial)storage.set(ACTIVE_KEY,JSON.stringify(initial));
 const elements=new Map(),app={innerHTML:'',querySelectorAll(){return []}};
 const document={getElementById(id){
  if(id==='app')return app;
  if(!elements.has(id))elements.set(id,{
   id,value:'',textContent:'',hidden:false,disabled:false,open:false,onclick:null,
   className:'',scrollTop:0,style:{setProperty(){},removeProperty(){}},
   classList:{toggle(){}},
   setAttribute(k,v){if(k==='open')this.open=true;else this[k]=v},
   removeAttribute(k){if(k==='open')this.open=false;else delete this[k]},
   show(){this.open=true},showModal(){this.open=true},close(){this.open=false;if(this.onclose)this.onclose()},
   addEventListener(){},querySelectorAll(){return []}
  });
  return elements.get(id);
 }};
 const env={window:{},document,localStorage:{
  getItem:k=>storage.get(k)||null,
  setItem(k,v){storage.set(k,v)}
 },navigator:{},console,
 crypto:{getRandomValues(a){a[0]=87321;return a}},
 alert(){throw Error('Browser alert forbidden')},
 confirm(){throw Error('Browser confirm forbidden')}
 };
 const ctx=vm.createContext(env);
 for(const file of ['national-species.js','calibration-profile.js','challenge/special-items-data.js','challenge/tiers.js','play/opponents.js','challenge/leaderboard.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file,timeout:15000});
 }
 vm.runInContext(inline,ctx,{filename:'challenge-inline',timeout:15000});
 const get=id=>document.getElementById(id);
 const state=()=>JSON.parse(storage.get(ACTIVE_KEY));
 const slots=()=>JSON.parse(storage.get(SLOT_KEY)||'{}');
 return {get,state,slots,storage,app,ctx};
}
const storage=new Map();
for(let i=0;i<divisions.length;i++){
 const [id,pool,legends]=divisions[i],g=launch(storage,fixture(pool,legends,10000+i));
 assert.equal(g.get('saveChallengeSlot').disabled,false,'Save available during a run');
 assert.match(g.get('challengeSaveStatus').textContent,/NO MANUAL SAVE YET/);
 g.get('saveChallengeSlot').onclick();
 assert.equal(g.get('challengeMessageTitle').textContent,'RUN SAVED');
 assert.equal(g.slots()[id].state.rng,10000+i);
 assert.equal(g.slots()[id].version,1);
 assert.match(g.slots()[id].savedAt,/^\d{4}-\d{2}-\d{2}T/);
 assert.equal(Object.keys(g.slots()).length,i+1,'Exactly one slot is used for each division');
 assert.match(g.get('challengeSaveStatus').textContent,/SLOT SAVED/);
}
const game=launch(storage,fixture(9,true,20004));
const savedBefore=JSON.stringify(game.slots()['national-legends']);
game.get('saveChallengeSlot').onclick();
assert.match(game.get('challengeMessageTitle').textContent,/OVERWRITE NATIONAL · LEGENDS/);
game.get('challengeMessageCancel').onclick();
assert.equal(JSON.stringify(game.slots()['national-legends']),savedBefore,'Cancel preserves the existing slot');
game.get('saveChallengeSlot').onclick();
game.get('challengeMessageConfirm').onclick();
assert.equal(game.slots()['national-legends'].state.rng,20004,'Confirm overwrites only its own category');
assert.equal(Object.keys(game.slots()).length,4,'Overwrite never creates a second slot');
assert.equal(game.slots()['classic-standard'].state.rng,10000,'Different division unchanged');
game.get('reset').onclick();
game.get('challengeMessageConfirm').onclick();
assert.equal(game.state().phase,'setup');
assert.equal(game.get('saveChallengeSlot').disabled,true,'Setup cannot save an empty run');
assert.equal(Object.keys(game.slots()).length,4,'Abandoning run leaves all manual slots intact');
game.get('loadChallengeSlot').onclick();
assert.equal(game.get('challengeSaveLoadModal').open,true,'Native branded load dialog opens');
for(const [id] of divisions){
 assert.equal(game.get('loadSlot-'+id).disabled,false,'Occupied slot is available for '+id);
 assert.match(game.get('slotStatus-'+id).textContent,/SHOP · MATCH 1\/6/);
}
game.get('loadSlot-classic-standard').onclick();
assert.equal(game.state().phase,'shop','Loaded snapshot restores phase');
assert.equal(game.state().pool,4);
assert.equal(game.state().legends,false);
assert.equal(game.state().rng,10000);
assert.equal(game.get('challengeSaveLoadModal').open,false,'Load selector closes');
assert.equal(game.get('challengeMessageTitle').textContent,'RUN LOADED');
assert.equal(game.slots()['classic-standard'].state.rng,10000,'Loading does not consume the slot');
const current=JSON.stringify(game.state());
game.get('loadChallengeSlot').onclick();
game.get('loadSlot-national-legends').onclick();
assert.match(game.get('challengeMessageTitle').textContent,/LOAD NATIONAL · LEGENDS/,'A different active run requires confirmation');
game.get('challengeMessageCancel').onclick();
assert.equal(JSON.stringify(game.state()),current,'Cancelled load preserves the autosave');
game.get('loadChallengeSlot').onclick();
game.get('loadSlot-national-legends').onclick();
game.get('challengeMessageConfirm').onclick();
assert.equal(game.state().pool,9);
assert.equal(game.state().legends,true);
assert.equal(game.state().rng,20004,'Confirmed load replaces active run');
assert.equal(game.slots()['national-legends'].state.rng,20004,'Loaded slot stays unchanged');
const reloaded=launch(storage);
assert.equal(reloaded.state().rng,20004,'Loaded run also survives browser refresh');
assert.equal(Object.keys(reloaded.slots()).length,4,'Four slots survive browser refresh');

// Include locked-match phase and historical results in a snapshot, never re-simulate.
const locked=fixture(4,false,77777,'locked');
locked.round=2;
locked.history=[{boss:'Lorelei',round:1,score:[2,1],outcome:'Victory',origin:'quick-sim'},
 {boss:'Bruno',round:2,score:[1,0],outcome:'Victory',origin:'quick-sim'}];
const advanced=launch(storage,locked);
advanced.get('saveChallengeSlot').onclick();
advanced.get('challengeMessageConfirm').onclick();
assert.equal(advanced.slots()['classic-standard'].state.history.length,2,'Match history saved');
const fromSetup=launch(storage,{...fixture(4,false,3333),phase:'setup',roster:Array(11).fill(null)});
fromSetup.get('loadChallengeSlot').onclick();
fromSetup.get('loadSlot-classic-standard').onclick();
assert.equal(fromSetup.state().phase,'locked');
assert.equal(fromSetup.state().round,2);
assert.equal(fromSetup.state().history.length,2,'Historical scores and progression restore');
assert.equal(fromSetup.state().rng,77777,'Seeded run is restored exactly');

// A malformed slot is disabled instead of corrupting the active run.
const corrupted=fromSetup.slots();
corrupted['national-standard'].state.roster=['invalid'];
storage.set(SLOT_KEY,JSON.stringify(corrupted));
const blocked=launch(storage,fixture(4,true,60001));
blocked.get('loadChallengeSlot').onclick();
assert.equal(blocked.get('loadSlot-national-standard').disabled,true);
assert.equal(blocked.get('slotStatus-national-standard').textContent,'UNAVAILABLE / INVALID SAVE');
blocked.get('loadSlot-national-standard').onclick();
assert.equal(blocked.get('challengeMessageTitle').textContent,'SAVE UNAVAILABLE');
assert.equal(blocked.state().rng,60001,'Invalid slot cannot replace active run');
assert.equal(Object.keys(blocked.slots()).length,4,'Invalid saves are not silently removed');

assert.match(html,/id="saveChallengeSlot"/);
assert.match(html,/id="loadChallengeSlot"/);
assert.match(html,/id="challengeSaveLoadModal"/);
for(const [id] of divisions)assert(html.includes('id="loadSlot-'+id+'"'));
assert(css.includes('.challenge-save-toolbar'));
assert(css.includes('.challenge-save-slot-grid'));
assert(css.includes('@media(max-width:540px)'));
assert.doesNotMatch(inline,/\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/,'No native popup methods used');
console.log('PASS Challenges manual save slots: four isolated categories, overwrite confirmation, cancel, load, match-history restore, refresh and corruption safety');
