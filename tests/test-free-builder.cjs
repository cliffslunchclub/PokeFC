'use strict';
// Public homepage smoke and interaction tests using real source and a minimal DOM.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const elements=new Map();
function get(id){
 if(!elements.has(id))elements.set(id,{
  id,value:'',textContent:'',innerHTML:'',hidden:false,
  events:{},addEventListener(type,fn){this.events[type]=fn}
 });
 return elements.get(id);
}
const store=new Map();
const env={
 window:{},document:{getElementById:get},
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
 confirm:()=>true,
 navigator:{},
 console
};
const ctx=vm.createContext(env);
vm.runInContext(fs.readFileSync(path.join(root,'national-species.js'),'utf8'),ctx,{timeout:10000});
assert.equal(env.window.FXI_SPECIES.length,1025,'National Gen I-IX dataset is loaded');
vm.runInContext(fs.readFileSync(path.join(root,'builder.js'),'utf8'),ctx,{timeout:10000});
const api=env.window.PFC_BUILDER;
assert(api,'builder should initialize');
assert.equal(api.getState().lineup.length,11);
assert.equal(api.getState().lineup.filter(Boolean).length,0);
assert.match(get('pitchSlots').innerHTML,/data-slot="10"/);
assert.match(get('prospects').innerHTML,/data-species="/);
assert.equal(Object.keys(api.formations).length,5);
get('prospects').events.click({target:{closest:()=>({dataset:{species:'6'},disabled:false})}});
assert.equal(api.getState().lineup[0],6,'assign Charizard to GK slot');
assert.equal(api.getState().selected,1,'automatically advance to next empty slot');
get('prospects').events.click({target:{closest:()=>({dataset:{species:'6'},disabled:false})}});
assert.equal(api.getState().lineup[1],null,'duplicate species are blocked');
get('formation').events.change({target:{value:'4-4-2'}});
assert.equal(api.getState().formation,'4-4-2');
get('randomize').events.click();
assert.equal(api.getState().lineup.filter(Boolean).length,11);
assert.equal(new Set(api.getState().lineup).size,11,'no duplicates in randomized XI');
const species=env.window.FXI_SPECIES[5];
assert(/^[A-F]$/.test(api.gradeFor(species,'ST')),'public scouting API returns only letter grade');
assert(/^[A-F]$/.test(get('teamScore').textContent),'team grade only');
assert.doesNotMatch(get('pitchSlots').innerHTML,/\d+(?:\.\d+)?\s*OVR/,'no numeric OVR on pitch');
assert.doesNotMatch(get('prospects').innerHTML,/raw-stats|BST\s*\d+|\d+\.\d+<\/b>/,'no underlying stat panel or decimal rating');
assert.match(get('prospects').innerHTML,/<b class="grade-[a-f]">[A-F]<\/b>/,'letter grade on prospect cards');
get('clear').events.click();
assert.equal(api.getState().lineup.filter(Boolean).length,0);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const link of ['./play/','./challenge/','./franchise/'])assert(html.includes(link),'missing nav: '+link);
assert(html.includes('id="genFilter"'),'missing generation filter');
assert(html.includes('id="spriteStyle"'),'missing sprite selector');
assert(html.includes('href="./ratings/"'),'must link to positional grade explanation');
assert(html.includes('XI GRADE'),'team grade label');
assert.equal((html.match(/class="pfc-nav"/g)||[]).length,1);
assert(!/legacy-v07c|legacy-v05|Arcade/.test(html),'retired mode should not be advertised');
const franchise=fs.readFileSync(path.join(root,'franchise/index.html'),'utf8');
assert(franchise.includes('../challenge/'));
assert(franchise.includes('../play/'));
assert(franchise.includes('BUILD YOUR DYNASTY.'));
const challenge=fs.readFileSync(path.join(root,'challenge/index.html'),'utf8');
assert(challenge.includes('../franchise/'));
assert(challenge.includes('../play/'));
assert(env.window.FXI_SPECIES[1024].name==='Pecharunt');
console.log('PASS National Free Builder and three-mode site navigation');
