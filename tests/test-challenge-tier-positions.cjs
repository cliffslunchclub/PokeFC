'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const win={},c=vm.createContext({window:win,console});
vm.runInContext(fs.readFileSync(path.join(root,'challenge/tiers.js'),'utf8'),c);
const tiers=win.PFC_CHALLENGE_TIERS;
assert.deepEqual(Array.from(tiers.bands,x=>[x.tier,x.min]),[['S',85],['A',75],['B',65],['C',55],['D',0]]);
for(const [n,letter] of [[100,'S'],[85,'S'],[84.99,'A'],[75,'A'],[74.99,'B'],[65,'B'],[64.99,'C'],[55,'C'],[54.99,'D'],[20,'D']])
 assert.equal(tiers.tier(n),letter,'OVR '+n);
let saved=JSON.stringify({version:1,phase:'draft',pool:4,legends:false,formation:'4-3-3',tactic:'balanced',
 roster:[233,...Array(10).fill(null)],items:Array(11).fill(null),selected:1,rng:18391,
 roll:{gen:1,type:'fire'},rerollType:1,rerollGen:1,moves:1,formationChanges:1,locked:null,result:null});
const controls=new Map(),bound=new Map();
const app={innerHTML:'',querySelectorAll(sel){
 let elements=[];
 if(sel==='[data-slot-card]')elements=[...this.innerHTML.matchAll(/data-slot-card="(\d+)"/g)].map(m=>({
  dataset:{slotCard:m[1]},classList:{toggle(){}},onclick:null,onmouseenter:null}));
 if(sel==='[data-slot]')elements=[...this.innerHTML.matchAll(/<button type="button" data-slot="(\d+)"/g)].map(m=>({dataset:{slot:m[1]},onclick:null,onfocus:null}));
 if(sel==='[data-pick]')elements=[...this.innerHTML.matchAll(/<button data-pick="(\d+)"/g)].map(m=>({
  dataset:{pick:m[1]},onclick:null,closest(){return {querySelector(){return {textContent:'',className:''}}}}}));
 bound.set(sel,elements);return elements;
}};
const grid={
 scrollTop:123,list:null,
 get children(){if(this.list===null)this.list=[...app.innerHTML.matchAll(/<div class="pick" data-species-id="(\d+)"/g)].map(x=>({dataset:{speciesId:x[1]}}));return this.list},
 appendChild(card){const i=this.list.indexOf(card);if(i>=0)this.list.splice(i,1);this.list.push(card)}
};
const doc={getElementById(id){if(id==='app')return app;if(id==='challengePickGrid')return grid;
 if(!controls.has(id))controls.set(id,{id,value:'',textContent:'',setAttribute(){}});
 return controls.get(id)}};
const ctx=vm.createContext({window:{},document:doc,console,localStorage:{getItem(){return saved},setItem(k,v){saved=v}},
 crypto:{getRandomValues(a){a[0]=18391;return a}},alert:()=>{},confirm:()=>true});
for(const file of ['national-species.js','calibration-profile.js','quick-sim.js','challenge/special-items-data.js','challenge/tiers.js','play/opponents.js']){
 vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file,timeout:15000});
}
const html=fs.readFileSync(path.join(root,'challenge/index.html'),'utf8');
vm.runInContext(html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>')),ctx,{filename:'challenge-inline',timeout:15000});
assert.match(app.innerHTML,/class="slot-tier tier-/);
assert.match(app.innerHTML,/class="pick-tier tier-/);
assert.doesNotMatch(app.innerHTML,/\d+(?:\.\d+)? OVR/);
const slots=bound.get('[data-slot-card]');
assert.equal(slots.length,11);
const initial=JSON.parse(saved).selected;
assert.equal(initial,1);
const before=Array.from(grid.children,x=>Number(x.dataset.speciesId));
assert(before.length>2,'Multiple scouted Pokémon available');
slots[9].onmouseenter();
assert.deepEqual(Array.from(grid.children,x=>Number(x.dataset.speciesId)),before,'Hover previews grade without shuffling the list');
assert.equal(grid.scrollTop,123,'Hover does not reset scroll');
assert.equal(controls.get('selectedDraftPosition').textContent,'ST POSITION · PREVIEW');
assert.equal(JSON.parse(saved).selected,1,'hover is a transient preview until clicked');
slots[9].onclick();
assert.equal(JSON.parse(saved).selected,9,'click anywhere on the tile commits the position');
assert.equal(grid.scrollTop,0,'clicking a new position scrolls candidates to top');
const species=new Map(ctx.window.FXI_SPECIES.map(x=>[x.id,x]));
const score=s=>Math.min(100,20+.55*(s.baseStats.attack*.35+s.baseStats.spAttack*.2+s.baseStats.speed*.35+s.baseStats.hp*.1));
const rank={S:0,A:1,B:2,C:3,D:4};
const ordered=Array.from(grid.children,x=>species.get(Number(x.dataset.speciesId)));
const expected=before.map(id=>species.get(id)).sort((a,b)=>rank[tiers.tier(score(a))]-rank[tiers.tier(score(b))]||a.name.localeCompare(b.name)||a.id-b.id);
assert.deepEqual(ordered.map(x=>x.id),expected.map(x=>x.id),'selected ST position sorts Pokémon S-to-D then alphabetically within each tier');
const actualTiers=ordered.map(x=>rank[tiers.tier(score(x))]);
assert(actualTiers.every((rank,i)=>i===0||rank>=actualTiers[i-1]),'tiers are monotone descending');
assert.match(app.innerHTML,/SORTED BY POSITION FIT/);
assert.doesNotMatch(app.innerHTML,/HP \d+ · ATK/,'draft cards no longer show full six raw stats');
slots[0].onmouseenter();
assert.equal(JSON.parse(saved).selected,9,'occupied slot not treated as new draft destination');
const css=fs.readFileSync(path.join(root,'challenge/challenge.css'),'utf8');
assert.match(css,/\.challenge-pitch \.slot button\[data-slot\][^\n]*position:absolute/,'Full-tile click overlay');
assert.match(css,/\.challenge-pitch \.slot\.empty:hover/,'Hover indication');
console.log('PASS S-D tier sorting per selected position, hover preview without list movement, click reordering and simplified draft cards');
