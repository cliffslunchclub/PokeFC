'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const roster=[233,6,3,9,149,94,131,143,68,135,196],names=['Lorelei','Bruno','Agatha','Lance','Blue','Red'];
const matches=names.map((boss,i)=>({boss,round:i+1,score:[2,1],shots:[8,4],passes:[310,250],outcome:'Victory',origin:'quick-sim'}));
const makeState=champion=>{
 const history=champion?matches:matches.slice(0,5).map((x,i)=>i===4?{...x,score:[2,3],outcome:'Defeat'}:x);
 return {version:1,phase:'finished',pool:4,legends:true,formation:'4-3-3',tactic:'press',
  roster:roster.slice(),items:['Eviolite',...Array(10).fill(null)],selected:0,roll:null,rng:52399,
  rerollType:0,rerollGen:0,moves:0,formationChanges:0,round:history.length-1,
  history,result:history.at(-1),
  locked:{roster:roster.slice(),items:['Eviolite',...Array(10).fill(null)],formation:'4-3-3',tactic:'press',score:72.9}};
};
function launch(champion){
 let stored=JSON.stringify(makeState(champion));
 const localRecords=JSON.stringify({'classic-legends':{attempts:4,best:6,champions:1}});
 const elements={};
 const app={innerHTML:'',querySelectorAll(){return[]}};
 const clipboard=[];
 const doc={getElementById(id){
  if(id==='app')return app;
  return elements[id]??={id,value:'',hidden:id==='runSharePanel',textContent:'',onclick:null,setAttribute(k,v){this[k]=v}};
 }};
 const context=vm.createContext({window:{},document:doc,
  localStorage:{getItem:k=>k==='pokefc-challenge-alpha-1'?stored:k==='pokefc-challenge-personal-records-v1'?localRecords:null,
   setItem(k,v){if(k==='pokefc-challenge-alpha-1')stored=v;else throw Error('Restart must preserve local records')}},
  navigator:{clipboard:{writeText:async s=>{clipboard.push(s)}}},
  crypto:{getRandomValues(a){a[0]=34567;return a}},
  console,confirm:()=>true,alert:e=>{throw Error(e)}});
 for(const file of ['national-species.js','calibration-profile.js','quick-sim.js','challenge/special-items-data.js','play/opponents.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file,timeout:15000});
 }
 const html=fs.readFileSync(path.join(root,'challenge/index.html'),'utf8');
 vm.runInContext(html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>')),context,{filename:'challenge-inline',timeout:15000});
 return {app,elements,clipboard,getState:()=>JSON.parse(stored)};
}
(async()=>{
 const lost=launch(false);
 assert.match(lost.app.innerHTML,/RUN COMPLETE/);
 assert.match(lost.app.innerHTML,/RUN ENDED AT BLUE/);
 assert.match(lost.app.innerHTML,/72\.9/,'Team score shown');
 assert.match(lost.app.innerHTML,/4W · 1L/,'Record shown');
 assert.match(lost.app.innerHTML,/5 \/ 6/,'Five matches played shown');
 assert.match(lost.app.innerHTML,/FORMATION/);
 assert.match(lost.app.innerHTML,/id="shareRun"/);
 assert.match(lost.app.innerHTML,/id="quickRestart"/);
 assert.match(lost.app.innerHTML,/<dialog id="runCompleteModal"/,'Completed run is rendered inside a dialog');
 assert.equal(lost.elements.runCompleteModal.open,true,'Loss opens run results modal');
 lost.elements.closeRunModal.onclick();
 assert.equal(lost.elements.runCompleteModal.open,false,'Run results modal closes');
 lost.elements.openRunModal.onclick();
 assert.equal(lost.elements.runCompleteModal.open,true,'Run results modal reopens');
 assert.match(lost.app.innerHTML,/id="copyRunSummary"/);
 assert.match(lost.app.innerHTML,/id="postTwitter"[^>]*disabled/,'Direct posting remains unavailable');
 assert.match(lost.app.innerHTML,/LOCAL RECORDS|RUN COMPLETE/);
 const share=lost.elements.shareRun;
 assert(share?.onclick,'Share opens preview');
 share.onclick();
 assert.equal(lost.elements.runSharePanel.hidden,false);
 assert.equal(share['aria-expanded'],'true');
 lost.elements.copyRunSummary.onclick();
 await Promise.resolve();
 assert.equal(lost.clipboard.length,1,'Share copies a summary');
 const copied=lost.clipboard[0];
 assert.match(copied,/TEAM SCORE: 72\.9/);
 assert.match(copied,/RECORD: 4W–1L/);
 assert.match(copied,/MATCHES: 5\/6/);
 assert.match(copied,/Porygon2/);
 assert.match(copied,/HELD ITEMS: Porygon2: Eviolite/);
 assert.match(copied,/https:\/\/pfc.cliffslunchclub.com\/challenge\//);
 lost.elements.quickRestart.onclick();
 const fresh=lost.getState();
 assert.equal(fresh.phase,'draft');
 assert.equal(fresh.pool,4);
 assert.equal(fresh.legends,true);
 assert.equal(fresh.formation,'4-3-3');
 assert.equal(fresh.tactic,'press');
 assert.equal(fresh.history.length,0);
 assert.equal(fresh.items.filter(Boolean).length,0);
 assert.equal(fresh.roster.filter(Boolean).length,0);
 assert.equal(fresh.rerollType,1);
 assert.equal(fresh.rerollGen,1);
 assert.equal(fresh.moves,1);
 assert.equal(fresh.formationChanges,1);
 assert.match(lost.app.innerHTML,/challenge-draft-panel/,'Restart begins another draft');
 const won=launch(true);
 assert.match(won.app.innerHTML,/CHALLENGE CHAMPION/);
 assert.equal(won.elements.runCompleteModal.open,true,'Champion completion opens results modal');
 assert.match(won.app.innerHTML,/6W · 0L/);
 assert.match(won.app.innerHTML,/6 \/ 6/);
 console.log('PASS Challenge completed-run recap, share/copy summary, future X placeholder, Quick Restart, champion/defeat');
})().catch(e=>{console.error(e);process.exitCode=1});
