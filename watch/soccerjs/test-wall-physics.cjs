'use strict';
const assert=require('node:assert/strict');
const Physics=require('./phase10-wall-physics.cjs');
const field={width:106,height:68},r=Physics.RADIUS;
const tolerance=.000015;
const cases=[
 {name:'north rail',from:{x:44,y:9},to:{x:68,y:14},axis:'y',edge:'min'},
 {name:'south rail',from:{x:48,y:62},to:{x:69,y:54},axis:'y',edge:'max'},
 {name:'west end board',from:{x:8,y:12},to:{x:28,y:22},axis:'x',edge:'min'},
 {name:'east end board',from:{x:98,y:56},to:{x:80,y:53},axis:'x',edge:'max'}
];
for(const {name,from,to,axis,edge} of cases){
 const wall=Physics.candidate(from,to,field,axis,edge);
 assert(wall,name+' must be a legal wall');
 assert.equal(wall.axis,axis);assert.equal(wall.edge,edge);
 assert(wall.impactU>0&&wall.impactU<1);
 const stage={mode:'pass',from,to,start:25,duration:4.7,end:29.7,wall};
 const origin=Physics.sampleWall(stage,25);
 const hit=Physics.sampleWall(stage,25+4.7*wall.impactU);
 const arrival=Physics.sampleWall(stage,29.7);
 assert(Math.hypot(origin.x-from.x,origin.y-from.y)<tolerance);
 assert(Math.hypot(arrival.x-to.x,arrival.y-to.y)<tolerance);
 assert(Math.hypot(hit.x-wall.hit.x,hit.y-wall.hit.y)<tolerance,
  name+' must actually TOUCH wall, not visually turn early');
 assert(Math.abs(hit[axis]-(edge==='min'?r:field[axis==='x'?'width':'height']-r))<tolerance);
 assert(Math.abs(hit.impactSeconds-(25+wall.impactU*4.7))<tolerance);
 const early=Physics.sampleWall(stage,hit.impactSeconds-.005);
 const late=Physics.sampleWall(stage,hit.impactSeconds+.005);
 // Sign flip normal to boards proves a real bank, not a curved pass.
 assert((hit[axis]-early[axis])*(late[axis]-hit[axis])<0,
  name+' did not reverse perpendicular wall velocity');
 assert.equal(early.contact,'approaching-wall');assert.equal(late.contact,'rebounding');
 for(let i=0;i<=250;i++){
  const p=Physics.sampleWall(stage,25+i*4.7/250);
  assert(Physics.boundary(p,field),name+' escaped through enclosure');
  assert(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z));
 }
 assert.deepEqual(wall,Physics.candidate({...from},{...to},{...field},axis,edge),
  'Bank path must be deterministic and stateless');
}
for(const side of ['min','max']){
 // The real goal mouth is an opening, not a reflecting barrier.
 assert.equal(Physics.candidate(
  {x:side==='min'?8:98,y:field.height/2},
  {x:side==='min'?24:82,y:field.height/2},field,'x',side),null,
  'Must never bounce across an open goal mouth');
}
assert.equal(Physics.sampleWall({wall:null},4),null);
assert.equal(Physics.boundary({x:-.5,y:30},field),false);
assert.equal(Physics.boundary({x:54,y:69},field),false);
console.log('PASS enclosed wall geometry: four boards, rebound velocity reversals, '+
 'goal-mouth openings, exact impact/contact, complete in-bounds path');
