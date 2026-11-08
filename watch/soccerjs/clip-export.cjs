'use strict';
// No backend, uploads or hosted storage: export is entirely browser-local.
// Match events/results come exclusively from the sanitized PSE fixture.
const VERSION='pokefc-watch-clip/v1',FPS=30;
const MIMES=[
 {mime:'video/mp4;codecs=avc1.42E01E',extension:'mp4'},
 {mime:'video/mp4',extension:'mp4'},
 {mime:'video/webm;codecs=vp9',extension:'webm'},
 {mime:'video/webm;codecs=vp8',extension:'webm'},
 {mime:'video/webm',extension:'webm'}
];
const clipNumber=n=>Math.round(Number(n)*1e6)/1e6;
function supportedFormat(MediaRecorderCtor){
 if(!MediaRecorderCtor||typeof MediaRecorderCtor.isTypeSupported!=='function')return null;
 return MIMES.find(p=>MediaRecorderCtor.isTypeSupported(p.mime))||null;
}
function fnv(s){
 let n=2166136261;
 for(let i=0;i<s.length;i++){n^=s.charCodeAt(i);n=Math.imul(n,16777619)}
 return (n>>>0).toString(16).padStart(8,'0');
}
function refId(fixture,entry,build){
 return 'PFC-'+fnv(JSON.stringify([VERSION,build||'unknown',
  fixture.visualSeed||'',fixture.matchSeed||'',
  entry.id,entry.kind,entry.minute,entry.event?.player,entry.event?.team])).toUpperCase();
}
function filename(referenceId,entry,extension){
 const kind=entry.kind==='goal'?'goal':entry.kind==='save'?'save':'highlight';
 const minute=String(Math.floor(entry.minute)).padStart(3,'0');
 return 'pokefc-'+kind+'-'+minute+'-'+referenceId+'.'+extension;
}
function getPlayerDetails(team){
 return (team?.lineup||[]).map(p=>({
  id:p.id,name:p.name,speciesId:p.speciesId??null,
  position:p.exactPosition||p.pos||null,heldItem:p.heldItem??null,
  itemAdjustedAttributes:p.pokemonStats??null,positionEfficiency:p.positionEfficiency??null,
  positionFit:p.positionFit??null
 }));
}
function diagnostic(fixture,entry,clip,settings={}){
 if(!fixture||!entry||!clip||!['goal','save'].includes(entry.kind))throw Error('Official goal/save required');
 const buildId=String(settings.buildId||'unknown-build');
 const referenceId=refId(fixture,entry,buildId);
 const json=JSON.parse(JSON.stringify(fixture)); // no extra application/user data
 const speed=Number(settings.speed)||1;
 const start=clipNumber(clip.start),end=clipNumber(clip.end);
 return {
  schema:VERSION,referenceId,
  app:{name:'PokéFC',buildId,version:VERSION},
  engines:{results:'PSE (authoritative)',visual:'Soccer-JS 2.5D (illustrative)',
   pseVersion:fixture.pseVersion||fixture.statsModel||'not supplied'},
  seeds:{match:fixture.matchSeed??null,visual:fixture.visualSeed??null},
  fixture:json,
  official:{events:json.events,stats:json.stats,box:json.box||null,score:json.score},
  teams:{home:json.home?.name,away:json.away?.name},
  lineups:{home:getPlayerDetails(json.home),away:getPlayerDetails(json.away)},
  tactics:{home:json.home?.tactic??null,away:json.away?.tactic??null,
   homeFormation:json.home?.formation??null,awayFormation:json.away?.formation??null},
  attributes:{source:'effective Pokémon stats as supplied to PSE, when present',
   home:getPlayerDetails(json.home).map(p=>({id:p.id,heldItem:p.heldItem,stats:p.itemAdjustedAttributes})),
   away:getPlayerDetails(json.away).map(p=>({id:p.id,heldItem:p.heldItem,stats:p.itemAdjustedAttributes}))},
  highlight:{id:entry.id,kind:entry.kind,event:json.events.find(e=>e===entry.event)||
   {...entry.event},minute:entry.minute,startMinute:start,endMinute:end,
   startSeconds:clipNumber(start*60),endSeconds:clipNumber(end*60),
   completeBuildup:true,clearanceStartSeconds:clip.clearanceStartSeconds??null,
   schedulingConflict:clip.schedulingConflict??null},
  recording:{camera:settings.camera||'follow',projection:settings.projection||'orthographic',
   zoomFactor:settings.zoomFactor??1,replaySpeed:speed,
   playback:'wall-clock paced capture',frameRate:FPS,
   format:settings.format||null,mimeType:settings.mimeType||null,
   width:settings.width||null,height:settings.height||null},
  note:'Watch poses are illustrative. Only fixture.official events/results are PSE-authoritative.'
 };
}
function durationSeconds(clip,speed){
 const duration=Number(clip?.durationSeconds),rate=Number(speed);
 if(!(duration>0)||!(rate>0))throw Error('Invalid highlight duration or playback speed');
 return duration/rate;
}
function progressAt(seconds,clip,speed){
 return Math.max(0,Math.min(1,(Number(seconds)||0)/durationSeconds(clip,speed)));
}
module.exports={VERSION,FPS,MIMES,supportedFormat,refId,filename,diagnostic,durationSeconds,progressAt};
