'use strict';
// Quick Play integration lifecycle regression for the opt-in Soccer-JS path.
// Exercises the actual app controller with the real Quick Sim, but replaces the
// network viewer iframe with a deterministic bridge stub (visual browser tests
// run separately in the public simulation repository).
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const ids=[25,6,3,9,149,94,131,143,68,135,196];
const lineup={version:1,name:'Quick Play 2.5D test XI',formation:'4-3-3',
 lineup:ids.slice(),selected:0,spriteStyle:'pixel'};
const local=new Map([['pokefc-free-builder-v1',JSON.stringify(lineup)]]);
const els=new Map(),sessions=[];
const drawing={clearRect(){},fillRect(){},strokeRect(){},beginPath(){},moveTo(){},
 lineTo(){},stroke(){},arc(){},fill(){},fillText(){},
 set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){},
 set font(v){},set textAlign(v){}};
function el(id){
 if(!els.has(id)){
  const classes=new Set();
  const e={value:id==='region'?'all':id==='opponent'?'gym-1':
    id==='watchSpeed'?'4':id==='tactic'?'balanced':'',
   innerHTML:'',textContent:'',disabled:false,hidden:false,events:{},
   classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
   addEventListener(type,fn){this.events[type]=fn},
   getContext(){return drawing},appendChild(){},replaceChildren(){}
  };
  els.set(id,e);
 }return els.get(id);
}
let active=false;
const bridge={
 isActive:()=>active,
 mountInline(options){
  assert.equal(active,false,'No overlapping 2.5D session');
  assert.equal(typeof options.onRecord,'function');
  const original=JSON.stringify(options.result);
  active=true;let recorded=false,closed=false;
  const session={
   fixture:options.preview,
   getState:()=>({recorded,closed,ready:true,finished:recorded}),
   play(){return true},pause(){return true},
   setSpeed(){return true},setProjection(){return true},setCamera(){return true},
   simToEnd(){
    options.onProgress({minute:90,score:options.result.score,finished:true,handedOff:true});
    return true;
   },
   record(){
    if(recorded||closed)return false;
    recorded=true;
    options.onRecord({result:options.result,minute:90,handoff:'watch-to-quick-sim'});
    assert.equal(JSON.stringify(options.result),original,'Quick Sim result mutated');
    return true;
   },
   destroy(){closed=true;active=false},
   cancel(){
    if(recorded||closed)return false;
    this.destroy();options.onCancel();return true;
   }
  };
  sessions.push(session);options.onReady(session);
  return session;
 }
};
const document={
 getElementById:el,
 querySelector(selector){assert.equal(selector,'.field-shell');return el('field-shell')},
 createElement(tag){assert.equal(tag,'script');return {src:'',onload:null,onerror:null}},
 head:{append(script){assert.match(script.src,/watch-bridge\.js$/);script.onload()}}
};
const context=vm.createContext({
 window:{location:{search:'?watch=soccerjs'},addEventListener(){},FXI_PHASE10_WATCH:bridge},
 document,URLSearchParams,Date,Math,console,
 localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)}
});
for(const filename of ['national-species.js','calibration-profile.js','quick-sim.js',
 'play/opponents.js','play/play.js']){
 vm.runInContext(fs.readFileSync(path.join(root,filename),'utf8'),context,{filename,timeout:20000});
}
assert(context.window.PFC_PLAY);
assert.equal(el('watch').disabled,false,'Watch button should be enabled after bridge script');
assert.equal(el('soccerWatchActions').hidden,true,'Pre-match controls hidden');
el('watch').events.click();
assert.equal(sessions.length,1,'First Watch should start');
assert.equal(active,true);
assert.equal(el('field-shell').classList.contains('soccerjs-active'),true);
assert.equal(el('watch').disabled,true,'Cannot overlap a running watch');
sessions[0].simToEnd();
assert.equal(el('soccerRecord').disabled,false,'Official result should be recordable at full time');
el('soccerRecord').events.click();
assert.equal(el('watch').disabled,false,'New match available after recording');
assert.equal(active,true,'Final frame remains mounted until starting another match');
el('watch').events.click();
assert.equal(sessions.length,2,'A second watched match must be allowed after recording');
assert.equal(sessions[0].getState().closed,true,'Recorded previous session cleaned up');
assert.equal(active,true);
assert.equal(el('watch').disabled,true);
el('soccerCancel').events.click();
assert.equal(active,false,'Cancel closes second session');
assert.equal(el('field-shell').classList.contains('soccerjs-active'),false);
assert.equal(el('watch').disabled,false,'Watch can restart after cancel');
assert.equal(el('soccerWatchActions').hidden,true);
assert.match(el('engineStatus').textContent,/without recording/);
console.log('PASS 2.5D Quick Play lifecycle: Watch, full time, record, new Watch, cancel; real Quick Sim stays authoritative');
