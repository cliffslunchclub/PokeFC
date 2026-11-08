'use strict';
const Clip=require('./clip-export.cjs');
class BrowserClipRecorder{
 constructor({canvas,clip,speed=1,RecorderClass,clock,paint,onProgress,onComplete,onCancel,onError}){
  this.canvas=canvas;this.clip=clip;this.speed=speed;
  this.RecorderClass=RecorderClass;this.clock=clock||(()=>performance.now());
  this.paint=paint;this.onProgress=onProgress||(()=>{});
  this.onComplete=onComplete||(()=>{});this.onCancel=onCancel||(()=>{});
  this.onError=onError||(()=>{});
  this.status='idle';this.cancelled=false;this.chunks=[];this.media=null;this.stream=null;
 }
 start(){
  if(this.status!=='idle')throw Error('Clip export already started');
  if(!this.canvas?.captureStream||!this.RecorderClass)throw Error('Browser video recording is not supported');
  const supported=Clip.MIMES.filter(m=>this.RecorderClass.isTypeSupported?.(m.mime));
  this.supportedFormats=supported;
  if(!supported.length)throw Error('No supported MP4 or WebM MediaRecorder format');
  this.stream=this.canvas.captureStream(Clip.FPS);
  this.track=this.stream.getVideoTracks?.()[0]||this.stream.getTracks()[0];
  let failure;
  for(const format of supported){
   try{this.media=new this.RecorderClass(this.stream,{mimeType:format.mime,videoBitsPerSecond:2500000});
    this.format=format;break}catch(e){failure=e}
  }
  if(!this.media){
   this.stream.getTracks().forEach(t=>t.stop());
   throw Error('Unable to initialize MP4/WebM recorder: '+String(failure));
  }
  this.assignHandlers();
  this.paint(this.clip.start*60,0);
  try{this.track?.requestFrame?.()}catch(_){}
  try{this.media.start(1000)}catch(e){this.stream.getTracks().forEach(t=>t.stop());this.fail(e);throw e}
  this.started=this.clock();this.status='recording';this.onProgress(0);
  return {mimeType:this.media.mimeType||this.format.mime,extension:this.format.extension};
 }
 assignHandlers(){
  this.media.ondataavailable=e=>{if(e.data?.size>0)this.chunks.push(e.data)};
  this.media.onerror=e=>this.fail(e.error||e);
  this.media.onstop=()=>this.stopped();
 }
 stopped(){
  this.stream?.getTracks().forEach(t=>t.stop());
  if(this.status==='failed')return;
  if(this.cancelled){this.status='cancelled';this.chunks=[];this.onCancel();return}
  const blob=new Blob(this.chunks,{type:this.media.mimeType||this.format.mime});
  this.chunks=[];
  if(!blob.size){
   // Some browsers advertise MP4 but cannot encode the canvas track;
   // transparently record the same clip again as supported WebM.
   if(this.format.extension==='mp4'&&this.retryWebm())return;
   this.fail(Error('Browser recorder produced an empty video ('+this.format.mime+')'));return;
  }
  this.status='complete';this.onProgress(1);this.onComplete(blob,this.format);
 }
 retryWebm(){
  const alt=this.supportedFormats.find(f=>f.extension==='webm');
  if(!alt)return false;
  const stream=this.canvas.captureStream(Clip.FPS);
  let media;
  try{media=new this.RecorderClass(stream,{mimeType:alt.mime,videoBitsPerSecond:2500000})}
  catch(_){stream.getTracks().forEach(t=>t.stop());return false}
  this.stream=stream;this.track=stream.getVideoTracks?.()[0]||stream.getTracks()[0];
  this.media=media;this.format=alt;this.assignHandlers();
  this.paint(this.clip.start*60,0);
  try{this.media.start(1000);this.track?.requestFrame?.()}catch(error){this.fail(error);return true}
  this.started=this.clock();this.status='recording';this.onProgress(0);return true;
 }
 tick(now=this.clock()){
  if(this.status!=='recording')return false;
  const elapsed=Math.max(0,(now-this.started)/1000);
  const progress=Clip.progressAt(elapsed,this.clip,this.speed);
  this.paint((this.clip.start+(this.clip.end-this.clip.start)*progress)*60,progress);
  // Some encoders need an explicit capture request even with a fixed FPS.
  try{this.track?.requestFrame?.()}catch(_){}
  this.onProgress(progress);
  if(progress>=1){
   this.status='finishing';
   if(this.media.state!=='inactive')this.media.stop();
  }
  return true;
 }
 cancel(){
  if(!['recording','finishing'].includes(this.status))return false;
  this.cancelled=true;
  if(this.media?.state!=='inactive')this.media.stop();
  else{this.status='cancelled';this.stream?.getTracks().forEach(t=>t.stop());this.onCancel()}
  return true;
 }
 fail(error){
  if(this.status==='failed')return;
  this.status='failed';this.stream?.getTracks().forEach(t=>t.stop());this.onError(error);
 }
}
module.exports={BrowserClipRecorder};
