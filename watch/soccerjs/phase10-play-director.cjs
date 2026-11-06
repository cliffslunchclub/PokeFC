'use strict';
/**
 * PokéFC Watch Play Sequence Director.
 * Visual choreography only: PSE alone owns scores, saves and match events.
 * All patterns appear in ordinary non-scoring play as well as goal buildups.
 */
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const lerp=(a,b,u)=>a+(b-a)*u;
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
const seed=f=>String(f.visualSeed||f.seed||'pfc');
const sideOf=id=>Math.floor(id/11);
const offset=id=>id<11?.72:-.72;
const point=(field,x,y)=>({x:clamp(x,1,field.width-1),y:clamp(y,1,field.height-1)});
const progress=(side,x,field)=>(side===0?x:field.width-x)/field.width;
function base(id,field){
 const side=sideOf(id),i=id%11,h=field.height;
 const x=v=>side===0?field.width*v:field.width*(1-v);
 if(i===0)return point(field,x(.045),h*.5);
 if(i<5)return point(field,x(.24),h*(.13+(i-1)*.245));
 if(i<8)return point(field,x(.45),h*(.19+(i-5)*.29));
 return point(field,x(.69),h*(.17+(i-8)*.31));
}
function receiver(f,field,owner,aim,pattern,salt){
 const side=sideOf(owner),team=side===0?f.home:f.away;
 const candidates=[];
 for(let i=1;i<11;i++){
  const id=side*11+i;if(id===owner)continue;
  const b=base(id,field),role=String(team.lineup[i]?.pos||'').toUpperCase();
  const defender=i<5||/^(CB|DEF|LB|RB|LWB|RWB)$/.test(role);
  const mid=i>=5&&i<8||/^(CM|MID|CAM|CDM)$/.test(role);
  const wide=[1,4,8,10].includes(i);
  let score=Math.hypot(aim.x-b.x,aim.y-b.y)*.5+
   hash(seed(f)+':receiver:'+salt+':'+i)%1000/100;
  if(pattern==='wing')score+=wide?-14:10;
  if(pattern==='box')score+=mid?-9:defender?0:-3;
  if(pattern==='through')score+=i>=8?-13:defender?7:0;
  if(pattern==='one-two')score+=mid?-6:defender?3:0;
  if(pattern==='overlap')score+=defender?-16:8;
  if(defender&&hash(seed(f)+':back:'+salt)%100<32)score-=14;
  candidates.push({id,score});
 }
 candidates.sort((a,b)=>a.score-b.score||a.id-b.id);
 return candidates[0]?.id??side*11+6;
}
const planCache=new WeakMap();
function makePlan(f,field){
 if(!f?.home?.lineup||!f?.away?.lineup||!Array.isArray(f.events))
  throw Error('Play Director needs a PSE fixture');
 const total=(f.durationMinutes===120?120:90)*60;
 const actions=[],sequences=[],tracks=Array.from({length:22},()=>[]);
 let seconds=0,owner=6,ball=point(field,field.width*.45,field.height*.5),count=0;
 const dice=(key,n)=>hash(seed(f)+':'+count+':'+key)%n;
 function mark(id,t,p){
  const arr=tracks[id],spot=point(field,p.x-offset(id),p.y-.32);
  const last=arr.at(-1);
  if(last&&Math.abs(last.t-t)<.000001){last.p=spot;return}
  arr.push({t,p:spot});
 }
 function destination(forward,dy,duration){
  const side=sideOf(owner),percent=progress(side,ball.x,field);
  const run=forward*duration/6;
  const delta=percent>.87&&run>0?-Math.min(5,run*.6):run;
  return point(field,ball.x+(side===0?delta:-delta),ball.y+dy);
 }
 function append(mode,duration,end,recipient,pattern,arc=0){
  if(seconds>=total)return;
  const length=Math.min(duration,total-seconds);
  if(length<.00001)return;
  const start=seconds,from={...ball},to=point(field,end.x,end.y),next=recipient??owner;
  const action={start,end:start+length,mode,from,to,owner,receiver:next,
   pattern,arc,sequence:count,duration:length};
  actions.push(action);
  mark(owner,start,from);
  mark(mode==='carry'?owner:next,action.end,to);
  seconds=action.end;ball=to;owner=next;
 }
 const carry=(time,forward,dy,kind)=>append('carry',time,destination(forward,dy,time),owner,kind);
 function pass(time,target,kind,arc=0,prefer=kind){
  const id=receiver(f,field,owner,target,prefer,count+':'+actions.length);
  append('pass',time,target,id,kind,arc);
 }
 function choose(){
  const roll=dice('pattern',100);
  return roll<26?'dribble':roll<50?'one-two':roll<71?'cross':roll<88?'through':'switch';
 }
 function sequence(kind){
  const started=seconds,initial=owner,side=sideOf(owner);
  const sign=dice('side',2)?1:-1;
  const lane=sign*(3+dice('lane',60)/10);
  if(kind==='dribble'){
   carry(5+dice('carry-time',100)/10,8+dice('carry-move',80)/10,lane*.42,kind);
  }else if(kind==='one-two'){
   pass(1.3+dice('one-first',12)/10,destination(11,lane*.55,3),kind,.45,'one-two');
   carry(1.2+dice('one-touch',13)/10,2,sign*.8,kind);
   append('pass',1.4+dice('one-return',12)/10,destination(12,lane*.3,3),
    initial,kind,.45);
   carry(1.5+dice('one-run',22)/10,7,sign,kind);
  }else if(kind==='cross'){
   const wingY=sign>0?field.height-7:7;
   pass(2+dice('cross-open',14)/10,
    point(field,ball.x+(side===0?10:-10),lerp(ball.y,wingY,.58)),
    kind,.7,'wing');
   carry(2+dice('cross-run',30)/10,7,(wingY-ball.y)*.38,kind);
   pass(2.1+dice('cross-flight',20)/10,
    point(field,ball.x+(side===0?11:-11),field.height*.5+sign*(dice('target',7)-3)),
    kind,3,'box');
   carry(1+dice('cross-control',20)/10,3,-sign*1.2,kind);
  }else if(kind==='through'){
   carry(1.8+dice('through-carry',24)/10,6,lane*.2,kind);
   pass(2.5+dice('through-flight',16)/10,
    destination(18+dice('through-long',80)/10,sign*3,5),
    kind,2.6,'through');
   carry(1.6+dice('through-finish',25)/10,7,sign*1.5,kind);
  }else{
   carry(3+dice('switch-start',30)/10,5,sign*2,kind);
   const farSide=sign>0?field.height*.2:field.height*.8;
   pass(3+dice('switch-pass',22)/10,
    point(field,ball.x+(side===0?7:-7),lerp(ball.y,farSide,.8)),kind,1.1,'switch');
   carry(4+dice('switch-carry',60)/10,7,-sign*2,kind);
   if(dice('long-attack',3)===0)carry(5+dice('extra',70)/10,7,sign,kind);
  }
  // The standing challenge is illustrative, not a PSE tackle or foul.
  const turnover=count%6===5||(count>0&&dice('turnover',100)<6);
  if(turnover&&seconds<total){
   const other=1-sideOf(owner),target=destination(1.5,sign*.5,2);
   const ids=Array.from({length:10},(_,i)=>other*11+i+1);
   ids.sort((a,b)=>{
    const pa=base(a,field),pb=base(b,field);
    return Math.hypot(pa.x-target.x,pa.y-target.y)-
     Math.hypot(pb.x-target.x,pb.y-target.y)||a-b;
   });
   append('challenge',1.5+dice('contest',19)/10,target,ids[0],kind);
  }
  sequences.push({index:count,start:started,end:seconds,kind,firstOwner:initial});
 }
 while(seconds<total-.01&&count<1600){sequence(choose());count++}
 for(const t of tracks)t.sort((a,b)=>a.t-b.t);
 return {actions,sequences,tracks,duration:total,field:{width:field.width,height:field.height}};
}
function planFor(f,field){
 const previous=planCache.get(f);
 if(previous&&previous.field.width===field.width&&previous.field.height===field.height)
  return previous;
 const next=makePlan(f,field);planCache.set(f,next);return next;
}
module.exports={planFor,base,hash,smooth};
