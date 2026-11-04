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
vm.runInContext(fs.readFileSync(path.join(root,'species.js'),'utf8'),ctx,{timeout:10000});
assert.equal(env.window.FXI_SPECIES.length,493,'Gen I-IV dataset is loaded');
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
assert(Number.isFinite(api.rating(species,'ST')));
get('clear').events.click();
assert.equal(api.getState().lineup.filter(Boolean).length,0);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const label of ['Home / Free Builder','Challenges','Franchise'])assert(html.includes(label),'missing nav: '+label);
assert(!/legacy-v07c|legacy-v05|Arcade/.test(html),'retired mode should not be advertised');
const franchise=fs.readFileSync(path.join(root,'franchise/index.html'),'utf8');
assert(franchise.includes('../challenge/'));
assert(franchise.includes('Franchise · 32 Gyms'));
const challenge=fs.readFileSync(path.join(root,'challenge/index.html'),'utf8');
assert(challenge.includes('../franchise/'));
console.log('PASS Free Builder and three-section site navigation');
