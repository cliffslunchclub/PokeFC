'use strict';
/**
 * Phase 10C v0.1: deterministic ILLUSTRATIVE five-minute visual sequences.
 * Runs only on official Quick Sim fixture snapshots. Does not simulate goals,
 * player stats, tackles, substitutions, shot probability, or possession totals.
 * All events except official Quick Sim goal timestamps are animation inventions.
 */
const PlayDirector=require('./phase10-play-director.cjs');
const TeamShape=require('./phase10-team-shape.cjs');
const Wall=require('./phase10-wall-physics.cjs');
const Keeper=require('./phase10-goalkeeper-rush.cjs');
const Onside=require('./phase10-onside-movement.cjs');
const OneOnOne=require('./phase10-one-on-one.cjs');
const GoalSequence=require('./phase10-goal-sequence.cjs');
const Kickoff=require('./phase10-kickoff.cjs');
const Saves=require('./phase10-save-sequence.cjs');
const limit=(n,a,b)=>Math.min(b,Math.max(a,n));
const lerp=(a,b,u)=>a+(b-a)*limit(u,0,1);
const ease=u=>{const t=limit(u,0,1);return t*t*(3-2*t)};
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
function origin(side,x,field){return side===0?field.width*x:field.width*(1-x)}
function base(side,index,field){
 const x=v=>origin(side,v,field),y=field.height;
 if(index===0)return {x:x(.045),y:y*.5};
 if(index<5)return {x:x(.24),y:y*(.13+(index-1)*.245)};
 if(index<8)return {x:x(.45),y:y*(.19+(index-5)*.29)};
 return {x:x(.69),y:y*(.17+(index-8)*.31)};
}
// Official Quick Sim full-time totals. This is not an in-progress counter.
// A missed shot is not on target; keeper saves belong to the opposite side.
// Validation is presentation-only and never repairs or mutates result data.
function shotSummary(stats){
 if(!Array.isArray(stats)||stats.length!==2)throw Error('Missing official shot totals');
 for(let side=0;side<2;side++){
  const a=stats[side],other=stats[1-side];
  for(const key of ['shots','shotsOnTarget','goals','saves'])
   if(!Number.isInteger(a?.[key])||a[key]<0)throw Error('Invalid official '+key);
  if(a.shotsOnTarget>a.shots||a.goals>a.shotsOnTarget||
     a.shotsOnTarget-a.goals!==other.saves)
   throw Error('Quick Sim shots, goals and goalkeeper saves do not reconcile');
 }
 return 'FULL-TIME TOTALS (not live) · Shots '+stats[0].shots+'–'+stats[1].shots+
  ' · On target '+stats[0].shotsOnTarget+'–'+stats[1].shotsOnTarget+
  ' · Saves '+stats[0].saves+'–'+stats[1].saves;
}
// Preserve the viewer-selected speed all the way through the goal. The
// goal modal, not a hidden time dilation, handles celebration and replay.
function playbackRate(t,events,speed){
 return limit(Number(speed)||1,1,16)/60;
}

