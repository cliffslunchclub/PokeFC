'use strict';
const assert=require('node:assert/strict');
const D=require('./phase10-play-director.cjs');
const {motionFrame}=require('./phase10-motion.cjs');
const fixture=require('./repros/natural-clearance-104.json');
const field={width:106,height:68},before=JSON.stringify(fixture);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const length=v=>Math.hypot(v.vx||0,v.vy||0);
let verified=0,bounces=0,receivers=new Set(),sides=new Set();
for(const seed of [fixture.visualSeed,'issue-104-mirror-1','issue-104-mirror-2']){
 const f={...fixture,visualSeed:seed};
 const plan=D.planFor(f,field);
 const clearances=plan.actions.filter(a=>a.pattern==='defensive-clearance');
 assert(clearances.length>=3,'Saved fixture no longer reaches defensive clearances');
 for(const a of clearances.slice(0,15)){
  const side=Math.floor(a.owner/11),distance=dist(a.from,a.to);
  assert(a.mode===(a.clearance?.intercepted?'challenge':'pass'),
   'Only a physically won interception may switch teams during a clearance');
  assert(a.wall===null,'No intentional board play');
  // 25–35 m is the default. Longer flights require an explicit, bounded emergency.
  assert(distance>=24.99&&(distance<=35.01||a.clearance?.emergency&&distance<=48),
   'Legacy 52 m clearance still present: '+distance.toFixed(2)+'m seed='+seed);
  assert(a.clearance?.flightSeconds>0,'Must declare real flight time');
  assert(a.clearance?.landingSeconds>a.start,'Landing must be after kick');
  assert(a.clearance?.bounceEndSeconds>a.clearance.landingSeconds,
   'Real ball bounce must follow the landing');
  assert(a.clearance?.receiver===a.receiver,'Planned catcher inconsistent');
  assert(a.clearance?.supporters?.length>=2,'At least two supporting teammates react');
  assert(a.clearance?.contesters?.length>=2,'At least two opponents contest');
  const launch=D.ballAt(a,a.start),early=D.ballAt(a,a.start+.02);
  assert(length(launch)>8&&length(launch)<27,'Real launch velocity missing/implausible');
  assert(early.z>launch.z,'Kick must rise');
  for(const t of [a.start,a.start+.02,a.start+a.duration*.2,
   a.clearance.landingSeconds-.01,a.clearance.landingSeconds,
   a.clearance.landingSeconds+.01,a.clearance.bounceEndSeconds,a.end]){
   const b=D.ballAt(a,t);
   assert(Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.z));
   assert(b.x>=0&&b.x<=106&&b.y>=0&&b.y<=68&&b.z>=.22-.001);
   const tiny=.00001;
   if(t>a.start+tiny&&t<a.end-tiny){
    const l=D.ballAt(a,t-tiny),r=D.ballAt(a,t+tiny);
    assert(dist(l,r)<.001,'Flight teleported at '+t);
    assert(Math.abs(length(l)-length(r))<.01,'Horizontal velocity snapped at '+t);
   }
  }
  const land=D.ballAt(a,a.clearance.landingSeconds),
   bounced=D.ballAt(a,(a.clearance.landingSeconds+a.clearance.bounceEndSeconds)/2),
   rolled=D.ballAt(a,(a.clearance.bounceEndSeconds+a.end)/2);
  assert(land.z<=.24,'Clearance must touch grass before bouncing');
  assert(bounced.z>land.z+.06,'Real rebound missing');
  assert(Math.abs(rolled.z-.23)<.02,'Ball must roll on grass after bouncing');
  assert(length(D.ballAt(a,a.start+.05))>length(D.ballAt(a,a.end-.05)),
   'Friction cannot accelerate a kicked ball');
  const receiver=D.actorAt(plan,a.receiver,a.end-1e-6,D.base(a.receiver,field));
  const endBall=D.ballAt(a,a.end);
  assert(dist(receiver,endBall)<1.6,'Receiver never physically arrives');
  for(const i of [a.receiver,...a.clearance.supporters,...a.clearance.contesters]){
   const left=D.actorAt(plan,i,a.start+.05,D.base(i,field));
   const right=D.actorAt(plan,i,a.end-.05,D.base(i,field));
   assert(dist(left,right)>.2,'Runner stood idle on release: '+i);
   for(let t=a.start+.1;t<a.end-.1;t+=.1){
    const p=D.actorAt(plan,i,t,D.base(i,field)),
     q=D.actorAt(plan,i,t+.001,D.base(i,field));
    assert(dist(p,q)/.001<=5.1,'Actor exceeded run cap '+i);
   }
  }
  const after=plan.actions.find(x=>x.start>=a.end-1e-5);
  assert(after&&after.mode==='carry'&&after.owner===a.receiver,
   'Possession must settle into controlled first-touch dribble');
  assert(after.end-after.start>=1,'No immediate return shot or clearance loop');
  sides.add(side);receivers.add(a.receiver);verified++;bounces++;
 }
 for(const event of f.events.filter(e=>e.type==='goal'||e.type==='save')){
  const frame=motionFrame(f,event.minute,field);
  assert.equal(frame.officialEvent?.type,event.type,'Official PSE incident missing');
  assert.equal(frame.officialEvent?.player,event.player,'Official PSE player changed');
 }
}
assert.deepEqual([...sides].sort(),[0,1],'Clearances must work in both attacking directions');
assert(verified>15&&bounces===verified&&receivers.size>2);
assert.equal(JSON.stringify(fixture),before,'Director must not mutate official PSE fixture');
// Synthetic opponent-wins-the-race example: visual possession may switch
// ONLY when a real outfield opponent reaches the ball first.
const Clearance=require('./phase10-clearance-flight.cjs');
const positions=Array.from({length:22},()=>({x:4,y:61}));
positions[6]={x:43,y:34}; // Teammate is two meters short of minimum 25m landing
for(let id=12;id<22;id++){
 const n=id-12;positions[id]={x:45+(n%5)*2.5,y:32+Math.floor(n/5)*4};
}
const contested=Clearance.plan({field,from:{x:20,y:34,z:.23},owner:2,side:0,
 position:id=>positions[id],seed:'issue104-intercept-0',offside:()=>false});
assert(!contested.conflict,'Synthetic physical contest has valid reachable kick');
assert(contested.intercepted,'Closer opponent should physically intercept: '+JSON.stringify(contested));
assert.equal(Math.floor(contested.receiver/11),1,'Give actual first touch to opponent');
assert(contested.intendedReceiver===6,'Original intended teammate retained in diagnostic');
assert(dist(contested.to,{x:20,y:34})>=25);
console.log('PASS issue #104 saved visual seed: '+verified+' physically continuous 25–35m clearances, bounced recovery, 22-player movement and locked PSE');
