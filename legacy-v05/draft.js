'use strict';
/** PokeFC snake draft — 4 clubs, 11 rounds, one shared 151-Pokémon pool.
 * The CPU opponents are original AI logic, not an imported game engine.
 * Saved separately from the builder and franchise for backwards compatibility.
 */
window.FutbolDraftV05=(()=>{
 const SAVE='futbol-xi-draft-v2';
 const NAMES=['Your XI','Pewter Rovers','Saffron City SC','Indigo Champions'];
 const ABBR=['YOU','PWR','SAF','IND'];
 const STYLES=['balanced','defensive','technical','attacking'];
 const TYPE_LIST=Object.keys(TYPE_INFO);
 const safe=s=>escapeHTML(s);
 const slots=()=>FORMATIONS[draft.formation] || FORMATIONS['4-3-3'];
 const usedSet=()=>new Set(draft.picked);
 const occupied=()=>draft.clubs[0].lineup.filter(Boolean).length;
 const pickOrder=round=>round%2===0?[0,1,2,3]:[3,2,1,0];
 const nextClub=()=>draft.round<11?pickOrder(draft.round)[draft.turn]:null;
 const overall=team=>{
   const ratings=team.lineup.map((id,i)=>id?fit(byId(id),slots()[i][0]):0).filter(Boolean);
   return ratings.length?Math.round(ratings.reduce((a,b)=>a+b,0)/ratings.length):0;
 };
 const keySort=(a,b)=>b.score-a.score||a.id-b.id;
 function typePool(type){const used=usedSet();return POKEMON.filter(p=>p.types.includes(type)&&!used.has(p.id));}
 function chooseFocus(){
   // Round-specific focus: uncommon types are eligible as long as any unowned
   // representative remains. Human prospects are always globally exclusive.
   const viable=TYPE_LIST.filter(t=>typePool(t).length>=3);
   draft.type=randomFrom(viable.length?viable:TYPE_LIST.filter(t=>typePool(t).length));
 }
 function recommendedSlot(){
   const open=slots().map((pos,i)=>draft.clubs[0].lineup[i]?null:{index:i,role:pos[0]}).filter(Boolean);
   const pool=typePool(draft.type);
   if(!open.length)return 0;
   // Suggest a naturally suitable position for this round's scouting type,
   // but the manager can always change the slot before selecting a Pokémon.
   return open.map(s=>({slot:s.index,value:Math.max(...pool.map(p=>fit(p,s.role)))}))
      .sort((a,b)=>b.value-a.value||a.slot-b.slot)[0].slot;
 }
 function offerProspects(){
   const pool=typePool(draft.type), role=slots()[draft.selected][0];
   const ranked=pool.map(p=>({id:p.id,score:fit(p,role)+Math.random()*7})).sort(keySort);
   let offers=[];
   // A star, a solid value pick, and a slightly surprising choice.
   const tiers=[ranked.slice(0,Math.min(5,ranked.length)),ranked.slice(3,Math.min(12,ranked.length)),ranked.slice(9)];
   for(const tier of tiers){const valid=tier.filter(x=>!offers.includes(x.id));if(valid.length)offers.push(randomFrom(valid).id);}
   for(const row of ranked){if(offers.length>=3)break;if(!offers.includes(row.id))offers.push(row.id);}
   draft.offers=offers;
 }
 function aiSelection(clubIndex){
   const team=draft.clubs[clubIndex], empty=slots().map((s,i)=>team.lineup[i]?null:{slot:i,role:s[0]}).filter(Boolean), used=usedSet();
   const pool=POKEMON.filter(p=>!used.has(p.id));
   if(!pool.length||!empty.length)throw Error('Draft pool exhausted unexpectedly');
   // Every AI club evaluates all open positions, so an elite ST is not wasted
   // at goalkeeper merely because the default slot order begins with GK.
   const roleBonus=(role)=>{
     if(STYLES[clubIndex]==='defensive')return ['GK','CB','LB','RB','CDM'].includes(role)?3:0;
     if(STYLES[clubIndex]==='technical')return ['CM','CAM','LW','RW'].includes(role)?3:0;
     if(STYLES[clubIndex]==='attacking')return ['ST','CAM','LW','RW'].includes(role)?3:0;
     return 0;
   };
   let best=null;
   for(const p of pool){
     for(const e of empty){
       const score=fit(p,e.role)+roleBonus(e.role)+(p.legendary?0:0)+Math.random()*6;
       if(!best || score>best.score) best={id:p.id,slot:e.slot,score};
     }
   }
   return best;
 }
 function recordPick(clubIndex,id,slot){
   if(usedSet().has(id))throw Error('Duplicate draft selection #'+id);
   if(draft.clubs[clubIndex].lineup[slot])throw Error('Draft position already occupied');
   draft.clubs[clubIndex].lineup[slot]=id;
   draft.picked.push(id);
   draft.events.unshift({pick:draft.picked.length,round:draft.round+1,club:clubIndex,id,role:slots()[slot][0]});
   draft.events=draft.events.slice(0,44);
 }
 function resolveTurn(){
   draft.turn++;
   if(draft.turn>=4){draft.turn=0;draft.round++;
     if(draft.round===11){draft.complete=true;draft.offers=[];return;}
     chooseFocus();
   }
 }
 function runCpuUntilHuman(){
   let limit=60;
   while(!draft.complete && nextClub()!==0 && limit-->0){
     const ix=nextClub(),sel=aiSelection(ix);
     recordPick(ix,sel.id,sel.slot);resolveTurn();
   }
   if(limit<=0)throw Error('Draft pick order failed to resolve');
   if(!draft.complete){
     // A focus can be exhausted by CPU turns. Auto-choose another if required.
     if(!typePool(draft.type).length)chooseFocus();
     if(draft.selected<0 || draft.clubs[0].lineup[draft.selected] || !draft.picked.length)draft.selected=recommendedSlot();
     offerProspects();
   }
 }
 function persist(){try{localStorage.setItem(SAVE,JSON.stringify(draft))}catch(e){console.warn('Draft could not be saved',e)}}
 function validSaved(d){
   if(!d || d.version!==2 || !FORMATIONS[d.formation] || !Array.isArray(d.clubs) || d.clubs.length!==4 || !Array.isArray(d.picked))return false;
   if(d.clubs.some(c=>!Array.isArray(c.lineup)||c.lineup.length!==11))return false;
   const ids=d.clubs.flatMap(c=>c.lineup.filter(Boolean));
   if(ids.some(id=>!Number.isInteger(id)||!byId(id))||new Set(ids).size!==ids.length)return false;
   if(ids.length!==d.picked.length || new Set(d.picked).size!==ids.length)return false;
   if(d.round<0||d.round>11||d.turn<0||d.turn>3 || d.selected<0 || d.selected>10)return false;
   if(!d.complete && nextClubFor(d)!==0)return false;
   return true;
 }
 const nextClubFor=d=>d.round<11?pickOrder(d.round)[d.turn]:null;
 function newDraft(){
   let saved=null;try{saved=JSON.parse(localStorage.getItem(SAVE))}catch{}
   if(validSaved(saved)){draft=saved;renderDraft();return;}
   restart();
 }
 function restart(){
   draft={version:2,formation:state.formation,clubs:NAMES.map((name,i)=>({name,abbr:ABBR[i],lineup:Array(11).fill(null)})),picked:[],events:[],round:0,turn:0,
    selected:0,type:'',offers:[],rerolls:3,complete:false,cup:null};
   chooseFocus();runCpuUntilHuman();persist();renderDraft();
 }
 function rerollDraft(){
   if(draft.complete||draft.rerolls<=0)return;
   const viable=TYPE_LIST.filter(type=>type!==draft.type && typePool(type).length>=3);
   if(!viable.length){notify('No more scouting types available');return;}
   draft.rerolls--;draft.type=randomFrom(viable);offerProspects();persist();renderDraft();
 }
 function draftPick(id){
   if(draft.complete||nextClub()!==0||draft.clubs[0].lineup[draft.selected] || !draft.offers.includes(id) || usedSet().has(id))return;
   recordPick(0,id,draft.selected);resolveTurn();runCpuUntilHuman();persist();renderDraft();
   notify(`${byId(id).name} drafted — ${draft.clubs[0].lineup.filter(Boolean).length}/11`);
 }
 function playCup(){
   if(!draft.complete)return;
   const scores=NAMES.map((name,i)=>({name,i,p:0,w:0,d:0,l:0,gf:0,ga:0}));
   const games=[];
   for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){
     const va=overall(draft.clubs[a]),vb=overall(draft.clubs[b]);
     const home=clamp(poisson(Math.max(.25,1.45+(va-vb)*.035)),0,7);
     const away=clamp(poisson(Math.max(.25,1.3+(vb-va)*.035)),0,7);
     games.push({a,b,home,away});
     const x=scores[a],y=scores[b];x.gf+=home;x.ga+=away;y.gf+=away;y.ga+=home;
     if(home>away){x.w++;x.p+=3;y.l++}else if(home<away){y.w++;y.p+=3;x.l++}else{x.d++;y.d++;x.p++;y.p++}
   }
   scores.sort((a,b)=>b.p-a.p||((b.gf-b.ga)-(a.gf-a.ga))||b.gf-a.gf||a.i-b.i);
   draft.cup={games,scores};persist();renderDraft();notify(`Draft Cup winner: ${scores[0].name}`);
 }
 function renderCup(){
   if(!draft.cup)return `<button class="btn btn-primary" id="draftCupBtn">⚽ Simulate Draft Cup</button><p class="draft-note">Six matches, four drafted teams, one trophy. No impact on Franchise saves.</p>`;
   return `<p class="eyebrow small">DRAFT CUP · FINAL TABLE</p><div class="draft-cup-table">${draft.cup.scores.map((r,i)=>`<div class="draft-cup-row"><b>${i+1}</b><span>${safe(r.name)}</span><strong>${r.p} PTS</strong><small>${r.gf}:${r.ga}</small></div>`).join('')}</div><button class="btn btn-ghost" id="draftCupBtn">↻ Rematch cup</button>`;
 }
 function renderDraft(){
   if(!draft || !draft.clubs?.length)return;
   const pos=slots();
   $('draftRound').textContent=draft.complete?'DRAFT COMPLETE':`ROUND ${String(draft.round+1).padStart(2,'0')} / 11 · SNAKE DRAFT`;
   $('rerollsLabel').textContent=`${draft.rerolls} SCOUTING REROLL${draft.rerolls===1?'':'S'} LEFT`;
   $('draftType').textContent=draft.complete?'ALL 44 PICKS COMPLETE':draft.type.toUpperCase();
   $('draftType').style.color=draft.complete?'#dcf56a':TYPE_INFO[draft.type]?.[0]||'#dcf56a';
   $('draftCount').textContent=occupied();$('draftProgress').style.width=`${occupied()/11*100}%`;
   $('draftPositions').innerHTML=pos.map((s,i)=>{
     const id=draft.clubs[0].lineup[i];return `<button class="draft-pos ${draft.selected===i&&!draft.complete?'selected':''} ${id?'taken':''}" data-draftslot="${i}" ${id?'disabled':''} aria-label="${s[0]} ${id?byId(id).name:'open'}" title="${id?safe(byId(id).name):'Choose '+s[0]}">${s[0]}${id?' ✓':''}</button>`;
   }).join('');
   $('draftPositions').querySelectorAll('[data-draftslot]').forEach(b=>b.onclick=()=>{
     if(draft.complete)return;draft.selected=Number(b.dataset.draftslot);offerProspects();persist();renderDraft();
   });
   $('draftOffers').innerHTML=draft.complete?'':draft.offers.map(id=>{
     const p=byId(id),role=pos[draft.selected][0];
     return `<button class="draft-offer" data-draftpoke="${p.id}" style="--mon-color:${colorOf(p)}"><span class="offer-avatar">${initialsOf(p)}</span><strong>${safe(p.name)}</strong><small>${p.types.join(' / ')} · #${p.id}</small><span class="offer-rating">${fit(p,role)}<span>${role} FIT</span></span><span class="offer-stats">${['PAC','SHO','PAS','DRI','DEF','PHY'].map((k,i)=>`${k} ${p[['pac','sho','pas','dri','def','phy'][i]]}`).join(' · ')}</span></button>`;
   }).join('');
   $('draftOffers').querySelectorAll('[data-draftpoke]').forEach(b=>b.onclick=()=>draftPick(+b.dataset.draftpoke));
   $('rerollDraftBtn').disabled=draft.complete||draft.rerolls<=0;
   const others=$('draftRivals');
   if(others)others.innerHTML=draft.clubs.map((c,i)=>`<div class="draft-rival ${i===0?'self':''}"><span class="draft-rival-abr">${c.abbr}</span><div><strong>${safe(c.name)}</strong><small>${c.lineup.filter(Boolean).length}/11 signed</small></div><span class="draft-rival-rating">${overall(c)||'—'} <small>OVR</small></span></div>`).join('');
   const feed=$('draftFeed');
   if(feed)feed.innerHTML=draft.events.length?draft.events.slice(0,8).map(e=>`<div class="draft-event"><b>#${String(e.pick).padStart(2,'0')}</b><span>${safe(draft.clubs[e.club].name)} drafted <strong>${safe(byId(e.id).name)}</strong> <small>${e.role}</small></span></div>`).join(''):'<p class="draft-note">Your club has the first pick.</p>';
   $('draftEnd').hidden=!draft.complete;
   if(draft.complete){
     const board=draft.clubs.map(c=>({name:c.name,ovr:overall(c)})).sort((a,b)=>b.ovr-a.ovr);
     $('draftEnd').innerHTML=`<p class="eyebrow">FOUR TEAMS · ELEVEN ROUNDS · 44 UNIQUE POKÉMON</p><h3>Draft complete!</h3><p>Your team has <b>${overall(draft.clubs[0])} OVR</b>, ranking <b>#${board.findIndex(x=>x.name===NAMES[0])+1}/4</b> by squad rating. Save it to Builder, or run a quick CPU cup.</p><div class="draft-end-buttons"><button id="useDraftBtn" class="btn btn-primary">Use my drafted XI →</button>${renderCup()}</div>`;
     $('useDraftBtn').onclick=()=>{
       state.lineup=draft.clubs[0].lineup.slice();state.formation=draft.formation;
       state.name='Draft XI';state.selected=0;store();renderAll();showPage('builder');notify('Drafted squad loaded into Builder');
     };
     $('draftCupBtn').onclick=playCup;
   }
 }
 return {newDraft,restart,rerollDraft,draftPick,renderDraft,playCup};
})();