// Deterministic continuous pass-and-receive plan. It is presentation-only:
// these are not PSE possession, tackle, pass, or interception records.
const touchCache=new WeakMap();
function pose(owner,field,seconds){
 const side=Math.floor(owner/11),index=owner%11,p=base(side,index,field);
 const amp=index===0?.6:index<5?1.65:2.6;
 return {x:limit(p.x+Math.sin(seconds*.22+index*1.8+side)*amp,1,field.width-1),
  y:limit(p.y+Math.cos(seconds*.27+index*1.2+side)*amp*.8,1,field.height-1)};
}
function foot(player,owner){
 return {x:player.x+(owner<11?.72:-.72),y:player.y+.32,z:.23};
}
function touchPlan(fixture,field){
 const cached=touchCache.get(fixture);
 if(cached&&cached.width===field.width&&cached.height===field.height)return cached.sequence;
 const total=Math.ceil((fixture.durationMinutes===120?120:90)*60/8)+2;
 const sequence=[{owner:6}],seed=String(fixture.visualSeed||fixture.seed||'pfc');
 for(let k=0;k<total;k++){
  const previous=sequence[k].owner,side=Math.floor(previous/11);
  const switchSides=k%9===8; // illustrative challenge, not official event
  const candidateSide=switchSides?1-side:side;
  const passTime=k*8+8*.82;
  const from=pose(previous,field,passTime);
  const candidates=[];
  for(let j=1;j<11;j++){
   const owner=candidateSide*11+j;
   if(owner===previous)continue;
   const to=pose(owner,field,passTime+1.2);
   const distance=Math.hypot(from.x-to.x,from.y-to.y);
   if(distance>35)continue;
   const forward=side===0?to.x-from.x:from.x-to.x;
   const jitter=hash(seed+':'+k+':'+j)%1000/1000;
   // Forward and diagonal choices are common. A pressured backwards pass
   // remains possible but is not the default nearest-neighbor behavior.
   const backwardPenalty=forward < -2?11:0;
   candidates.push({owner,score:distance*.57-Math.max(0,Math.min(22,forward))*.64+
    backwardPenalty+6*jitter});
  }
  candidates.sort((a,b)=>a.score-b.score||a.owner-b.owner);
  // If no reasonable receiver is nearby, dribble rather than teleport.
  const choice=candidates[hash(seed+':select:'+k)%Math.min(3,candidates.length)];
  sequence.push({owner:choice?.owner??previous});
 }
 touchCache.set(fixture,{width:field.width,height:field.height,sequence});
 return sequence;
}
// Positionally disciplined supporting runs in the attacking third.
// They are illustrative, never extra official PSE possessions or shots.
function roleOf(player,index){
 const role=String(player?.pos||'').toUpperCase();
 if(index===0||role==='GK')return 'keeper';
 if(/^(CB|SW|DEF|LB|RB|LWB|RWB)$/.test(role))return 'defender';
 if(/^(CM|CDM|CAM|LM|RM|MID)$/.test(role))return 'midfielder';
 if(/^(LW|RW|ST|CF|FWD)$/.test(role))return 'forward';
 return index<5?'defender':index<8?'midfielder':'forward';
}
function waveAt(fixture,field,seconds){
 const cycle=Math.floor(seconds/8),u=seconds/8-cycle,plan=touchPlan(fixture,field);
 const value=k=>{
  const owner=plan[Math.max(0,Math.min(k,plan.length-1))].owner,side=Math.floor(owner/11);
  const p=pose(owner,field,k*8+5),progress=(side===0?p.x:field.width-p.x)/field.width;
  return {side,pressure:ease((progress-.585)/.105)};
 };
 const before=value(cycle),after=value(cycle+1),blend=ease((u-.54)/.46);
 return [0,1].map(side=>(before.side===side?before.pressure*(1-blend):0)+
  (after.side===side?after.pressure*blend:0));
}
function supportingPose(fixture,owner,field,seconds,wave=waveAt(fixture,field,seconds)){
 const side=Math.floor(owner/11),index=owner%11;
 const player=(side===0?fixture.home:fixture.away).lineup[index],role=roleOf(player,index);
 const original=pose(owner,field,seconds),pressure=wave[side];
 if(!pressure||role==='keeper'||role==='forward')return original;
 const progress=side===0?original.x/field.width:1-original.x/field.width;
 const seed=String(fixture.visualSeed||fixture.seed||'pfc');
 const oscillation=Math.sin(seconds*.046+side*2.8+index*.83+(hash(seed)%17)*.19);
 const overlap=(oscillation+1)/2;
 let target,amount;
 if(role==='midfielder'){target=.67;amount=.88;}
 else{
  // Fullbacks can overlap; centre backs retain a cover line, with rare
  // supporting surges. Never drag the keeper or everyone into the box.
  const wide=/^(LB|RB|LWB|RWB)$/.test(String(player?.pos||'').toUpperCase())||
   (String(player?.pos||'').toUpperCase()==='DEF'&&(index===1||index===4));
  if(wide){target=.615;amount=.35+.56*overlap;}
  else{target=.51;amount=.26+.64*Math.pow(overlap,8);}
 }
 const advanced=lerp(progress,Math.max(progress,target),pressure*amount);
 return {x:limit(origin(side,advanced,field),1,field.width-1),y:original.y};
}
function rawMotionFrame(fixture,t,field,options=false){
 const ignoreGoal=options===true;
 const kickIndex=options&&typeof options==='object'&&Number.isInteger(options.kickIndex)?options.kickIndex:0;
 if(!fixture||!fixture.home||!fixture.away||!Array.isArray(fixture.events))
  throw Error('Motion requires official fixture');
 const duration=fixture.durationMinutes===120?120:90;
 if(!Number.isFinite(t)||t<0||t>duration)throw Error('Invalid replay minute');
 if(!field||!Number.isFinite(field.width)||!Number.isFinite(field.height))throw Error('Invalid soccer pitch');
 const teams=[fixture.home,fixture.away],actors=[],seconds=t*60;
 const visual=PlayDirector.sample(fixture,field,seconds);
 const plan=visual.plan,shape=TeamShape.status(fixture,field,seconds,visual);
 for(let side=0;side<2;side++)for(let i=0;i<11;i++){
  const id=side*11+i;
  const baseline=TeamShape.position(fixture,field,id,seconds,shape,pose(id,field,seconds));
  const p=PlayDirector.actorAt(plan,id,seconds,baseline);
  actors.push({side,index:i,
   x:p.x,y:p.y,z:0,
   frame:Math.floor(seconds*7+i)%3===0?1:0,orientation:side===0?2:6});
 }
 let ball={x:field.width*.5,y:field.height*.5,z:.22};
 // Separate PSE penalty shootout. Match score stays the official 120-minute
 // score; the panel owns independent penalty conversions.
 if(t>=duration&&fixture.shootout&&Number.isInteger(kickIndex)&&kickIndex>0){
  const kicks=fixture.shootout.attempts,kick=kicks[kickIndex-1];
  if(!kick)throw Error('Invalid shootout kick index');
  const side=kick.side==='home'?0:1,roster=teams[side];
  const takerIndex=roster.lineup.findIndex(p=>String(p.id)===String(kick.kickerId));
  if(takerIndex<0)throw Error('Shootout taker not on starting XI');
  const keeperIndex=teams[1-side].lineup.findIndex(p=>String(p.id)===String(kick.keeperId));
  if(keeperIndex<0)throw Error('Shootout keeper not on starting XI');
  const taker=actors[side*11+takerIndex],keeper=actors[(1-side)*11+keeperIndex];
  const shooting={x:origin(side,.84,field),y:field.height*.5};
  const net={x:origin(side,.985,field),y:field.height*.5};
  // Presentations can animate a stored attempt from ball setup to outcome;
  // regular shootout playback defaults to its already recorded final pose.
  const p=options&&typeof options==='object'&&Number.isFinite(options.kickProgress)?
   limit(options.kickProgress,0,1):1;
  const approach=ease(p/.35),shot=ease((p-.38)/.60);
  const start={x:origin(side,.80,field),y:shooting.y};
  taker.x=lerp(start.x,shooting.x,approach);taker.y=shooting.y;
  taker.frame=p>.33?3:0;
  keeper.x=origin(side,.972,field);keeper.y=field.height*.5;
  const finishY=kick.outcome==='off-target'?field.height*.21:
   kick.outcome==='saved'?field.height*.48:field.height*.5;
  keeper.frame=p>.50?(kick.outcome==='saved'?8:1):0;
  keeper.y=lerp(field.height*.5,kick.outcome==='saved'?field.height*.48:field.height*.58,shot);
  ball={x:lerp(shooting.x,net.x,shot),
   y:lerp(shooting.y,finishY,shot),
   z:.22+shot*(kick.outcome==='off-target'?1.2:.1)+Math.sin(shot*Math.PI)*.55};
  const complete=p>=.99;
  return {actors,ball,
   action:complete?'official-shootout-'+kick.outcome:'illustrative-shot',
   label:'PENALTY '+kickIndex+'/'+kicks.length+' · '+
    (roster.lineup[takerIndex].name||'Pokémon')+
    (complete?' · '+kick.outcome.toUpperCase():' · SHOT IN PROGRESS'),
   officialEvent:complete?kick:null,illustrative:!complete};
 }
 const goals=ignoreGoal?[]:fixture.events.filter(e=>e.type==='goal');
 const event=goals.find(g=>t<=g.minute+.22&&
  seconds>=GoalSequence.forGoal(fixture,field,g,sec=>rawMotionFrame(fixture,sec/60,field,true)).start);
 if(event){
  let sequence=GoalSequence.forGoal(fixture,field,event,sec=>rawMotionFrame(fixture,sec/60,field,true));
  const previous=goals.filter(g=>g!==event&&g.minute<event.minute).at(-1);
  const entryTime=Math.max(sequence.start,previous?(previous.minute+.22)*60:0);
  const director=sec=>rawMotionFrame(fixture,sec/60,field,true);
  let entry=director(entryTime);
  if(previous&&entryTime===(previous.minute+.22)*60)entry=rawMotionFrame(fixture,(entryTime-.000001)/60,field);
  else entry=Kickoff.apply(fixture,field,entryTime,entry,director,sec=>rawMotionFrame(fixture,sec/60,field));
  const changed=entry.kickoff||entry.officialEvent||entryTime>sequence.start;
  if(changed)sequence={...sequence,start:entryTime,active:Math.max(entryTime+.1,sequence.active),openingRun:entry};
  const {side,scorer:scorerId,support,finish,net,wing}=sequence;
  const normal=rawMotionFrame(fixture,t,field,true);
  for(let i=0;i<actors.length;i++)Object.assign(actors[i],normal.actors[i]);
  const pose=GoalSequence.sample(sequence,plan,seconds);
  if(changed&&seconds<sequence.active){
   const u=limit((seconds-sequence.start)/Math.max(.001,sequence.active-sequence.start),0,1);
   pose.ball={x:lerp(entry.ball.x,sequence.from.x,u),y:lerp(entry.ball.y,sequence.from.y,u),z:lerp(entry.ball.z,.23,u)};
   for(let i=0;i<actors.length;i++){
    actors[i].x=lerp(entry.actors[i].x,actors[i].x,u);actors[i].y=lerp(entry.actors[i].y,actors[i].y,u);
   }
   pose.owner=-1;
  }
  ball=pose.ball;
  let ownerIndex=pose.owner;
  const u=limit((seconds-sequence.start)/Math.max(.001,sequence.shotStart-sequence.start),0,1);
  const finisher=actors[scorerId],startScorer=sequence.openingRun.actors[scorerId];
  finisher.x=lerp(startScorer.x,finish.x-(side===0?.55:-.55),u);
  finisher.y=lerp(startScorer.y,finish.y-.3,u);
  if(seconds>=sequence.active){
   const starter=actors[support],startActor=sequence.opening.actors[support];
   const receive=limit((seconds-sequence.active)/Math.max(.001,sequence.passStart-sequence.active),0,1);
   starter.x=lerp(startActor.x,sequence.passFrom.x-(side===0?.6:-.6),receive);
   starter.y=lerp(startActor.y,sequence.passFrom.y-.3,receive);
   const keeper=actors[(1-side)*11];
   Object.assign(keeper,Keeper.sceneAt(field,event,seconds,{
    start:sequence.active,end:sequence.end,shot:sequence.shotStart,side:1-side,
    opening:sequence.opening.actors[(1-side)*11],
    ballAt:sec=>GoalSequence.sample(sequence,plan,sec).ball,
    diveY:field.height*.5-wing*2.2
   }));
   if(seconds>=sequence.shotStart){finisher.frame=3;keeper.frame=8;}
  }
  Onside.apply(actors,field,ball,side,{carrier:ownerIndex,runner:scorerId,
   run:(seconds-sequence.passStart)/Math.max(.001,sequence.shotStart-sequence.passStart),
   strength:ease((seconds-sequence.start)/.2)});
  if(t>=event.minute){ball=net;ownerIndex=-1;}
  const shooting=seconds>=sequence.shotStart;
  return {actors,ball,ownerIndex,contact:pose.phase,attackingSide:side,
   goalSequenceStart:sequence.start,goalShotStart:sequence.shotStart,
   goalPassStart:sequence.passStart,goalBallStart:sequence.active,
   goalkeeperRushSide:seconds>=sequence.active&&!shooting&&Keeper.target(1-side,field,
    {mode:'carry',owner:side*11+6},ball).urgent?1-side:null,
   action:t>=event.minute?'official-goal':shooting?'illustrative-shot':
    pose.phase==='ordinary'?normal.action:'illustrative-goal-buildup',
   label:t>=event.minute?'GOAL! '+teams[side].lineup[scorerId%11].name:'',
   buildup:pose.phase,officialEvent:t>=event.minute?event:null,illustrative:t<event.minute};
 }
 // Variable-length play sequences are visual only. Never alter PSE events.
 ball=visual.ball;
 const step=visual.stage;
 const phase=limit((seconds-step.start)/Math.max(.001,step.duration),0,1);
 if(step.mode==='carry')actors[step.owner].frame=phase>.92?3:0;
 if(step.mode==='pass'){
  if(phase<.19)actors[step.owner].frame=3;
  if(phase>.84)actors[step.receiver].frame=3;
 }
 if(step.mode==='challenge'&&phase>.6)actors[step.receiver].frame=2;
 if(step.mode==='rebound'){
  if(phase>step.wall?.impactU)actors[step.receiver].frame=2; // chase the bank
  if(phase>.88)actors[step.receiver].frame=3; // collect the loose ball
 }
 // Hybrid Counterpress: 0–4 seconds pressure, 4–10 seconds recovery.
 // Away from turnovers the closest defenders still close passing lanes.
 const defensive=TeamShape.press(fixture,field,seconds,visual,shape,actors,ball);
 // Deterministic 5 m/s maximum keeper pursuit, not a PSE save or turnover.
 // A goalkeeper can take the ball only if the director's existing rebound
 // action explicitly assigned that visual pickup to the keeper.
 const keeperPositions=Keeper.at(fixture,field,seconds);
 for(let side=0;side<2;side++){
  actors[side*11].x=keeperPositions[side].x;
  actors[side*11].y=keeperPositions[side].y;
 }
 const attackerSide=Math.floor(visual.stage.owner/11);
 const defenderSide=1-attackerSide;
 const keeperTarget=Keeper.target(defenderSide,field,visual.stage,ball);
 // Keep the outgoing attack's constraint during its existing recovery
 // blend, so a possession change never releases stranded players in a jump.
 let offsideBoundary;
 for(const side of [defenderSide,attackerSide]){
  const boundary=Onside.apply(actors,field,ball,side,{
   carrier:visual.ownerIndex,
   runner:step.mode!=='carry'?step.receiver:-1,
   run:step.mode!=='carry'?(seconds-step.start)/Math.min(.6,step.duration):0,
   strength:shape.attack[side]
  });
  if(side===attackerSide)offsideBoundary=boundary;
 }
 return {actors,ball,action:visual.action,ownerIndex:visual.ownerIndex,
  contact:visual.contact,label:'',officialEvent:null,illustrative:true,
  sequenceType:visual.sequenceType,sequenceIndex:visual.sequenceIndex,
  pressPhase:defensive.phase,pressingSide:defensive.side,
  pressingPlayers:defensive.ids,goalkeeperRushSide:keeperTarget.urgent?defenderSide:null,
  visualTactic:teams[shape.active].tactic||'balanced',
  segmentStart:visual.segmentStart,segmentEnd:visual.segmentEnd,
  passStart:visual.passStart,passArrival:visual.passArrival,
  passOrigin:visual.passOrigin,passTarget:visual.passTarget,
  offsideBoundary,
  wall:visual.wall,wallImpactSeconds:visual.wallImpactSeconds};

}
function presentationFrame(fixture,seconds,field,options=false){
 const normal=sec=>rawMotionFrame(fixture,sec/60,field,true);
 let frame=rawMotionFrame(fixture,seconds/60,field,options);
 frame=Kickoff.apply(fixture,field,seconds,frame,normal,sec=>rawMotionFrame(fixture,sec/60,field));
 return Saves.apply(fixture,field,seconds,frame,sec=>Kickoff.apply(fixture,field,sec,
  rawMotionFrame(fixture,sec/60,field),normal),fixture.events.length,options?.saveEvent||null);
}
function motionFrame(fixture,t,field,options=false){
 if(options===true)return rawMotionFrame(fixture,t,field,true);
 const frame=presentationFrame(fixture,t*60,field,options);
 return OneOnOne.apply(fixture,field,t*60,frame,
  sec=>presentationFrame(fixture,sec,field,options));
}
module.exports={motionFrame,rawMotionFrame,presentationFrame,base,hash,shotSummary,playbackRate};
