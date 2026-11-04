'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const ids=[233,6,3,9,149,94,131,143,68,135,196];
let stored=JSON.stringify({version:1,phase:'locked',pool:9,legends:false,formation:'4-3-3',tactic:'balanced',
 roster:ids,items:['Eviolite',...Array(10).fill(null)],roll:null,selected:0,rng:67932,rerollType:1,rerollGen:1,moves:1,formationChanges:1,round:0,history:[],result:null,
 locked:{roster:ids,items:['Eviolite',...Array(10).fill(null)],formation:'4-3-3',tactic:'balanced',score:75}});
const elems={};
const app={innerHTML:'',querySelectorAll:()=>[]};
const captured=[];
const context=vm.createContext({window:{},document:{getElementById:id=>id==='app'?app:(elems[id]??={value:'balanced'})},
 localStorage:{getItem:key=>key==='pokefc-challenge-alpha-1'?stored:null,setItem:(key,v)=>{if(key==='pokefc-challenge-alpha-1')stored=v}},
 crypto:{getRandomValues(a){a[0]=12345;return a}},console,confirm:()=>true,alert:e=>{throw Error(e)}});
for(const name of ['national-species.js','challenge/special-items-data.js','play/opponents.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name});
context.window.FXI_QUICK={simulate(preview){captured.push(preview);return {score:[2,0],stats:[{shots:8,passes:320},{shots:4,passes:210}],events:[]}},
 randomizer:()=>()=>0.3};
const html=fs.readFileSync(path.join(root,'challenge/index.html'),'utf8');
vm.runInContext(html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>')),context,{filename:'challenge-inline',timeout:20000});
const state=()=>JSON.parse(stored);
const names=['Lorelei','Bruno','Agatha','Lance','Blue','Red'];
for(let i=0;i<6;i++){
 assert.equal(state().phase,'locked');
 assert.equal(state().round,i);
 elems.play.onclick();
 assert.equal(state().history.length,i+1,'Exactly one recorded match');
 assert.equal(state().result.boss,names[i]);
 assert.deepEqual(Array.from(state().locked.roster),ids,'Final XI remains unchanged');
 assert.equal(state().locked.items[0],'Eviolite','Items cannot be changed after lock');
 if(i<5){assert.equal(state().phase,'result');elems.next.onclick();}else assert.equal(state().phase,'finished');
}
assert.equal(state().history.length,6);
assert.match(app.innerHTML,/CHALLENGE CHAMPION/);
assert.equal(captured.length,6);
assert(captured.every(p=>p.home.lineup.length===11&&p.away.lineup.length===11));
const blue=captured[4].away.lineup.find(p=>p.name==='Pidgeot');
const redPikachu=captured[5].away.lineup.find(p=>p.name==='Pikachu');
assert(blue&&redPikachu);
assert(blue.main.vision>40,'Blue Mega Pidgeot');
assert(redPikachu.main.finishing>60,'Red Light Ball Pikachu boost');
console.log('PASS six-boss National Challenge gauntlet, fixed opponents, locked XI, champion and boss items');
