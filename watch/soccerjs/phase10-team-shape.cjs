'use strict';
/**
 * Watch-only team shape and Hybrid Counterpress.
 * No generated PSE tackle, foul, turnover, goal or match statistic.
 * Deterministic from the same official fixture + illustrative director stages.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=v=>{v=clamp(v,0,1);return v*v*(3-2*v)};
const lerp=(a,b,t)=>a+(b-a)*t;
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
const PROFILES=Object.freeze({
 balanced:  {push:1,press:1,overlap:1,dribble:1,oneTwo:1,cross:1,through:1,switch:1},
 attacking: {push:1.12,press:1.08,overlap:1.25,dribble:1.07,oneTwo:1.1,cross:1.2,through:1.12,switch:.86},
 defensive: {push:.78,press:.78,overlap:.70,dribble:.94,oneTwo:.88,cross:.80,through:1.07,switch:1.12},
 press:     {push:1.07,press:1.38,overlap:1.10,dribble:1.12,oneTwo:1.15,cross:1.00,through:1.12,switch:.88},
 counter:   {push:.92,press:.92,overlap:1.05,dribble:1.32,oneTwo:.84,cross:.92,through:1.45,switch:.76},
 possession:{push:.97,press:1.02,overlap:1.0,dribble:.92,oneTwo:1.45,cross:.92,through:.79,switch:1.36},
 direct:    {push:1.06,press:1.0,overlap:1.07,dribble:1.14,oneTwo:.82,cross:1.06,through:1.47,switch:.79},
 wing:      {push:1.06,press:1.0,overlap:1.35,dribble:.96,oneTwo:.96,cross:1.55,through:.89,switch:1.08}
});
function styleFor(name){
 const key=String(name||'balanced').toLowerCase().replace(/[\s_-]/g,'');
 return PROFILES[key]||PROFILES.balanced;
}
const sideOf=id=>Math.floor(id/11);
const seedOf=f=>String(f.visualSeed||f.seed||'pfc');
function lastTurnover(plan,t){
 const turns=plan.turnovers||[];
 let low=0,high=turns.length;
 while(low<high){const mid=(low+high)>>1;
  if(turns[mid].time<=t)low=mid+1;else high=mid;}
 return turns[low-1]||null;
}
function status(f,field,seconds,visual){
 const active=visual.stage.mode==='challenge'&&
  seconds>=visual.stage.end-.000001?
  sideOf(visual.stage.receiver):sideOf(visual.stage.owner);
 const latest=lastTurnover(visual.plan,seconds);
 const age=latest?seconds-latest.time:Infinity;
 let attack=[active===0?1:0,active===1?1:0];
 let phase='settled';
 if(latest&&age<=10){
  attack[latest.newSide]=ease(age/3);
  attack[latest.oldSide]=age<=4?1:1-ease((age-4)/6);
  phase=age<4?'counterpress':age<10?'recover':'settled';
 }
 return {ball:visual.ball,active,attack,turnover:latest,age,phase,
  pattern:visual.sequenceType,
  profiles:[styleFor(f.home.tactic),styleFor(f.away.tactic)]};
}
function roleOf(player,index){
 const role=String(player?.pos||'').toUpperCase();
 if(index===0||role==='GK')return 'GK';
 if(/^(CB|SW|DEF|LB|RB|LWB|RWB)$/.test(role))return 'DEF';
 if(/^(CM|CDM|CAM|LM|RM|MID)$/.test(role))return 'MID';
 if(/^(LW|RW|ST|CF|FWD)$/.test(role))return 'FWD';
 return index<5?'DEF':index<8?'MID':'FWD';
}
function position(f,field,id,seconds,shape,baseline){
 const side=sideOf(id),i=id%11,role=roleOf((side===0?f.home:f.away).lineup[i],i);
 if(role==='GK')return baseline;
 const p0=side===0?baseline.x/field.width:1-baseline.x/field.width;
 const ballProgress=side===0?shape.ball.x/field.width:1-shape.ball.x/field.width;
 const wave=ease((ballProgress-.16)/.66);
 const strength=shape.attack[side]*shape.profiles[side].push;
 const factors=role==='DEF'?.28:role==='MID'?.32:.17;
 let progress=p0+factors*wave*strength;
 const salt=hash(seedOf(f)+':'+side)%190/100;
 if(role==='DEF'){
  const label=String((side===0?f.home:f.away).lineup[i]?.pos||'').toUpperCase();
  const fullback=/^(LB|RB|LWB|RWB)$/.test(label)||i===1||i===4;
  if(fullback){
   // Frequent overlaps on both flanks, staggered in time.
   const rolling=(Math.sin(seconds*.057+salt+i*1.22)+1)*.5;
   progress+=.13*wave*strength*shape.profiles[side].overlap*ease((rolling-.19)/.62);
  }else{
   // Centre backs alternate forward surges while their partner covers.
   // Sine crosses zero with no sudden reassignment or position snaps.
   const surge=Math.sin(seconds*.043+salt);
   const active=i===2?Math.max(0,surge):i===3?Math.max(0,-surge):0;
   progress+=.18*wave*strength*shape.profiles[side].overlap*ease((active-.18)/.75);
   if(active<.01)progress=Math.min(progress,.465);
  }
 }
 // Defensive side also moves toward the ball; no static anchored backline.
 const closing=(1-shape.attack[side])*ease((.7-ballProgress)/.58);
 if(role==='DEF')progress-=closing*.025;
 if(role==='MID')progress-=closing*.035;
 progress=clamp(progress,.06,.955);
 const lanePull=(shape.ball.y-field.height*.5)*.10*
  (role==='MID'?.75:role==='FWD'?.55:.35);
 const y=clamp(baseline.y+lanePull,1,field.height-1);
 return {x:clamp(side===0?progress*field.width:(1-progress)*field.width,
  1,field.width-1),y};
}
function press(f,field,seconds,visual,shape,actors,ball){
 const stage=visual.stage,phase=(seconds-stage.start)/Math.max(.001,stage.duration);
 let side,intensity,anchor;
 if(shape.turnover&&shape.age>=0&&shape.age<10){
  side=shape.turnover.oldSide;
  intensity=ease(shape.age/1.25)*(1-ease((shape.age-4)/6));
  anchor=shape.turnover.ball;
 }else{
  side=1-shape.active;
  // Ordinary defending closes space without a sudden pressure reset.
  intensity=.48*ease(phase/.30)*(1-ease((phase-.62)/.36));
  anchor=stage.from;
 }
 intensity*=shape.profiles[side].press;
 if(intensity<=.001)return {side,phase:shape.phase,intensity:0,ids:[]};
 // Stable pressers for a given passage or turnover; do not switch
 // chasers merely because two moving Pokémon become equidistant.
 const ids=Array.from({length:10},(_,i)=>side*11+i+1);
 ids.sort((a,b)=>{
  const x=actors[a],y=actors[b];
  // Fixed formation slots, not the current animated positions, choose roles.
  const ax=side===0?field.width*(a%11<5?.24:a%11<8?.45:.69):
    field.width*(1-(a%11<5?.24:a%11<8?.45:.69));
  const bx=side===0?field.width*(b%11<5?.24:b%11<8?.45:.69):
    field.width*(1-(b%11<5?.24:b%11<8?.45:.69));
  const ay=field.height*((a%11===1||a%11===5||a%11===8)?.18:
    (a%11===4||a%11===7||a%11===10)?.82:.5);
  const by=field.height*((b%11===1||b%11===5||b%11===8)?.18:
    (b%11===4||b%11===7||b%11===10)?.82:.5);
  return Math.hypot(ax-anchor.x,ay-anchor.y)-Math.hypot(bx-anchor.x,by-anchor.y)||a-b;
 });
 for(const [k,id] of ids.slice(0,3).entries()){
  const actor=actors[id];
  const target=k<2?ball:{
   x:clamp(ball.x+(side===0?-3.5:3.5),1,field.width-1),
   y:clamp(ball.y+(k===2?3:-3),1,field.height-1)
  };
  const distance=Math.max(.01,Math.hypot(actor.x-target.x,actor.y-target.y));
  const maxMove=k<2?8.5:5.2;
  const move=clamp(distance-(k<2?1.8:3),0,maxMove)*Math.min(1,intensity);
  actor.x=clamp(actor.x+(target.x-actor.x)/distance*move,1,field.width-1);
  actor.y=clamp(actor.y+(target.y-actor.y)/distance*move,1,field.height-1);
 }
 return {side,phase:shape.phase,intensity,ids:ids.slice(0,3)};
}
module.exports={styleFor,status,roleOf,position,press,lastTurnover};
