'use strict';
const assert=require('node:assert/strict');
const Q=require('../../assets/js/quick-sim.js'),Bridge=require('./watch-bridge.js');
const One=require('./phase10-one-on-one.cjs'),Save=require('./phase10-save-sequence.cjs');
const Flight=require('./phase10-clearance-flight.cjs');
const {motionFrame,rawMotionFrame,presentationFrame}=require('./phase10-motion.cjs');
const base=require('./fixture.json'),field={width:106,height:68};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const frozen=JSON.stringify(base);
let seenKeeper=0,seenDefender=0,blocks=0,official=0,punts=0;
function checkFlight(stage,from,to,start,end,label){
 const range=distance(from,to);
 assert(range>=24.99&&range<=35.01,label+' must be 25–35m: '+range.toFixed(2));
 const p0=Flight.flight(stage,start),p1=Flight.flight(stage,start+.02);
 assert(distance(p0,from)<.000001);
 assert(p1.z>p0.z,label+' must launch visibly');
 assert(Math.hypot(p0.vx,p0.vy)<=27,label+' unreal launch speed');
 assert(distance(Flight.flight(stage,end),to)<.000001,label+' must land exactly');
 const touchdown=start+.66*(end-start),bounce=start+.76*(end-start);
 assert(Math.abs(Flight.flight(stage,touchdown).z-.23)<.00001);
 assert(Flight.flight(stage,bounce).z>.3,'Ball must visibly bounce after first contact');
 const last=Flight.flight(stage,end-.05);
 assert(Math.hypot(last.vx,last.vy)<Math.hypot(p0.vx,p0.vy),'Ball must lose speed');
 for(const t of [touchdown,bounce,start+.86*(end-start)]){
  const a=Flight.flight(stage,t-.00001),b=Flight.flight(stage,t+.00001);
  assert(distance(a,b)<.001,'Position teleported on '+label);
  assert(Math.abs(Math.hypot(a.vx,a.vy)-Math.hypot(b.vx,b.vy))<.01);
 }
}
const raw=s=>presentationFrame(base,s,field);
const hits=One.build(base,field,raw).filter(x=>x.outcome==='block');
for(const s of hits.slice(0,30)){
 assert(s.clearFlight&&s.clearance,'Loose block omitted real clearance');
 checkFlight(s.clearFlight,s.loose,s.clearTo,s.clearAt,s.clearArrival,'block');
 const kick=motionFrame(base,(s.clearAt+.001)/60,field);
 assert.equal(kick.action,'illustrative-upfield-clearance');
 assert(distance(kick.ball,kick.actors[s.clearer])<1,'Kicker did not physically reach ball');
 const arrival=motionFrame(base,s.clearArrival/60,field);
 assert(distance(arrival.ball,arrival.actors[s.receiver])<1.6,'Receiver must touch ball');
 if(s.clearer===s.keeper)seenKeeper++;else seenDefender++;
 blocks++;
}
assert(seenKeeper>0&&seenDefender>0&&blocks>=5,
 'Require both GK- and defender-cleared blocks after first physical contact');
const preview={home:base.home,away:base.away};
const result=Q.simulate(preview,{seed:'official-saves-1'});
const fixture={...Bridge.snapshot(preview,result),visualSeed:'issue104-keeper-punt-1'};
const savedBefore=JSON.stringify(fixture);
for(const e of fixture.events.filter(x=>x.type==='save').slice(0,12)){
 const prior=sec=>rawMotionFrame(fixture,sec/60,field,true);
 const s=Save.sequence(fixture,field,e,prior);
 if(!s||s.arrival>=fixture.durationMinutes*60||s.puntPlan?.conflict)continue;
 assert(Math.abs(s.release-e.minute*60-.65)<1e-6,'Goalkeeper clears within approved .65s');
 checkFlight(s.clearFlight,s.net,s.target,s.release,s.arrival,'official GK punt');
 const at=motionFrame(fixture,e.minute,field,{saveEvent:e});
 assert.equal(at.officialEvent,e,'PSE official save mutated');
 const shown=motionFrame(fixture,(s.release+.5)/60,field,{saveEvent:e});
 assert.equal(shown.action,'illustrative-keeper-punt');
 assert(distance(shown.ball,Flight.flight(s.clearFlight,s.release+.5))<.001);
 punts++;official++;
}
assert(punts>=1,'No physical goalkeeper punts followed official PSE saves');
assert.equal(JSON.stringify(fixture),savedBefore);
assert.equal(JSON.stringify(base),frozen);
console.log('PASS #104: '+blocks+' first-touch blocked clearances ('+seenKeeper+' GK, '+seenDefender+
 ' defender), '+punts+' official save punts, 25–35 m, air/bounce/roll, immutable PSE');
