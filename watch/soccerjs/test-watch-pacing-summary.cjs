'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {rawMotionFrame,motionFrame,playbackRate}=require('./phase10-motion.cjs');
const C=require('./phase10-commentary.cjs');
const f=require('./fixture.json'),field={width:106,height:68},before=JSON.stringify(f);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
for(const goal of f.events.filter(e=>e.type==='goal')){
 const end=rawMotionFrame(f,goal.minute,field),kick=end.goalShotStart;
 assert(goal.minute*60-end.goalBallStart<12,'Active buildup was stretched instead of distance-timed');
 for(const [start,finish,speed] of [[end.goalPassStart,kick,14],[kick,goal.minute*60,24]]){
  const mid=(start+finish)/2;
  const a=rawMotionFrame(f,(mid-.005)/60,field),b=rawMotionFrame(f,(mid+.005)/60,field);
  const actual=dist(a.ball,b.ball)/.01;
  assert(actual>speed*.99&&actual<speed*1.01,'Goal pass/shot slowed down: '+actual);
 }
 for(const sec of [end.goalSequenceStart,end.goalBallStart,end.goalPassStart,kick]){
  const a=rawMotionFrame(f,(sec-.00001)/60,field),b=rawMotionFrame(f,(sec+.00001)/60,field);
  assert(dist(a.ball,b.ball)<.01,'Goal scene teleports its ball');
  assert(Math.max(...a.actors.map((p,i)=>dist(p,b.actors[i])))<.02,'Goal scene teleports a player');
 }
 for(const speed of [1,2,4,8,16])
  assert.equal(playbackRate(goal.minute-.01,f.events,speed),speed/60);
 assert.equal(motionFrame(f,goal.minute,field).officialEvent,goal);
}
const frame=(side,x)=>({ownerIndex:side*11+6,ball:{x,y:34,z:.23}});
let line=C.teamSummary(f,field,60,frame(0,40));
assert.equal(line.text,'Red team builds from the back.');
assert.equal(C.teamSummary(f,field,61,frame(0,41),line),line,'Unchanged state should not churn captions');
line=C.teamSummary(f,field,62,frame(0,54),line);assert.match(line.text,/crosses midfield/);
line=C.teamSummary(f,field,63,frame(1,50),line);assert.equal(line.text,'White team wins possession.');
line=C.teamSummary(f,field,64,frame(1,10),line);assert.match(line.text,/prime scoring position/);
assert(!/Pokémon|passes|finds/.test(line.text),'Fast commentary must stay at team level');
const ctx=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../../challenge/match-report.js'),'utf8'),ctx);
const report=ctx.window.PFC_MATCH_REPORT;
const events=f.events.filter(e=>e.type==='goal'),timeline=report.timelineFromEvents(events,f);
assert.deepEqual(Array.from(timeline,e=>e.replayId),events.map((_,i)=>'goal-'+i));
const html=report.renderGroupedTimeline(timeline,{replayButton:e=>'<button data-replay="'+e.replayId+'">View replay</button>'});
assert.equal((html.match(/>View replay<\/button>/g)||[]).length,events.length);
assert.equal(JSON.stringify(f),before,'PSE fixture changed');
console.log('PASS distance-paced goals, continuous phase transitions, fixed Watch speed, team summaries and timeline replay IDs');
