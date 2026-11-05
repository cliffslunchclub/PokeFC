/* PokeFC <-> genuine TacticMesh engine bridge (source not modified).
   Adapt 11 Pokémon players to official TacticMesh match inputs. */
(()=>{'use strict';
const ATTRS='acceleration sprintSpeed agility turning balance strength stamina jumping reach recoverySpeed firstTouch shortPassing longPassing throughBalls crossing shooting finishing heading dribbling ballCarrying tackling interception weakFoot awareness vision anticipation decisionMaking composure positioning teamwork creativity concentration discipline aggression workRate offBallIntelligence handling reflexes catching parrying diving oneOnOne aerialCommand sweeping throwing kicking'.split(' ');
const TRAITS='riskAppetite directness patience selfishness roaming pressingEnthusiasm receiveToFeet attackSpace earlyCrossing dribbleTendency longShotTendency conservativePassing switchPlay weakFootUse'.split(' ');
const clip=(v,low=1,high=99)=>Math.round(Math.max(low,Math.min(high,Number(v)||50)));
function hash(str){let h=2166136261;for(const c of String(str))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
function playerAttrs(p){const a=p.detail||{},m=p.main||{};const canon={
 acceleration:m.sprintSpeed, sprintSpeed:m.sprintSpeed, agility:(m.sprintSpeed+m.firstTouch)/2, turning:m.firstTouch,
 balance:(a.strength||m.tackling)+(m.firstTouch-(a.strength||m.tackling))*.45,
 strength:a.strength||m.tackling, stamina:(m.sprintSpeed+m.tackling)/2,
 jumping:(a.strength||m.tackling),reach:(m.tackling+m.sprintSpeed)/2,recoverySpeed:m.sprintSpeed,
 firstTouch:m.firstTouch,shortPassing:m.shortPassing,longPassing:m.shortPassing,throughBalls:(m.shortPassing+m.vision)/2,
 crossing:(m.shortPassing+m.firstTouch)/2,shooting:m.finishing,finishing:m.finishing,heading:(m.tackling+m.finishing)/2,
 dribbling:(m.firstTouch+m.sprintSpeed)/2,ballCarrying:m.firstTouch,tackling:m.tackling,
 interception:(m.tackling+m.vision)/2,weakFoot:(m.firstTouch+m.finishing)/2,
 awareness:m.vision,vision:m.vision,anticipation:(m.vision+m.tackling)/2,decisionMaking:m.vision,
 composure:(m.vision+m.firstTouch)/2,positioning:(m.tackling+m.vision)/2,teamwork:(m.shortPassing+m.vision)/2,
 creativity:m.vision,concentration:m.vision,discipline:(m.vision+m.tackling)/2,aggression:(m.finishing+m.tackling)/2,
 workRate:(m.sprintSpeed+m.tackling)/2,offBallIntelligence:(m.vision+m.finishing)/2,
 handling:(m.tackling+m.firstTouch)/2,reflexes:(m.sprintSpeed+m.tackling)/2,
 catching:(m.firstTouch+m.tackling)/2,parrying:(m.tackling+m.sprintSpeed)/2,
 diving:(m.sprintSpeed+m.tackling)/2,oneOnOne:(m.tackling+m.vision)/2,
 aerialCommand:(m.tackling+m.vision)/2,sweeping:(m.sprintSpeed+m.vision)/2,
 throwing:(m.shortPassing+m.tackling)/2,kicking:m.shortPassing
 };
 // The existing individual detail rolls (±10) have precedence where present.
 return Object.fromEntries(ATTRS.map(k=>[k,clip(Number.isFinite(Number(a[k]))?a[k]:canon[k])]));
}
function playerTraits(p){const t=p.traits||{};return Object.fromEntries(TRAITS.map(k=>[k,Math.max(0,Math.min(1,(Number.isFinite(Number(t[k]))?Number(t[k]):50)/100))]));}
const PRESETS={
 balanced:{},
 possession:{tempo:.46,passingDirectness:.32,buildupRisk:.42,counterattack:.38,pressingIntensity:.50,defensiveLine:.60,goalkeeperDistribution:'short'},
 press:{tempo:.72,pressingIntensity:.80,counterpress:.82,defensiveLine:.72,compactness:.68,passingDirectness:.50},
 counter:{tempo:.65,buildupRisk:.52,passingDirectness:.70,counterattack:.85,defensiveLine:.42,pressingIntensity:.45}
};
function tmTeam(t){return {
 id:String(t.id),name:t.name,abbreviation:String(t.city||t.name).slice(0,4).toUpperCase(),formation:'4-3-3',
 tactics:{width:.62,attackingWidth:.72,defensiveWidth:.56,defensiveLine:.58,pressingIntensity:.52,
 engagementLine:.55,compactness:.62,tempo:.52,buildupRisk:.45,passingDirectness:.42,counterattack:.50,
 counterpress:.50,crossingFrequency:.40,overlapPreference:.48,centralOverload:.50,goalkeeperDistribution:'mixed',
 markingBias:'zonal',timeManagement:.35,...PRESETS[t.tactic||'balanced']},
 colors:{primary:'#c8a65b',secondary:'#12251e'},
 lineup:t.lineup.map(p=>String(p.id)),
 players:t.lineup.map((p,i)=>({
  id:String(p.id),name:p.species,number:i+1,positionFamily:p.pos,
  roles:[p.pos],preferredRole:p.pos,preferredFoot:'right',
  // Equal size for all Pokémon. No Pokédex height/weight buffs or penalties.
  height:1.80,weight:75,
  attributes:playerAttrs(p),traits:playerTraits(p)
 }))
};}
function matchConfig(preview){return {matchId:'fxi-'+hash(preview.seed+':'+preview.fixtureIndex+':'+preview.season),seed:hash(preview.seed+':'+preview.fixtureIndex+':'+preview.season),knockout:false,home:tmTeam(preview.home),away:tmTeam(preview.away)};}
function translate(report,preview){if(!report||!report.complete||report.status!=='completed'||!report.score)throw Error('TacticMesh did not provide a completed match report');
 const idFor=new Map((report.players||[]).map(p=>[String(p.id),String(p.sourceId)]));
 const clubFor=key=>{if(String(key)===String(preview.home.id))return preview.home.id;if(String(key)===String(preview.away.id))return preview.away.id;throw Error('Unrecognized team in TacticMesh event: '+key)};
 const score=[Number(report.score.home),Number(report.score.away)];
 const box={};for(const p of report.players||[]){const pid=String(p.sourceId||'');if(!pid||Number(p.minutes)<=0)continue;const s=p.stats||{};box[pid]={goals:Number(s.goals)||0,assists:Number(s.assists)||0,saves:Number(s.shotStops)||0,
   shots:Number(s.shots)||0,tackleAttempts:Math.max(Number(s.tackleAttempts)||0,Number(s.tackles)||0),tackles:Number(s.tackles)||0,minutes:Math.max(0,Number(p.minutes)||0),
   rating:p.rating?.value??null};}
 const teamStats=[preview.home,preview.away].map((t,i)=>{const actual=(report.teams||[]).find(x=>String(x.id)===String(t.id))||{stats:{}};const s=actual.stats||{};return {shots:Number(s.shots)||0,
  shotsOnTarget:s.shotsOnTarget==null?null:Number(s.shotsOnTarget),goals:score[i],
  saves:Number(s.shotStops)||0,passes:Number(s.passes)||0,completedPasses:Number(s.completedPasses)||0,
  possession:s.possessionPercent==null?null:Number(s.possessionPercent),tackleAttempts:Math.max(Number(s.tackleAttempts)||0,Number(s.tackles)||0),tackles:Number(s.tackles)||0};});
 const events=(report.events||[]).filter(e=>['goal','card','foul','substitution'].includes(e.type)).map(e=>({
  minute:Math.max(0,Number(e.time||0)/60),minuteLabel:String(e.minute||Math.floor(Number(e.time||0)/60)),
  type:e.type,team:clubFor(e.teamId),
  player:idFor.get(String(e.scorerId||e.playerId||e.offenderId))||null,
  assist:idFor.get(String(e.assistId))||null,
  playerOff:idFor.get(String(e.playerOffId))||null,
  playerOn:idFor.get(String(e.playerOnId))||null,
  card:e.card||null,origin:'tacticmesh'
 }));
 const scored=[0,0];events.filter(e=>e.type==='goal').forEach(e=>{scored[String(e.team)===String(preview.home.id)?0:1]++});
 if(scored[0]!==score[0]||scored[1]!==score[1])throw Error('Goal events do not match authoritative TacticMesh final score');
 return {home:preview.home.id,away:preview.away.id,score,stats:teamStats,events,box,origin:'tacticmesh',
  engineBuild:report.engineBuild,ratingModelVersion:report.ratingModelVersion};
}
function connect(preview,callbacks){const worker=new Worker('./tm-worker.js');let closed=false;
 worker.onmessage=e=>{if(closed)return;const m=e.data||{};
  if(m.type==='ready')callbacks.ready?.(m.snapshot);
  if(m.type==='snapshot')callbacks.snapshot?.(m.snapshot,m.events||[]);
  if(m.type==='performance')callbacks.performance?.(m.metrics);
  if(m.type==='handoff')callbacks.handoff?.(m.partial,m.snapshot);
  if(m.type==='done'){
    try{const result=translate(m.report,preview);callbacks.done?.(result,m.report)}catch(err){callbacks.error?.(err.message)}
  }
  if(m.type==='error')callbacks.error?.(m.message||'Unknown TacticMesh error');
 };
 worker.onerror=e=>{if(!closed)callbacks.error?.(e.message||'The TacticMesh worker failed to start')};
 worker.postMessage({type:'init',config:matchConfig(preview)});
 return {play:(speed=4)=>worker.postMessage({type:'play',speed}),pause:()=>worker.postMessage({type:'pause'}),
  speed:speed=>worker.postMessage({type:'speed',speed}),finish:()=>worker.postMessage({type:'finish'}),
  handoff:()=>worker.postMessage({type:'handoff'}),
  close:()=>{closed=true;worker.terminate()}};
}
async function installed(){try{const response=await fetch('./tacticmesh/vendor/installed.json',{cache:'no-store'});if(!response.ok)return false;const manifest=await response.json();return !!(manifest.files&&manifest.files['core.js']&&manifest.files['engine-facade.js']&&manifest.files['LICENSE'])}catch{return false}}
window.FXI_TM={ATTRS,TRAITS,playerAttrs,playerTraits,matchConfig,translate,connect,installed};
})();
