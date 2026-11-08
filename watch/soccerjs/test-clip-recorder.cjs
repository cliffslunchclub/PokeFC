'use strict';
const assert=require('node:assert/strict');
const {BrowserClipRecorder}=require('./clip-recorder.cjs');
const Clip=require('./clip-export.cjs');
const clip={start:74.6,end:74.9,durationSeconds:18};
let stopped=0,stopTime=0;
class FakeMediaRecorder{
 static isTypeSupported(s){return s==='video/webm;codecs=vp8'}
 constructor(stream,opts){this.stream=stream;this.mimeType=opts.mimeType;this.state='inactive'}
 start(){this.state='recording'}
 stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['webm'])});this.onstop?.()}
}
const canvas={captureStream:(fps)=>{
 assert.equal(fps,30);return {getTracks:()=>[{stop:()=>stopped++}]}
}};
let now=0,frames=[],progress=[],result=null,cancels=0,failures=0;
const params={canvas,clip,RecorderClass:FakeMediaRecorder,clock:()=>now,
 paint:(seconds,p)=>frames.push({seconds,p}),onProgress:p=>progress.push(p),
 onComplete:(blob,format)=>result={blob,format},onCancel:()=>cancels++,onError:()=>failures++};
let recorder=new BrowserClipRecorder({...params,speed:4});
assert.equal(recorder.start().extension,'webm');
now=2000;recorder.tick();
assert.equal(recorder.status,'recording');
assert(Math.abs(frames.at(-1).seconds-(clip.start*60+8))<1e-6);
now=4500;recorder.tick();
assert.equal(recorder.status,'complete');
assert.equal(result.format.extension,'webm');assert(result.blob.size>0);
assert.equal(progress.at(-1),1);
assert.equal(cancels,0);assert.equal(failures,0);
assert.equal(stopped,1);
now=0;result=null;frames=[];recorder=new BrowserClipRecorder({...params,speed:1});
recorder.start();now=1200;recorder.tick();assert(recorder.cancel());
assert.equal(recorder.status,'cancelled');assert.equal(cancels,1);
assert.equal(result,null,'Cancel must never save a file');
assert.equal(stopped,2);
assert(!recorder.cancel(),'Cannot cancel twice');
assert.throws(()=>new BrowserClipRecorder({...params,RecorderClass:null}).start(),/not supported/);
assert.equal(Clip.durationSeconds(clip,4),4.5);
class AdvertisedMp4ButEmpty{
 static isTypeSupported(s){return s==='video/mp4'||s==='video/webm;codecs=vp8'}
 constructor(stream,opts){this.mimeType=opts.mimeType;this.state='inactive'}
 start(){this.state='recording'}
 stop(){this.state='inactive';
  if(this.mimeType.includes('webm'))this.ondataavailable?.({data:new Blob(['real-webm'])});
  this.onstop?.();
 }
}
now=0;result=null;
recorder=new BrowserClipRecorder({...params,speed:4,RecorderClass:AdvertisedMp4ButEmpty});
assert.equal(recorder.start().extension,'mp4');
now=4500;recorder.tick();
assert.equal(recorder.format.extension,'webm','Retry actual playable WebM after empty MP4');
now=9000;recorder.tick();
assert.equal(recorder.status,'complete');assert(result.blob.size>0);
assert.equal(result.format.extension,'webm');
console.log('PASS recorder wall-clock timing, slow device seek catch-up, MP4/WebM fallback, cancellation and repeat');
