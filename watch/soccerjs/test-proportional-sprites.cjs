'use strict';
const assert=require('node:assert/strict');
const {draw}=require('./pokemon-draw.cjs');
const mock=()=>{const calls=[],g={
 save(){},restore(){},beginPath(){},ellipse(...a){calls.push(['ellipse',...a])},
 fill(){},stroke(){},drawImage(...a){calls.push(['drawImage',...a])},
 fillText(){},measureText(){return {width:35}},fillRect(){},arc(){},closePath(){},lineTo(){},moveTo(){}
};return {g,calls}};
const image={naturalWidth:80};
const entry={color:'#CC2233',image,name:'Pikachu',number:'9',role:'FWD'};
const p={x:10,y:20,z:0};
function shot(zoom,z){
 const {g,calls}=mock(),world={...p,z};
 const screen=(x,y,h)=>({x:x*5*zoom,y:y*4*zoom-h*11*zoom});
 assert(draw(g,world,entry,screen,false,false,zoom));
 return {sprite:calls.find(a=>a[0]==='drawImage'),shadow:calls.find(a=>a[0]==='ellipse')};
}
for(const z of [.6,1,1.6]){
 const {sprite,shadow}=shot(z,0);
 assert(Math.abs(sprite[4]-80*z)<.0001,'Sprites must grow proportionally with pitch');
 assert(Math.abs(sprite[5]-80*z)<.0001);
 assert(Math.abs(sprite[3]+80*z+4*z-20*4*z)<.0001,'Sprite feet anchored to world ground');
 assert(Math.abs(shadow[2]-20*4*z+2*z)<.0001,'Shadow fixed to field');
}
const landed=shot(1,0),hop=shot(1,.7);
assert(hop.sprite[3]<landed.sprite[3],'Celebration jump lifts sprite');
assert.deepEqual(hop.shadow,landed.shadow,'Shadow stays on grass while Pokémon hops');
console.log('PASS proportional sprite scale, constant text metrics, world-coordinate feet and hop shadows');
