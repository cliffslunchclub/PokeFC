'use strict';
const assert=require('node:assert/strict');
const Keeper=require('./phase10-goalkeeper-rush.cjs');
const Director=require('./phase10-play-director.cjs');
const {motionFrame}=require('./phase10-motion.cjs');
const fixture=require('./fixture.json'),field={width:106,height:68};
const before=JSON.stringify(fixture),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// A held one-on-one 14m from goal must draw the keeper out, continuously.
for(const side of [0,1]){
 const opening=Keeper.center(side,field),ball={x:side===0?14:92,y:34,z:.23};
 const event={},config={start:0,end:6.13,shot:5,side,opening,
  ballAt:()=>ball,diveY:36};
 const early=Keeper.sceneAt(field,event,2,config);
 assert(dist(early,ball)<2,'Keeper must close a 14m one-on-one within two seconds');
 let prev=opening;
 for(let sec=.01;sec<=6.13;sec+=.01){
  const next=Keeper.sceneAt(field,event,sec,config);
  assert(dist(prev,next)/.01<=5.000001,'Goal-scene keeper exceeds 5m/s');prev=next;
 }
 assert.deepEqual(Keeper.sceneAt(field,event,2,config),early,'Rewind changed keeper position');
}
// Exercise motionFrame's actual official-goal branch, not only Keeper.at.
// Place a test goal after an existing box entry; the original PSE fixture
// remains untouched. The ball path must still finish with that exact goal.
const plan=Director.planFor(fixture,field);
for(const attack of [0,1]){
 let start=null;
 for(let sec=50;sec<5000;sec+=.5){
  const visual=Director.sample(fixture,field,sec),b=visual.ball;
  const depth=attack===0?field.width-b.x:b.x;
  if(Math.floor(visual.stage.owner/11)===attack&&depth>4&&depth<13&&
   Math.abs(b.y-34)<5){start=sec;break;}
 }
 assert(start!==null,'Need a seeded penalty-area entry in each direction');
 const roster=attack===0?fixture.home:fixture.away;
 const goal={type:'goal',team:roster.id,player:roster.lineup[8].id,minute:start/60+.7};
 const sample={...fixture,events:[goal]},defend=1-attack;
 const opening=motionFrame(sample,start/60,field).actors[defend*11];
 let minGap=Infinity,rushing=0,prev=opening;
 for(let sec=start+.05;sec<goal.minute*60;sec+=.05){
  const frame=motionFrame(sample,sec/60,field),keeper=frame.actors[defend*11];
  assert(dist(prev,keeper)/.05<=5.01,'Goal buildup teleports keeper');prev=keeper;
  if(frame.goalkeeperRushSide===defend){rushing++;minGap=Math.min(minGap,dist(keeper,frame.ball));}
 }
 assert(rushing>10,'Official goal buildup must use penalty-area rush logic');
 assert(minGap<2,'Keeper never closed the scorer during a box one-on-one: '+minGap);
 const result=motionFrame(sample,goal.minute,field);
 assert.equal(result.officialEvent,goal);assert.equal(result.action,'official-goal');
 const direction=attack===0?1:-1;
 assert((result.ball.x-(attack===0?field.width:0))*direction>0);
 assert.deepEqual(motionFrame(sample,start/60+.2,field),
  motionFrame(JSON.parse(JSON.stringify(sample)),start/60+.2,field));
}
assert.equal(JSON.stringify(fixture),before);
assert(plan.actions.length>100);
console.log('PASS goal-scene goalkeeper: both box directions, 14m closure, bounded speed, rewind and exact PSE goals');
