'use strict';
const assert=require('node:assert/strict');
const C=require('./goal-celebration.cjs'),K=require('./phase10-kickoff.cjs');
const {motionFrame,rawMotionFrame,presentationFrame}=require('./phase10-motion.cjs');
const {draw}=require('./pokemon-draw.cjs');
const f=require('./fixture.json'),field={width:106,height:68},before=JSON.stringify(f);
let goals=0;
for(const event of f.events.filter(e=>e.type==='goal')){
 const frame=motionFrame(f,event.minute,field),copy=JSON.stringify(frame),s=C.create(f,event,frame);
 let hops=0,priorZ=0,descending=false;
 for(let t=0;t<=3;t+=.025){
  const view=C.sample(s,t,field),actor=view.frame.actors[s.scorer];
  assert.deepEqual(view.frame.ball,frame.ball);assert.equal(view.frame.officialEvent,event);
  assert(view.zoom>=1&&view.zoom<=1.35);assert(Math.hypot(view.focus.x-actor.x,view.focus.y-actor.y)<=3);
  if(actor.z<priorZ&&!descending){hops++;descending=true;}if(actor.z>priorZ)descending=false;
  priorZ=actor.z;
  for(const p of view.frame.actors)assert(p.x>=.9&&p.x<=105.1&&p.y>=.9&&p.y<=67.1);
 }
 assert.equal(hops,3);assert(C.sample(s,3,field).frame.actors[s.scorer].z<1e-6);
 const reduced=C.create(f,event,frame,true),still=C.sample(reduced,1.5,field);
 assert.deepEqual(still.frame.actors,frame.actors);assert.equal(still.zoom,1);
 assert.equal(JSON.stringify(frame),copy);
 const normal=sec=>rawMotionFrame(f,sec/60,field,true);
 const k=K.scenes(f,field,normal,sec=>rawMotionFrame(f,sec/60,field)).find(s=>s.goal===event);
 assert.equal(k.transit,0,'Post-goal travel must be a camera cut');
 const restart=K.apply(f,field,k.ready,normal(k.ready),normal,sec=>rawMotionFrame(f,sec/60,field));
 assert.equal(restart.contact,'kickoff-setup');assert.equal(restart.sceneCut,'post-goal-kickoff');
 assert(Math.hypot(restart.ball.x-53,restart.ball.y-34)<1e-8);
 assert.equal(restart.actors.filter(p=>Math.hypot(p.x-53,p.y-34)<9.15).length,2);goals++;
}
// Observe actual canvas draw arguments: sprite dimensions scale with the same
// projection multiplier, while the ground shadow stays at the player's feet.
const entry={image:{naturalWidth:80},color:'#ff0000'};
function paint(scale,z=0){
 const calls=[];const g=new Proxy({drawImage:(...a)=>calls.push(a),ellipse:(...a)=>calls.push(['shadow',...a])},
  {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 const screen=(x,y,h)=>({x:x*scale,y:(y-h)*scale});
 draw(g,{x:10,y:20,z},entry,screen,false,false,scale);
 return calls;
}
const a=paint(1),b=paint(2),jump=paint(2,.6);
assert.equal(b[1][3],a[1][3]*2);assert.equal(b[1][4],a[1][4]*2);
assert.equal(jump[0][2],b[0][2],'Jump shadow must remain grounded');
assert(jump[1][2]<b[1][2],'Jump must lift the sprite');
// Historical, tightly clustered official incidents must not let an earlier
// save's recovery hide a later goal's direct kickoff cut.
const historical=JSON.parse(before),g=historical.events.find(e=>e.type==='goal');
const defending=g.team===historical.home.id?historical.away:historical.home;
historical.events.push({type:'save',minute:g.minute-.05,team:defending.id,
 player:defending.lineup[0].id,shooter:g.player});
historical.events.sort((a,b)=>a.minute-b.minute);
const restart=presentationFrame(historical,(g.minute+.22)*60+1e-4,field);
assert.equal(restart.contact,'kickoff-setup','Old save recovery masked a later kickoff');
assert.equal(restart.sceneCut,'post-goal-kickoff');
assert.equal(JSON.stringify(f),before);
console.log('PASS celebration: '+goals+' goals, 3 hops, immutable PSE/ball, bounded sweep, reduced motion, direct two-player kickoff cuts and proportional sprite scaling');
