'use strict';
/**
 * PokeFC Franchise Alpha — independently implemented career systems.
 * OpenFútbol informed the separation of state, schedules and simulation.
 * No source code from that repository is included.
 * Uses only existing local Pokémon and six-attribute rating data.
 */
(() => {
  const SAVE_KEY = 'futbol-xi-franchise-v1';
  const MAX_ROSTER = 18;
  const RIVAL_NAMES = [
    ['Pewter Rovers','PWR'], ['Viridian Forest FC','VFC'],
    ['Cerulean City FC','CER'], ['Vermilion Athletic','VER'],
    ['Celadon United','CEL'], ['Saffron City SC','SAF'],
    ['Indigo Champions','IND']
  ];
  const TACTICS = ['balanced','attack','defend','counter'];
  const TACTIC_MOD = {
    balanced:{shots:0, conceded:0, possession:0},
    attack:{shots:2, conceded:1, possession:4},
    defend:{shots:-2, conceded:-2, possession:-3},
    counter:{shots:1, conceded:0, possession:-5}
  };
  const CLS = x => Math.min(99,Math.max(1,x));
  const rnd=(min,max)=>Math.floor(min+Math.random()*(max-min+1));
  const money=n=>`${Math.round(n).toLocaleString()} ₵`;
  const safe=s=>escapeHTML(String(s));
  const roleFit=(id,slot,career)=>{
    const p=byId(id);if(!p)return 0;
    const growth=career?.playerState?.[id]?.growth||0;
    const energy=career?.playerState?.[id]?.energy??100;
    return Math.max(20,fit(p,slot)+growth-Math.round(Math.max(0,80-energy)*.17));
  };
  const price=(id,career)=>{
    const p=byId(id);if(!p)return 0;
    const best=Math.max(...['GK','CB','LB','CM','CAM','LW','ST'].map(r=>fit(p,r)));
    return Math.round((240+Math.max(0,best-40)**2*1.6 +(career?.playerState?.[id]?.growth||0)*65)/10)*10;
  };
  const wages=(id,career)=>Math.max(4,Math.round(price(id,career)/125));
  const squadSet=team=>new Set(team.roster);
  const owned=c=>new Set(c.teams.flatMap(t=>t.roster));
  const getTeam=(c,idx)=>c.teams[idx];
  const validStartingXI=(ids)=>Array.isArray(ids)&&ids.length===11&&ids.every(x=>Number.isInteger(x)&&!!byId(x))&&new Set(ids).size===11;
  let career;
  try {career=JSON.parse(localStorage.getItem(SAVE_KEY));}catch {career=null;}
  if(!career||career.version!==1||!Array.isArray(career.teams)||career.teams.length!==8||!Array.isArray(career.fixtures)||career.fixtures.length!==14)career=null;

  const save=()=>{try{if(career)localStorage.setItem(SAVE_KEY,JSON.stringify(career));else localStorage.removeItem(SAVE_KEY);}catch(e){console.warn('Franchise save unavailable',e);}};
  function news(text){career.news.unshift({week:career.round,season:career.season,text});career.news=career.news.slice(0,22);}

  /** Berger round-robin scheduler: 8 clubs, 7 rounds mirrored for home/away. */
  function buildFixtures(){
    const ids=Array.from({length:8},(_,i)=>i),first=[];
    for(let r=0;r<7;r++){
      const matches=[];
      for(let i=0;i<4;i++){
        const a=ids[i],b=ids[7-i];
        matches.push((r+i)%2===0?[a,b]:[b,a]);
      }
      first.push(matches);
      ids.splice(1,0,ids.pop());
    }
    return first.concat(first.map(row=>row.map(([a,b])=>[b,a])));
  }
  const findNext=c=>c.fixtures[c.round]?.find(m=>m.includes(0))||null;
  function seededTeam(name,abbr,formation,used,power,careerSeed){
    const slots=FORMATIONS[formation];
    const roster=[];
    const lineup=[];
    const pool=()=>POKEMON.filter(p=>!used.has(p.id));
    for(let i=0;i<11;i++){
      const role=slots[i][0];
      const candidates=pool().sort((a,b)=>fit(b,role)-fit(a,role));
      const start=Math.max(0,Math.floor((1-power)*Math.min(candidates.length-1,35)));
      const sample=candidates.slice(start,start+Math.max(3,Math.round(10+(1-power)*8)));
      const p=sample[Math.floor(Math.random()*Math.max(1,Math.min(sample.length,12)))];
      if(!p)throw Error('Not enough Pokémon to create clubs');
      used.add(p.id);lineup.push(p.id);roster.push(p.id);
    }
    const reserves=pool().sort((a,b)=>b.pas+b.def+b.phy-a.pas-a.def-a.phy);
    for(let i=0;i<3;i++){
      const p=reserves[Math.min(reserves.length-1,Math.floor(Math.random()*Math.min(18,reserves.length)))];
      if(!p)break;
      used.add(p.id);roster.push(p.id);
      const ix=reserves.indexOf(p);reserves.splice(ix,1);
    }
    return {name,abbr,formation,roster,lineup,tactic:'balanced'};
  }
  function newCareer(){
    if(!validStartingXI(state.lineup)){notify('Build a complete XI with 11 different Pokémon first.');return false;}
    const used=new Set(state.lineup);
    const t0={name:(state.name||'Indigo Athletic').slice(0,34),abbr:'YOU',formation:state.formation,roster:state.lineup.slice(),lineup:state.lineup.slice(),tactic:'balanced'};
    const next={version:1,season:1,round:0,teams:[t0],fixtures:buildFixtures(),results:[],news:[],history:[],playerState:{},budget:9500,training:2,finance:{tickets:0,wages:0,transfersIn:0,transfersOut:0,prizes:0},lastUserResult:null};
    for(let i=0;i<4;i++){
      const p=POKEMON.filter(x=>!used.has(x.id)).sort((a,b)=>fit(b,'CM')-fit(a,'CM'))[rnd(4,35)];
      if(!p)break;used.add(p.id);t0.roster.push(p.id);
    }
    RIVAL_NAMES.forEach(([name,abr],i)=>next.teams.push(seededTeam(name,abr, ['4-4-2','4-3-3','4-2-3-1','3-5-2'][i%4],used,(i+1)/8,next)));
    next.teams.forEach(team=>team.roster.forEach(id=>{next.playerState[id]={growth:0,energy:100,contract:rnd(2,4)};}));
    career=next;
    news(`${t0.name} entered the Indigo League with ${t0.roster.length} Pokémon on the books.`);
    save();render();notify('Your franchise career has begun!');return true;
  }
  function standing(c){
    const table=c.teams.map((t,i)=>({i,name:t.name,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0,gd:0}));
    for(const r of c.results){
      const h=table[r.home],a=table[r.away];h.p++;a.p++;h.gf+=r.hg;h.ga+=r.ag;a.gf+=r.ag;a.ga+=r.hg;
      if(r.hg>r.ag){h.w++;a.l++;h.pts+=3;}else if(r.hg<r.ag){a.w++;h.l++;a.pts+=3;}else {h.d++;a.d++;h.pts++;a.pts++;}
    }
    table.forEach(t=>t.gd=t.gf-t.ga);
    return table.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||a.i-b.i);
  }
  const getAttrs=(c,id)=>{
    const p=byId(id),growth=c.playerState[id]?.growth||0;
    return p?{pac:CLS(p.pac+growth),sho:CLS(p.sho+growth),pas:CLS(p.pas+growth),dri:CLS(p.dri+growth),def:CLS(p.def+growth),phy:CLS(p.phy+growth)}:
      {pac:50,sho:50,pas:50,dri:50,def:50,phy:50};
  };
  const mean=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:50;
  const avgEnergy=(c,ids)=>mean(ids.map(id=>c.playerState[id]?.energy??100));
  function teamProfile(c,index){
    const team=c.teams[index],slots=FORMATIONS[team.formation]||FORMATIONS['4-3-3'];
    const picks=team.lineup.map((id,i)=>({id,role:slots[i][0],stats:getAttrs(c,id)}));
    const attackers=picks.filter(({role})=>['ST','LW','RW','CAM','LM','RM'].includes(role));
    const middles=picks.filter(({role})=>['CDM','CM','CAM','LM','RM','LWB','RWB'].includes(role));
    const defenders=picks.filter(({role})=>['CB','LB','RB','CDM','LWB','RWB'].includes(role));
    const keeper=picks[0],a=attackers.length?attackers:picks.slice(8),d=defenders.length?defenders:picks.slice(1,5),m=middles.length?middles:picks.slice(5,8);
    const stat=(x,k)=>x.stats[k];
    const offense=mean(a.map(x=>.42*stat(x,'sho')+.32*stat(x,'dri')+.26*stat(x,'pac')));
    const distribution=mean(m.map(x=>.55*stat(x,'pas')+.30*stat(x,'dri')+.15*stat(x,'pac')));
    const defense=mean(d.map(x=>.60*stat(x,'def')+.24*stat(x,'phy')+.16*stat(x,'pac')));
    const energy=avgEnergy(c,team.lineup),eff=1-Math.max(0,82-energy)*.003;
    return {picks,offense:offense*eff,distribution:distribution*eff,defense:defense*eff,
      goalkeeper:keeper.stats,energy,overall:Math.round(mean(team.lineup.map((id,i)=>roleFit(id,slots[i][0],c))))};
  }
  // The goalkeeper always uses all six existing attributes, with event-sensitive
  // weights for the save calculation. This matches the franchise GK design.
  const GK_WEIGHTS={
    long:[.25,.04,.04,.04,.55,.08],
    oneonone:[.27,.02,.03,.10,.36,.22],
    cross:[.08,.03,.08,.04,.32,.45],
    setpiece:[.20,.02,.05,.03,.45,.25],
    open:[.14,.05,.09,.08,.42,.22]
  };
  function keeperRating(stats,kind){
    const vals=['pac','sho','pas','dri','def','phy'];
    return GK_WEIGHTS[kind].reduce((v,w,i)=>v+w*stats[vals[i]],0);
  }
  function pickScorer(profile){
    const attackers=profile.picks.filter(x=>['ST','LW','RW','CAM','LM','RM','CM'].includes(x.role));
    const candidates=attackers.length?attackers:profile.picks.slice(1);
    const weighted=candidates.flatMap(p=>Array(Math.max(1,Math.round(p.stats.sho/20))).fill(p));
    return weighted[Math.floor(Math.random()*weighted.length)]||profile.picks[9];
  }
  const CHANCE_KINDS=[['open',.18],['long',.09],['oneonone',.31],['cross',.14],['setpiece',.15]];
  function simulateTeamShots(c,atk,opp,atkTactic,defTactic,home){
    const modA=TACTIC_MOD[atkTactic],modD=TACTIC_MOD[defTactic];
    const n=Math.max(3,Math.min(19,Math.round(8+(atk.offense-opp.defense)*.16+(atk.distribution-opp.distribution)*.055 +modA.shots+modD.conceded+(home?1:0)+rnd(-3,3))));
    let goals=0,expected=0;const events=[];
    for(let i=0;i<n;i++){
      const picker=Math.random();const kind=picker<.16?'oneonone':picker<.29?'cross':picker<.50?'long':picker<.67?'setpiece':'open';
      const base=Object.fromEntries(CHANCE_KINDS)[kind];
      const shooter=pickScorer(atk);
      const gk=keeperRating(opp.goalkeeper,kind);
      const chance=Math.max(.025,Math.min(.64,base+(shooter.stats.sho-70)*.00125+(shooter.stats.dri-70)*.00035+
        (atk.offense-opp.defense)*.0016+(atk.distribution-opp.distribution)*.0005-(gk-70)*.0018));
      expected+=chance;
      if(Math.random()<chance){goals++;events.push({minute:rnd(4,90),id:shooter.id,kind});}
    }
    return {goals,shots:n,xg:expected,events};
  }
  function simulateFixture(c,home,away){
    const H=teamProfile(c,home),A=teamProfile(c,away);
    const th=c.teams[home].tactic,ta=c.teams[away].tactic;
    const h=simulateTeamShots(c,H,A,th,ta,true),a=simulateTeamShots(c,A,H,ta,th,false);
    const possession=Math.min(73,Math.max(27,Math.round(50+(H.distribution-A.distribution)*.42+TACTIC_MOD[th].possession-TACTIC_MOD[ta].possession+(Math.random()-.5)*10)));
    return {home,away,hg:h.goals,ag:a.goals,hShots:h.shots,aShots:a.shots,hXg:Math.round(h.xg*10)/10,aXg:Math.round(a.xg*10)/10,possession,
      events:[...h.events.map(e=>({...e,club:home})),...a.events.map(e=>({...e,club:away}))].sort((a,b)=>a.minute-b.minute)};
  }
  const windowOpen=c=>c.round<4||(c.round>=7&&c.round<10);
  function advance(){
    if(!career||career.round>=14)return;
    const c=career;c.teams[0].tactic=TACTICS.includes($('franchiseTactic').value)?$('franchiseTactic').value:'balanced';
    const fixtures=c.fixtures[c.round],results=fixtures.map(([h,a])=>simulateFixture(c,h,a));
    const ours=results.find(r=>r.home===0||r.away===0);
    for(const m of results){c.results.push({...m,round:c.round+1});
      c.teams[m.home].lineup.concat(c.teams[m.away].lineup).forEach(id=>{const p=c.playerState[id];if(p)p.energy=Math.max(43,p.energy-rnd(4,11));});
    }
    // Recover between matchweeks, bench players recover more quickly.
    c.teams.forEach(t=>t.roster.forEach(id=>{const p=c.playerState[id];if(p)p.energy=Math.min(100,p.energy+(t.lineup.includes(id)?5:12));}));
    c.round++;
    c.training=Math.min(4,c.training+1);
    const home=ours.home===0,oursG=home?ours.hg:ours.ag,theirG=home?ours.ag:ours.hg;
    c.lastUserResult={...ours,won:oursG>theirG,draw:oursG===theirG,opponent:c.teams[home?ours.away:ours.home].name};
    const revenue=home?rnd(430,710):rnd(40,100);
    const wage=c.teams[0].roster.reduce((sum,id)=>sum+wages(id,c),0);
    c.budget+=revenue-wage;c.finance.tickets+=revenue;c.finance.wages+=wage;
    news(`MW ${c.round}: ${c.teams[0].name} ${oursG}–${theirG} ${c.lastUserResult.opponent}. Gate and sponsorship: +${money(revenue)}, wages: −${money(wage)}.`);
    if(c.round===14){
      const table=standing(c),rank=table.findIndex(x=>x.i===0)+1;
      news(`Season ${c.season} finished! ${table[0].name} won the league. You finished ${rank}${rank===1?'st':rank===2?'nd':rank===3?'rd':'th'}.`);
    }
    save();render();
    notify(c.round===14?'Season complete — review the final table!':`Matchweek ${c.round} completed`);
  }
  function nextSeason(){
    if(!career||career.round!==14)return;
    const c=career,table=standing(c),rank=table.findIndex(t=>t.i===0)+1;
    const prize=[5200,3300,2200,1650,1200,900,650,450][rank-1]||450;
    c.history.unshift({season:c.season,rank,champion:table[0].name,points:table.find(t=>t.i===0).pts,prize});
    c.history=c.history.slice(0,20);c.budget+=prize;c.finance.prizes+=prize;
    for(const [id,data] of Object.entries(c.playerState)){
      data.energy=100;
      data.contract=Math.max(1,(data.contract||2)-1);
      if(data.contract<=1){data.contract=3; if(c.teams[0].roster.includes(+id))c.budget-=Math.round(price(+id,c)*.08);}
    }
    // Small amount of autonomous growth for CPU clubs every new season.
    c.teams.slice(1).forEach(t=>{
      const pick=t.roster[rnd(0,t.roster.length-1)];
      if(c.playerState[pick])c.playerState[pick].growth=Math.min(8,c.playerState[pick].growth+1);
    });
    c.season++;c.round=0;c.results=[];c.fixtures=buildFixtures();c.training=2;c.lastUserResult=null;
    c.finance={tickets:0,wages:0,transfersIn:0,transfersOut:0,prizes:0};
    news(`Season ${c.season} begins. Last season's finish earned ${money(prize)} in prize funding.`);
    save();render();notify(`Welcome to Season ${c.season}`);
  }
  function swap(slot,id){
    if(!career)return;
    const team=career.teams[0];
    if(!Number.isInteger(slot)||slot<0||slot>=11||!team.roster.includes(id))return;
    const old=team.lineup.indexOf(id);
    if(old!==-1&&old!==slot)team.lineup[old]=team.lineup[slot];
    team.lineup[slot]=id;save();render();
  }
  function train(id){
    if(!career||!career.teams[0].roster.includes(id))return;
    const p=career.playerState[id];if(career.training<1){notify('No training points left this week.');return;}
    if((p.growth||0)>=8){notify('This Pokémon is fully developed in this career.');return;}
    career.training--;p.growth=(p.growth||0)+1;p.energy=Math.min(100,p.energy+5);
    news(`${byId(id).name} completed individual training (+1 to six attributes in Franchise Mode).`);
    save();render();notify(`${byId(id).name} improved!`);
  }
  function sign(id){
    const c=career;if(!c||!windowOpen(c))return notify('Transfers are closed.');
    if(!byId(id)||owned(c).has(id))return notify('That Pokémon is already signed.');
    if(c.teams[0].roster.length>=MAX_ROSTER)return notify('Your roster is full (18).');
    const cost=price(id,c);if(c.budget<cost)return notify('Insufficient club funds.');
    c.budget-=cost;c.finance.transfersOut+=cost;c.teams[0].roster.push(id);
    c.playerState[id]={growth:0,energy:100,contract:3};
    news(`Transfer completed: ${byId(id).name} signed for ${money(cost)}.`);
    save();render();notify(`${byId(id).name} signed!`);
  }
  function sell(id){
    const c=career;if(!c||!windowOpen(c))return notify('Transfers are closed.');
    const t=c.teams[0];if(!t.roster.includes(id)||t.lineup.includes(id)||t.roster.length<=11)return notify('Only reserve Pokémon can be sold.');
    const fee=Math.round(price(id,c)*.58/10)*10;
    t.roster=t.roster.filter(x=>x!==id);c.budget+=fee;c.finance.transfersIn+=fee;
    news(`Transfer completed: ${byId(id).name} sold for ${money(fee)}.`);
    save();render();notify(`${byId(id).name} sold for ${money(fee)}`);
  }
  function toBuilder(){
    if(!career)return;state.name=career.teams[0].name;state.formation=career.teams[0].formation;
    state.lineup=career.teams[0].lineup.slice();state.selected=0;store();renderAll();showPage('builder');notify('Franchise Starting XI copied to Builder.');
  }
  function reset(){
    if(career&&!confirm('Delete the entire franchise career? This cannot be undone. Your Builder and Draft teams will stay saved.'))return;
    career=null;save();render();notify('Franchise reset. Builder and Draft are unaffected.');
  }

  function backup(){
    if(!career){notify('Start a franchise before exporting a backup.');return;}
    const payload={application:'PokeFC',kind:'franchise-save',exportedAt:new Date().toISOString(),career};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const uri=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=uri;a.download=`futbol-xi-franchise-season-${career.season}.json`;a.click();
    setTimeout(()=>URL.revokeObjectURL(uri),1000);
    notify('Franchise backup downloaded.');
  }
  async function restoreFile(file){
    if(!file)return;
    try{
      if(file.size>2_000_000)throw Error('Backup file is too large.');
      const payload=JSON.parse(await file.text());const v=payload?.career;
      if(payload.application!=='PokeFC'||payload.kind!=='franchise-save'||v?.version!==1||
         !Array.isArray(v.teams)||v.teams.length!==8||!Array.isArray(v.fixtures)||v.fixtures.length!==14||
         !Array.isArray(v.results)||!Array.isArray(v.news)||!v.playerState||
         !Number.isInteger(v.round)||v.round<0||v.round>14||
         !v.teams.every(t=>Array.isArray(t.lineup)&&validStartingXI(t.lineup)&&Array.isArray(t.roster)&&t.roster.length>=11&&t.roster.length<=18))
        throw Error('Not a compatible PokeFC franchise backup.');
      if(career&&!confirm('Replace your current franchise with this backup?'))return;
      career=v;save();render();notify(`Season ${career.season} franchise restored.`);
    }catch(e){notify(`Could not restore career: ${e.message}`);}
    finally{$('franchiseImportInput').value='';}
  }
  function renderPreview(){
    const ok=validStartingXI(state.lineup);
    $('franchisePreview').innerHTML=`<div class="franchise-preview"><b>${safe(state.name)}</b><span>${safe(state.formation)} · ${state.lineup.filter(Boolean).length}/11 Pokémon · ${squadRating()??'—'} OVR</span></div>`;
    $('franchiseStartBtn').disabled=!ok;
  }
  function renderTable(c){
    $('franchiseTable').innerHTML='<thead><tr><th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>'+
      standing(c).map((t,i)=>`<tr class="${t.i===0?'my-club':''}"><td>${i+1}</td><td>${safe(t.name)}</td><td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gd>0?'+':''}${t.gd}</td><td><strong>${t.pts}</strong></td></tr>`).join('')+'</tbody>';
    $('franchiseHistory').innerHTML=c.history.length?`<strong>TROPHY CABINET</strong><div>${c.history.slice(0,5).map(y=>`<span>S${y.season} · #${y.rank} · ${y.points} pts ${y.rank===1?'🏆':''}</span>`).join('')}</div>`:
      '<span>First season underway — trophies and placements appear here.</span>';
  }
  function renderMatch(c){
    const next=findNext(c),last=c.results.filter(r=>r.round===c.round);
    $('franchiseTactic').value=c.teams[0].tactic;
    $('franchiseTactic').disabled=c.round>=14;
    $('franchiseNextTitle').textContent=c.round===14?'Season finished':'Next fixture';
    $('franchiseRoundLabel').textContent=c.round===14?'FINAL TABLE':`MW ${String(c.round+1).padStart(2,'0')} / 14`;
    const nextOpponent=next?c.teams[next[0]===0?next[1]:next[0]]:null;
    $('franchiseNext').innerHTML=next?
      `<div class="franchise-versus"><span>${safe(c.teams[next[0]].name)}</span><b>VS</b><span>${safe(c.teams[next[1]].name)}</span></div><div class="franchise-mini-meta">${next[0]===0?'HOME MATCH':'AWAY MATCH'} · VS ${safe(nextOpponent.name)} · ROUND ${c.round+1}</div>`:
      `<div class="franchise-versus"><span>${safe(standing(c)[0].name)}</span><b>🏆</b><span>CHAMPIONS</span></div><div class="franchise-mini-meta">ALL 14 ROUNDS COMPLETED</div>`;
    $('franchiseAdvanceBtn').textContent=c.round===14?'Start next season →':'⚽ Simulate next matchweek →';
    $('franchiseFixtures').innerHTML=last.length?'<div class="franchise-subhead">LAST MATCHWEEK</div>'+last.map(r=>`<div class="franchise-fixture ${r.home===0||r.away===0?'highlight':''}"><span>${safe(c.teams[r.home].name)}</span><b>${r.hg} – ${r.ag}</b><span>${safe(c.teams[r.away].name)}</span></div>`).join(''):
      '<p class="franchise-muted">Fixtures begin with Matchweek 1. All four league matches will simulate together.</p>';
  }
  function renderSquad(c){
    const t=c.teams[0],roles=FORMATIONS[t.formation];
    $('franchiseSquad').innerHTML='<div class="franchise-xi">'+t.lineup.map((id,i)=>{
      const pos=roles[i][0],p=byId(id),player=c.playerState[id];
      const options=t.roster.map(o=>`<option value="${o}" ${o===id?'selected':''}>${safe(byId(o).name)} · ${roleFit(o,pos,c)} OVR</option>`).join('');
      return `<div class="franchise-squad-row"><span class="franchise-role">${pos}</span>${monAvatar(p)}<select aria-label="${pos} starter" data-fslot="${i}">${options}</select><span class="franchise-rating">${roleFit(id,pos,c)}</span><span class="franchise-fitness" title="Fitness ${player.energy}%">${player.energy}%</span></div>`;
    }).join('')+'</div>';
    $('franchiseBench').innerHTML=t.roster.map(id=>{
      const p=byId(id),bench=!t.lineup.includes(id),g=c.playerState[id];
      return `<div class="franchise-bench-row">${monAvatar(p)}<span class="franchise-bench-info"><b>${safe(p.name)}</b><small>${bench?'RESERVE':'STARTER'} · +${g.growth||0} development · ${g.contract}y contract</small></span><button class="franchise-tiny-btn" data-train="${id}" ${(g.growth>=8||c.training<1)?'disabled':''} title="Use one training point">Train</button>${bench?`<button class="franchise-tiny-btn danger" data-sell="${id}" ${!windowOpen(c)?'disabled':''} title="Sell reserve for 58% of market value">Sell</button>`:''}</div>`;
    }).join('');
    $('franchiseSquad').querySelectorAll('[data-fslot]').forEach(el=>el.onchange=()=>swap(+el.dataset.fslot,+el.value));
    $('franchiseBench').querySelectorAll('[data-train]').forEach(el=>el.onclick=()=>train(+el.dataset.train));
    $('franchiseBench').querySelectorAll('[data-sell]').forEach(el=>el.onclick=()=>sell(+el.dataset.sell));
  }
  function renderMarket(){
    const c=career;if(!c)return;
    const query=$('franchiseSearch').value.trim().toLowerCase();const role=$('franchiseFilter').value;
    const available=POKEMON.filter(p=>!owned(c).has(p.id)&&p.name.toLowerCase().includes(query));
    const effectiveRole=role==='all'?'CM':role;
    available.sort((a,b)=>fit(b,effectiveRole)-fit(a,effectiveRole));
    const open=windowOpen(c),canBuy=c.teams[0].roster.length<MAX_ROSTER;
    $('franchiseMarketBadge').textContent=open?`WINDOW OPEN · ${c.teams[0].roster.length}/${MAX_ROSTER}`:'WINDOW CLOSED';
    $('franchiseMarket').innerHTML=available.slice(0,22).map(p=>{
      const cost=price(p.id,c),good=cost<=c.budget&&canBuy&&open;
      return `<div class="franchise-market-row">${monAvatar(p)}<span class="franchise-market-info"><b>${safe(p.name)}</b><small>${fit(p,effectiveRole)} ${effectiveRole} fit · ${money(cost)}</small></span><button class="franchise-tiny-btn" ${good?'':'disabled'} data-sign="${p.id}">${open?'Sign':'Closed'}</button></div>`;
    }).join('')||'<p class="franchise-muted">No available Pokémon match your search.</p>';
    $('franchiseMarket').querySelectorAll('[data-sign]').forEach(el=>el.onclick=()=>sign(+el.dataset.sign));
  }
  function renderFinances(c){
    const wage=c.teams[0].roster.reduce((sum,id)=>sum+wages(id,c),0);
    $('franchiseFinances').innerHTML=`<div class="franchise-finance-row"><span>Transfer budget</span><b>${money(c.budget)}</b></div><div class="franchise-finance-row"><span>Matchweek wages</span><b>−${money(wage)}</b></div><div class="franchise-finance-row"><span>Season revenue</span><b>+${money(c.finance.tickets)}</b></div><div class="franchise-finance-row"><span>Transfer spend / sales</span><b>${money(c.finance.transfersOut)} / ${money(c.finance.transfersIn)}</b></div><div class="franchise-finance-row"><span>Wages paid</span><b>${money(c.finance.wages)}</b></div>`;
  }
  function render(){
    $('franchiseStart').hidden=!!career;
    $('franchiseDashboard').hidden=!career;
    if(!career){renderPreview();return;}
    const c=career,rank=standing(c).findIndex(t=>t.i===0)+1,me=standing(c).find(t=>t.i===0);
    $('franchiseMetrics').innerHTML=[
      ['CAREER',`SEASON ${c.season}`,'Manager career'],
      ['MATCHWEEK',`${c.round} / 14`,'Completed'],
      ['LEAGUE POSITION',`#${rank} / 8`,`${me.pts} points`],
      ['CLUB BUDGET',money(c.budget),'Transfer funds'],
      ['TRAINING',`${c.training} PT`,'Earn 1 / matchweek']
    ].map(([title,val,sub])=>`<div class="franchise-metric"><span>${title}</span><strong>${val}</strong><small>${sub}</small></div>`).join('');
    $('franchiseSeasonLabel').textContent=`SEASON ${c.season}`;
    renderTable(c);renderMatch(c);renderSquad(c);renderMarket();renderFinances(c);
    $('franchiseNews').innerHTML=c.news.map(item=>`<div class="franchise-news"><span>S${item.season} · MW ${item.week}</span><p>${safe(item.text)}</p></div>`).join('');
  }
  $('franchiseBuilderBtn').onclick=()=>showPage('builder');
  $('franchiseBackupBtn').onclick=backup;
  $('franchiseImportBtn').onclick=()=>$('franchiseImportInput').click();
  $('franchiseImportInput').onchange=e=>restoreFile(e.target.files?.[0]);
  $('franchiseResetBtn').onclick=reset;
  $('franchiseStartBtn').onclick=newCareer;
  $('franchiseAdvanceBtn').onclick=()=>career?.round===14?nextSeason():advance();
  $('franchiseCopyBtn').onclick=toBuilder;
  $('franchiseTactic').onchange=e=>{if(!career)return;career.teams[0].tactic=TACTICS.includes(e.target.value)?e.target.value:'balanced';save();};
  $('franchiseSearch').oninput=renderMarket;
  $('franchiseFilter').onchange=renderMarket;
  window.FranchiseUI={render, newCareer,reset, getCareer:()=>career, standing:()=>career?standing(career):[], getProfile:(teamIndex)=>career?teamProfile(career,teamIndex):null};
  render();
})();
