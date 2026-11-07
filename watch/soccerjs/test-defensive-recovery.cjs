'use strict';
const assert=require('node:assert/strict'),S=require('./phase10-team-shape.cjs');
const {base}=require('./phase10-motion.cjs');
const field={width:106,height:68},lineup=Array.from({length:11},(_,i)=>({pos:i===0?'GK':i<5?'DEF':i<8?'MID':'FWD'}));
const fixture={home:{lineup},away:{lineup}};
for(const defending of [0,1]){
 const x=defending===0?12:94,shape={active:1-defending,ball:{x,y:34},attack:[0,0],defense:[0,0],age:Infinity,profiles:[S.styleFor('balanced'),S.styleFor('balanced')]};
 shape.attack[1-defending]=1;shape.defense[defending]=1;
 const depth=a=>defending===0?a.x:106-a.x;
 const poses=Array.from({length:11},(_,i)=>S.position(fixture,field,defending*11+i,60,shape,base(defending,i,field)));
 assert(poses.slice(8).every(a=>depth(a)<55),'Forwards must track back toward midfield');
 assert(poses.slice(5,8).every(a=>depth(a)<12),'Recovered midfield must be goal-side behind the press');
 assert(poses.slice(1,5).every(a=>depth(a)<Math.min(...poses.slice(5,8).map(depth))),'Defenders retain covering depth behind midfield');
 const actors=Array.from({length:22},(_,id)=>({...base(Math.floor(id/11),id%11,field)}));
 const visual={stage:{start:0,end:10,duration:10},plan:{turnovers:[]}};
 const pressShape={active:1-defending,phase:'settled',age:Infinity,profiles:shape.profiles};
 const r=S.press(fixture,field,5,visual,pressShape,actors,{x:defending===0?20:86,y:5});
 assert(r.nearGoal>0,'Urgency starts outside the penalty box, measured from goal line even in a wide lane');
 assert(r.ids.length===3&&r.ids.every(id=>Math.floor(id/11)===defending&&id%11!==0));
}
console.log('PASS coordinated recovery for both teams: 22 m wide-lane urgency, three outfield pressers, recovering forwards, central midfield shield and covering back line');
