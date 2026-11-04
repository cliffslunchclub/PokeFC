'use strict';
/* Validate item-first Challenge catalog: compatible targets, refunds, one Mega,
 * unique items, Eviolite and budget, from real browser scripts. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
let stored=JSON.stringify({version:1,phase:'shop',pool:4,legends:false,formation:'4-3-3',tactic:'balanced',
 roster:[233,6,9,94,25,1,2,3,4,5,7],items:Array(11).fill(null),
 roll:null,selected:0,rng:752139,rerollType:1,rerollGen:1,moves:1,formationChanges:1,locked:null,result:null});
const controls={};const bound={};
const app={innerHTML:'',querySelectorAll(sel){
 let buttons=[];
 if(sel==='[data-shop-pick]')buttons=[...this.innerHTML.matchAll(/<button type="button" data-shop-pick="([^"]+)"[^>]*>/g)]
  .map(x=>({dataset:{shopPick:x[1]},onclick:null,disabled:/\bdisabled\b/.test(x[0])}));
 if(sel==='[data-shop-clear]')buttons=[...this.innerHTML.matchAll(/data-shop-clear="(\d+)"/g)].map(x=>({dataset:{shopClear:x[1]},onclick:null}));
 bound[sel]=buttons;return buttons;
}};
const doc={getElementById(id){return id==='app'?app:(controls[id]??={id,value:id==='tactic'?'balanced':'',textContent:'',scrollTop:0,onclick:null})}};
const window={},logs=[];
const ctx=vm.createContext({window,document:doc,localStorage:{
 getItem(){return stored},setItem(_key,v){stored=v}},crypto:{getRandomValues(a){a[0]=752139;return a}},
 alert:s=>logs.push(s),confirm:()=>true,console});
for(const file of ['national-species.js','calibration-profile.js','quick-sim.js','challenge/special-items-data.js','challenge/tiers.js','play/opponents.js']){
 vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file,timeout:15000});
}
const special=window.PFC_CHALLENGE_SPECIAL;
assert(special.evolvable.includes(233));
assert(!special.evolvable.includes(6));
assert.deepEqual(Array.from(special.megas[6].map(m=>m.stone)),['Charizardite X','Charizardite Y']);
const html=fs.readFileSync(path.join(root,'challenge/index.html'),'utf8');
vm.runInContext(html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>')),ctx,{filename:'challenge-inline',timeout:15000});
const state=()=>JSON.parse(stored);
assert.match(app.innerHTML,/id="shopCatalog"/);
assert.match(app.innerHTML,/id="shopTarget"/);
assert.match(app.innerHTML,/data-shop-pick="Leftovers"/);
assert.match(app.innerHTML,/data-shop-pick="Eviolite"/);
assert.match(app.innerHTML,/data-shop-pick="Charizardite X"/);
assert.match(app.innerHTML,/data-shop-pick="Charizardite Y"/);
assert.match(app.innerHTML,/data-shop-pick="Blastoisinite"/);
assert.doesNotMatch(app.innerHTML,/\d+(?:\.\d+)? OVR/,'raw OVR hidden from Challenge');
const poryTier=()=>app.innerHTML.match(/<span class="slot-name">Porygon2<\/span>[\s\S]*?<span class="slot-tier tier-([sabcd])">/)?.[1];
assert.equal(poryTier(),'b','Porygon2 initial midfield tier');
function choose(name){
 const b=bound['[data-shop-pick]']?.find(b=>b.dataset.shopPick===name);
 assert(b&&!b.disabled,'selectable item '+name);b.onclick();
}
function equip(name,index){
 choose(name);doc.getElementById('shopTarget').value=String(index);doc.getElementById('equipShopItem').onclick();
}
equip('Eviolite',0);
assert.equal(state().items[0],'Eviolite');
assert.equal(poryTier(),'a','Eviolite improves Porygon2 from B to A');
assert.match(app.innerHTML,/₽300 LEFT/);
equip('Eviolite',1);
assert.equal(state().items[1],null,'Eviolite not usable by Charizard');
assert.match(controls.shopFeedback.textContent,/not compatible/);
equip('Charizardite X',1);
assert.equal(state().items[1],null,'Eviolite + Mega Stone exceeds ₽1000');
assert.match(controls.shopFeedback.textContent,/budget/);
choose('Eviolite');controls.removeSelectedItem.onclick();
assert.equal(state().items[0],null,'remove Eviolite refunds');
equip('Charizardite X',1);
assert.equal(state().items[1],'Charizardite X');
assert.match(app.innerHTML,/₽300 LEFT/);
equip('Blastoisinite',2);
assert.equal(state().items[2],null,'second Mega blocked');
assert.match(controls.shopFeedback.textContent,/one Mega Evolution/);
equip('Leftovers',0);
assert.equal(state().items[0],'Leftovers');
equip('Leftovers',5);
assert.equal(state().items[0],null,'reassign moves unique held item');
assert.equal(state().items[5],'Leftovers');
assert.equal(state().items.filter(x=>x==='Leftovers').length,1);
controls.lock.onclick();
assert.equal(state().phase,'locked');
controls.play.onclick();
assert(['result','finished'].includes(state().phase));
assert.equal(state().result.boss,'Lorelei');
assert.equal(state().history.length,1);
assert.deepEqual(state().locked.items.slice(0,6),[null,'Charizardite X',null,null,null,'Leftovers']);
console.log('PASS item-first Challenge shop: tier boosts, item eligibility, budget, one Mega, reassignment, refunds and locked match');
