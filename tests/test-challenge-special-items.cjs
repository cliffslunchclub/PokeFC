'use strict';
/* Challenge regression: real browser scripts + mocked DOM/LocalStorage.
 * Runs without npm packages. node tests/test-challenge-special-items.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
let stored=JSON.stringify({
 version:1,phase:'shop',pool:4,legends:false,formation:'4-3-3',tactic:'balanced',
 roster:[233,6,9,94,25,1,2,3,4,5,7],items:Array(11).fill(null),
 roll:null,selected:0,rng:752139,rerollType:1,rerollGen:1,moves:1,formationChanges:1,locked:null,result:null
});
const controls={};const bound={};
const app={
 innerHTML:'',
 querySelectorAll(selector){
  let elements=[];
  if(selector==='[data-item]'){
   elements=[...app.innerHTML.matchAll(/<select data-item="(\d+)"/g)].map(m=>({dataset:{item:m[1]},value:''}));
  }
  bound[selector]=elements;
  return elements;
 }
};
const logs=[];
const document={getElementById(id){if(id==='app')return app;return controls[id]??=( {value:'balanced'} )}};
const window={};
const context=vm.createContext({window,document,localStorage:{
 getItem(){return stored},
 setItem(_k,v){stored=v}
},crypto:{getRandomValues(arr){arr[0]=752139;return arr}},alert(s){logs.push(s)},confirm(){return true},console});
for(const name of ['species.js','calibration-profile.js','quick-sim.js','challenge/special-items-data.js']){
 vm.runInContext(fs.readFileSync(path.join(base,name),'utf8'),context,{filename:name,timeout:5000});
}
const special=window.PFC_CHALLENGE_SPECIAL;
assert(special.evolvable.includes(233),'Porygon2 must be Eviolite-eligible');
assert(!special.evolvable.includes(6),'Charizard cannot hold Eviolite');
assert.deepEqual(Array.from(special.megas[6].map(m=>m.stone)),['Charizardite X','Charizardite Y']);
assert.equal(special.megas[6][0].stats.attack,130,'Mega X must use official Attack');
const html=fs.readFileSync(path.join(base,'challenge/index.html'),'utf8');
const inline=html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>'));
vm.runInContext(inline,context,{filename:'challenge/index.html:inline',timeout:5000});
const state=()=>JSON.parse(stored);
const slotHtml=i=>app.innerHTML.match(new RegExp('<select data-item="'+i+'"[\\s\\S]*?<\\/select>'))?.[0]||'';
assert.match(slotHtml(0),/Eviolite.*700/,'Porygon2 option shows Eviolite');
assert.doesNotMatch(slotHtml(1),/Eviolite/,'Charizard does not show Eviolite');
assert.match(slotHtml(1),/Charizardite X/);
assert.match(slotHtml(1),/Charizardite Y/);
assert.match(slotHtml(2),/Blastoisinite/);
assert.doesNotMatch(slotHtml(0),/Charizardite/,'no cross-species Mega Stone');
function setItem(i,value){
 const el=bound['[data-item]']?.find(x=>Number(x.dataset.item)===i);
 assert(el,'item control for slot '+i);
 el.value=value;
 el.onchange();
}
const ovr=()=>Number(app.innerHTML.match(new RegExp('Porygon2</button><small> ([0-9.]+) OVR'))?.[1]);
const before=ovr();assert(Number.isFinite(before),'Porygon2 OVR visible');
setItem(0,'Eviolite');
assert.equal(state().items[0],'Eviolite');
assert(ovr()>before,'Eviolite increases Porygon2 positional rating');
assert.match(app.innerHTML,/Item shop · ₽300 remaining/);
setItem(1,'Charizardite X');
assert.equal(state().items[1],null,'budget blocks Eviolite plus Mega Stone');
setItem(0,'');
setItem(1,'Charizardite X');
assert.equal(state().items[1],'Charizardite X');
setItem(2,'Blastoisinite');
assert.equal(state().items[2],null,'second Mega blocked');
assert(logs.some(s=>s.includes('one Mega Evolution')),'limit violation reported');
controls.lock.onclick();
assert.equal(state().phase,'locked');
controls.play.onclick();
assert.equal(state().phase,'result','Lorelei Quick Sim must complete');
assert.equal(state().result.score.length,2);
console.log('PASS Challenge special items: Eviolite, Mega X/Y, eligibility, budget, Mega cap, saved match');
