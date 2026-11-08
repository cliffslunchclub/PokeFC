'use strict';
// Three REAL seconds of scorer celebration, independent of match minutes.
// Pure deterministic Watch choreography; PSE goals, results and kickoff time
// remain authoritative. Reused by replay, seeks and reduced-motion tests.
const DURATION=3;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const ease=v=>{v=clamp(v,0,1);return v*v*(3-2*v)};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const go=(a,b,u)=>a+(b-a)*u;
function create(fixture,field,event,frame){
 if(!event||event.type!=='goal')throw Error('Official PSE goal required for celebration');
 const side=String(event.team)===String(fixture.home.id)?0:
  String(event.team)===String(fixture.away.id)?1:-1;
 if(side<0)throw Error('Goal team not in fixture');
 const team=side?fixture.away:fixture.home;
 const index=team.lineup.findIndex(p=>String(p.id)===String(event.player));
 if(index<0)throw Error('Scorer missing from authoritative lineup');
 const scorer=side*11+index,start=frame.actors[scorer];
 const target={...start,x:clamp(start.x,2.6,field.width-2.6),
  y:clamp(start.y,2.8,field.height-2.8),z:0};
 const friends=frame.actors.map((p,id)=>({id,p,d:dist(p,start)}))
  .filter(a=>a.id!==scorer&&a.id%11!==0&&Math.floor(a.id/11)===side)
  .sort((a,b)=>a.d-b.d||a.id-b.id).slice(0,3)
  .map((a,i)=>{
   const offset=[[-2,-1.5],[-1,2],[2.3,.5]][i];
   return {id:a.id,from:a.p,to:{...a.p,x:clamp(target.x+offset[0],2,field.width-2),
    y:clamp(target.y+offset[1],2,field.height-2)}};
  });
 return {event,side,scorer,scorerName:String(team.lineup[index].name||event.player),
  field,start,target,friends,base:frame,duration:DURATION};
}
function move(from,to,elapsed,maxSpeed=3.5){
 const length=dist(from,to),duration=Math.max(.75,1.5*length/maxSpeed);
 const u=ease(elapsed/duration);
 return {...from,x:go(from.x,to.x,u),y:go(from.y,to.y,u),z:0};
}
function hop(elapsed){
 for(const start of [.45,1.2,1.96]){
  if(elapsed>=start&&elapsed<=start+.42)
   return .68*Math.sin(Math.PI*(elapsed-start)/.42);
 }
 return 0;
}
function sample(scene,elapsed,{reducedMotion=false}={}){
 const t=clamp(elapsed,0,DURATION),u=ease(t/DURATION);
 const actors=scene.base.actors.map(p=>({...p}));
 const scorer=move(scene.start,scene.target,t,3.5);
 actors[scene.scorer]={...scorer,z:reducedMotion?0:hop(t),
  frame:reducedMotion?0:(hop(t)>.05?1:0)};
 if(!reducedMotion)for(const a of scene.friends){
  actors[a.id]=move(a.from,a.to,t,3.5);
  actors[a.id].frame=0;
 }
 const center=actors[scene.scorer],angleDegrees=reducedMotion?0:38*(u-.5);
 return {...scene.base,actors,ball:{...scene.base.ball},
  ownerIndex:-1,officialEvent:scene.event,action:'official-goal-celebration',
  label:'GOAL! '+scene.scorerName,
  celebration:{elapsed:t,duration:DURATION,side:scene.side,scorer:scene.scorer,
   scorerName:scene.scorerName,focus:{x:center.x,y:center.y},
   angleDegrees,zoom:reducedMotion?1:1+.24*ease(t/.85),
   reducedMotion:!!reducedMotion,friendIds:scene.friends.map(x=>x.id)}};
}
module.exports={DURATION,create,sample,move,hop};
