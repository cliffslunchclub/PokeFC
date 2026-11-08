'use strict';
const assert=require('node:assert/strict');
const {oneImage,sources}=require('./pokemon-load.cjs');
(async()=>{
 const log=[];
 const fake=()=>({
  naturalWidth:96,
  set crossOrigin(v){log.push('cors:'+v);this.cors=v},
  set src(v){assert.equal(this.cors,'anonymous','Image.crossOrigin must be assigned before src');
   assert(v.startsWith('https://raw.githubusercontent.com/PokeAPI/sprites/'));
   log.push('src');this.onload()}
 });
 const image=await oneImage(25,fake);
 assert(image);assert.deepEqual(log,['cors:anonymous','src']);
 assert.equal(sources(0).length,0);
 console.log('PASS PokeAPI image sprite CORS mode required for clean browser recording');
})().catch(e=>{console.error(e);process.exitCode=1});
