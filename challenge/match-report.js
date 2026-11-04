/* PokéFC match-report adapter.
 * Converts actual match engine goal events to a compact, saved Challenge ledger.
 * Does not generate imaginary scorers/minutes for matches missing their event log. */
(function(root){'use strict';
 const num=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
 const safe=v=>v==null?'':String(v);
 const scalar=(n)=>n==null?null:Math.round(n*10)/10;
 const inRange=(n)=>n!=null&&n>=0&&n<=150;
 const validLabel=s=>/^\d{1,3}(?:\+\d{1,2})?$/.test(s);
 function fromResult(result,fixture){
  const teams=[fixture?.home||{},fixture?.away||{}];
  const score=[num(result?.score?.[0])??0,num(result?.score?.[1])??0];
  const members=teams.map(t=>new Map((t.lineup||[]).map(p=>[safe(p.id),safe(p.name)||'Unknown Pokémon'])));
  const all=new Map([...members[0],...members[1]]);
  const events=Array.isArray(result?.events)?result.events:[];
  const goals=events.filter(e=>e?.type==='goal').map(e=>{
   const side=safe(e.team)===safe(teams[0].id)?0:safe(e.team)===safe(teams[1].id)?1:null;
   if(side==null)return null;
   const minute=num(e.minute);
   let label=safe(e.minuteLabel).trim().replace(/'$/,'');
   if(!validLabel(label))label=inRange(minute)?String(Math.max(1,Math.floor(minute)+1)):'?';
   return {
    side,minute:inRange(minute)?scalar(minute):null,minuteLabel:label,
    player:members[side].get(safe(e.player))||'Scorer unavailable',
    assist:e.assist?(all.get(safe(e.assist))||'Assist unavailable'):null,
    origin:safe(e.origin||result?.origin||'quick-sim')
   };
  }).filter(Boolean).sort((a,b)=>(a.minute??999)-(b.minute??999));
  const logged=[0,0];for(const e of goals)logged[e.side]++;
  const complete=logged.every((count,i)=>count===score[i]);
  const fields=['shots','shotsOnTarget','passes','completedPasses','possession','tackles','saves'];
  const stats={};for(const field of fields)stats[field]=[0,1].map(i=>scalar(num(result?.stats?.[i]?.[field])));
  return {
   version:1,score,goals,stats,
   status:complete?'complete':goals.length?'partial':'unavailable',
   note:complete?'':(events.length?'Some scorer or minute details were not supplied by the match engine.':'Scorer and minute details were not recorded for this match.'),
   origin:safe(result?.origin||'quick-sim'),
   handoffMinute:scalar(num(result?.handoff?.minute))
  };
 }
 root.PFC_MATCH_REPORT={fromResult};
})(typeof window!=='undefined'?window:globalThis);
