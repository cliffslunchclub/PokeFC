'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {motionFrame,shotSummary,playbackRate,cameraFocus}=require('./phase10-motion.cjs');
const fixture=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'fixture.json'),'utf8'));
const initial=JSON.stringify(fixture);
const field={width:106,height:68};
const types=new Set(),teamIds=[fixture.home.id,fixture.away.id];
let runs=0;
for(let tenth=0;tenth<=100;tenth++){
 const minute=tenth/20; // first five match minutes, deterministic 0.05m samples
 const frame=motionFrame(fixture,minute,field);
 assert.deepEqual(frame,motionFrame(fixture,minute,field));
 assert.equal(frame.actors.length,22);
 for(const actor of frame.actors){
  assert(Number.isFinite(actor.x)&&Number.isFinite(actor.y));
  assert(actor.x>=-2&&actor.x<=108,'Actor left field');
  assert(actor.y>=-2&&actor.y<=70,'Actor left field');
 }
 assert(Number.isFinite(frame.ball.x)&&Number.isFinite(frame.ball.y)&&Number.isFinite(frame.ball.z));
 assert(frame.ball.x>=-2&&frame.ball.x<=108);
 assert(frame.ball.y>=-2&&frame.ball.y<=70);
 types.add(frame.action);
 runs++;
}
for(const action of ['illustrative-carry','illustrative-pass','illustrative-dribble','illustrative-challenge'])
 assert(types.has(action),'No '+action+' in five-minute clip');
for(const goal of fixture.events){
 const before=motionFrame(fixture,goal.minute-.08,field);
 const at=motionFrame(fixture,goal.minute,field);
 assert(before.action==='illustrative-shot'||before.action==='illustrative-goal-buildup');
 assert.equal(at.action,'official-goal');
 assert.equal(at.officialEvent.player,goal.player,'Official player changed in animation');
 assert.equal(at.officialEvent.team,goal.team);
 const side=teamIds.indexOf(goal.team),idx=([fixture.home,fixture.away][side]).lineup.findIndex(p=>p.id===goal.player);
 assert(at.actors[side*11+idx].frame===3,'Shooter not in shot pose');
}
const finalLabel=shotSummary(fixture.stats);
assert.match(finalLabel,/FULL-TIME TOTALS \(not live\)/);
assert.match(finalLabel,/Shots 14–16/);
assert.match(finalLabel,/On target 9–7/);
assert.match(finalLabel,/Keeper saves 6–7/);
assert.throws(()=>shotSummary([{...fixture.stats[0],shotsOnTarget:99},fixture.stats[1]]),/reconcile/);
const goal=fixture.events[0],early=playbackRate(0,fixture.events,4);
assert.equal(early,2,'Ordinary pacing remains backward compatible');
assert(playbackRate(goal.minute-.3,fixture.events,4)<early,'Slow down before official goals');
assert(playbackRate(goal.minute+.1,fixture.events,4)<early,'Slow down just after official goals');
const target={x:30,y:20},start={x:0,y:0};
const moving=cameraFocus(start,target,.05);
assert(moving.x>0&&moving.x<30&&moving.y>0&&moving.y<20,'Camera pans smoothly');
assert.deepEqual(cameraFocus(start,target,1),target,'Large seeks reset camera tracking');
assert.equal(JSON.stringify(fixture),initial,'Source match mutated by visuals');
console.log('PASS Phase10 isometric motion: '+runs+' identical five-minute frames, passes, contests, dribbles, all 3 official scorers, no source change');
