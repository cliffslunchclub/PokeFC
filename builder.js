/* PokéFC public Free Builder — no backend, separate from ranked Challenge/Franchise.
 * Position ratings follow Challenge alpha's provisional raw-stat formula. */
(()=>{'use strict';
const S=Array.isArray(window.FXI_SPECIES)?window.FXI_SPECIES:[];
const BY=new Map(S.map(s=>[s.id,s]));
const KEY='pokefc-free-builder-v1';
const FORMATIONS={
 '4-3-3':[['GK',50,88],['LB',14,72],['CB',38,73],['CB',62,73],['RB',86,72],['CM',24,52],['CM',50,50],['CM',76,52],['LW',19,25],['ST',50,18],['RW',81,25]],
 '4-2-3-1':[['GK',50,88],['LB',13,73],['CB',37,76],['CB',63,76],['RB',87,73],['CDM',34,56],['CDM',66,56],['LW',15,32],['CAM',50,33],['RW',85,32],['ST',50,15]],
 '4-4-2':[['GK',50,88],['LB',13,74],['CB',37,73],['CB',63,73],['RB',87,74],['LM',14,46],['CM',37,48],['CM',63,48],['RM',86,46],['ST',33,19],['ST',67,19]],
 '3-5-2':[['GK',50,88],['CB',22,73],['CB',50,75],['CB',78,73],['LWB',12,48],['RWB',88,48],['CM',35,50],['CM',65,50],['CAM',50,35],['ST',33,19],['ST',67,19]],
 '5-3-2':[['GK',50,88],['LWB',12,58],['CB',25,75],['CB',50,77],['CB',75,75],['RWB',88,58],['CM',27,44],['CM',50,47],['CM',73,44],['ST',33,20],['ST',67,20]]
};
const ROLES={GK:'Goalkeeper',LB:'Left Back',RB:'Right Back',CB:'Centre Back',LWB:'Left Wing Back',RWB:'Right Wing Back',CDM:'Defensive Midfielder',CM:'Central Midfielder',LM:'Left Midfielder',RM:'Right Midfielder',LW:'Left Winger',RW:'Right Winger',CAM:'Attacking Midfielder',ST:'Striker'};
const WEIGHT_GK={hp:.2,defense:.3,spDefense:.3,speed:.2};
const WEIGHT_DEF={defense:.35,hp:.2,attack:.2,speed:.25};
const WEIGHT_ATTACK={attack:.35,spAttack:.2,speed:.35,hp:.1};
const WEIGHT_MID={spAttack:.3,spDefense:.25,attack:.2,speed:.25};
function rating(s,role){
 if(!s)return 0;
 const w=role==='GK'?WEIGHT_GK:['CB','LB','RB','LWB','RWB'].includes(role)?WEIGHT_DEF:['ST','LW','RW'].includes(role)?WEIGHT_ATTACK:WEIGHT_MID;
 return Math.min(100,20+.55*Object.entries(w).reduce((sum,[k,v])=>sum+s.baseStats[k]*v,0));
}
function escapeHtml(t){return String(t??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
const $=id=>document.getElementById(id);
const empty=()=>({version:1,name:'Indigo Athletic',formation:'4-3-3',lineup:Array(11).fill(null),selected:0,spriteStyle:'pixel'});
function normalize(value){
 const s=empty();
 if(!value||value.version!==1||!FORMATIONS[value.formation]||!Array.isArray(value.lineup)||value.lineup.length!==11)return s;
 s.name=typeof value.name==='string'?value.name.slice(0,38):s.name;
 s.spriteStyle=value.spriteStyle==='art'?'art':'pixel';
 s.formation=value.formation;
 s.selected=Number.isInteger(value.selected)&&value.selected>=0&&value.selected<11?value.selected:0;
 const used=new Set();
 s.lineup=value.lineup.map(id=>{const n=Number(id);if(id===null||!BY.has(n)||used.has(n))return null;used.add(n);return n});
 return s;
}
let state;
try{state=normalize(JSON.parse(localStorage.getItem(KEY)))}catch{state=empty()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));$('savedStatus').textContent='Saved in this browser'}catch{$('savedStatus').textContent='Local saving is unavailable'}}
function sprite(id){const folder=state.spriteStyle==='art'?'other/official-artwork/':'';return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+folder+id+'.png'}
function normalizeSearch(q){return String(q||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’'.:♀♂-]/g,'').replace(/\s+/g,'')}
function details(s){return 'Gen '+(s.gen||'?')+' · '+s.height+' m · '+s.weight+' kg · BST '+Object.values(s.baseStats).reduce((a,b)=>a+b,0)}
const statSummary=s=>[['HP','hp'],['ATK','attack'],['DEF','defense'],['SPA','spAttack'],['SPD','spDefense'],['SPE','speed']].map(([label,key])=>label+' '+s.baseStats[key]).join(' · ');
function average(){const chosen=state.lineup.map((id,i)=>id?rating(BY.get(id),FORMATIONS[state.formation][i][0]):null).filter(v=>v!==null);return chosen.length?chosen.reduce((a,b)=>a+b,0)/chosen.length:null}
function renderPitch(){
 const f=FORMATIONS[state.formation],filled=state.lineup.filter(Boolean).length;
 $('lineupName').textContent=state.name||'Your XI';
 $('lineupFormation').textContent=state.formation+' formation';
 $('formation').value=state.formation;
 $('filledCount').textContent=filled+' / 11 chosen';
 $('teamScore').textContent=average()===null?'—':average().toFixed(1);
 $('pitchSlots').innerHTML=f.map(([role,x,y],i)=>{
  const p=BY.get(state.lineup[i]);
  return '<button type="button" class="pitch-slot '+(i===state.selected?'selected ':'')+(!p?'empty':'')+'" data-slot="'+i+'" style="left:'+x+'%;top:'+y+'%" aria-label="'+escapeHtml(role+' '+(p?p.name:'empty'))+'">'+
    '<span class="role">'+role+'</span>'+
    (p?'<img alt="" loading="lazy" src="'+sprite(p.id)+'"><span class="name">'+escapeHtml(p.name)+'</span><span class="ovr">'+rating(p,role).toFixed(0)+' OVR</span>':
     '<span class="slot-plus">+</span><span class="name">OPEN</span>')+'</button>';
 }).join('');
}
let limit=36;
function renderProspects(){
 const role=FORMATIONS[state.formation][state.selected][0],current=BY.get(state.lineup[state.selected]),q=normalizeSearch($('search').value.trim()),type=$('typeFilter').value,gen=$('genFilter').value;
 $('scoutTitle').textContent=ROLES[role];$('selectedRole').textContent=role;
 $('currentPick').innerHTML=current?
   '<strong>'+escapeHtml(current.name)+'</strong> · '+rating(current,role).toFixed(1)+' OVR <button id="removePick" class="btn" type="button" style="float:right;padding:4px 9px;min-height:26px;margin-top:-3px">Remove</button><span class="current-detail">'+escapeHtml(details(current))+'<br>'+escapeHtml(statSummary(current))+'</span>':
   'Select a Pokémon to fill the '+escapeHtml(role)+' position.';
 const used=new Set(state.lineup.filter(Boolean));
 const opts=S.filter(p=>(!q||normalizeSearch(p.name).includes(q)||normalizeSearch(p.slug||'').includes(q)||String(p.id)===q||String(p.id).padStart(4,'0')===q)&&(!gen||String(p.gen)===gen)&&(!type||p.types.includes(type)))
   .sort((a,b)=>rating(b,role)-rating(a,role)||a.id-b.id);
 $('resultsCount').textContent=opts.length+' matching · '+S.length+' total';
 $('prospects').innerHTML=opts.slice(0,limit).map(p=>{
  const chosen=used.has(p.id),here=state.lineup[state.selected]===p.id;
  return '<button type="button" class="prospect '+(chosen?'chosen':'')+'" data-species="'+p.id+'" '+(chosen&&!here?'disabled':'')+'>'+
    '<img src="'+sprite(p.id)+'" alt="" loading="lazy">'+
    '<span class="identity"><strong>'+escapeHtml(p.name)+'</strong><small>#'+String(p.id).padStart(4,'0')+' · '+p.types.map(escapeHtml).join(' / ')+'</small><small>'+escapeHtml(details(p))+'</small><small class="raw-stats">'+escapeHtml(statSummary(p))+'</small></span>'+
    '<span class="overall"><b>'+rating(p,role).toFixed(1)+'</b><small>'+role+' FIT</small></span>'+
    '<span class="select-marker">'+(here?'✓':chosen?'●':'+')+'</span></button>';
 }).join('') || '<p class="empty-results">No Pokémon matched. Try a different search or type.</p>';
 $('more').hidden=opts.length<=limit;
}
function render(){renderPitch();renderProspects()}
function pickSpecies(id){
 if(!BY.has(id))return;
 const already=state.lineup.indexOf(id);
 if(already>=0 && already!==state.selected)return;
 state.lineup[state.selected]=id;
 const nextEmpty=state.lineup.findIndex((v,i)=>v===null&&i!==state.selected);
 if(nextEmpty>=0)state.selected=nextEmpty;
 save();render();
}
function randomize(){
 const ids=S.map(s=>s.id);
 for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}
 state.lineup=ids.slice(0,11);
 state.selected=0;save();render();
}
async function copyXI(){
 const f=FORMATIONS[state.formation];
 const text=['PokéFC · '+(state.name||'Your XI')+' · '+state.formation,...f.map(([role],i)=>role+': '+(BY.get(state.lineup[i])?.name||'Open')),'Average positional rating: '+(average()===null?'—':average().toFixed(2))].join('\n');
 try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(text);$('savedStatus').textContent='XI copied to clipboard'}catch{window.prompt('Copy your XI:',text)}
}
function wire(){
 const types=[...new Set(S.flatMap(p=>p.types))].sort();
 $('typeFilter').innerHTML='<option value="">All types</option>'+types.map(t=>'<option value="'+escapeHtml(t)+'">'+t[0].toUpperCase()+t.slice(1)+'</option>').join('');
 $('clubName').value=state.name;
 $('spriteStyle').value=state.spriteStyle;
 $('spriteStyle').addEventListener('change',e=>{state.spriteStyle=e.target.value==='art'?'art':'pixel';save();render()});
 $('clubName').addEventListener('input',e=>{state.name=e.target.value.slice(0,38);$('lineupName').textContent=state.name||'Your XI';save()});
 $('formation').addEventListener('change',e=>{if(!FORMATIONS[e.target.value])return;state.formation=e.target.value;save();render()});
 $('randomize').addEventListener('click',()=>{if(state.lineup.some(Boolean)&&!confirm('Replace the current lineup with random Pokémon?'))return;randomize()});
 $('clear').addEventListener('click',()=>{if(!state.lineup.some(Boolean))return;if(!confirm('Clear all 11 positions?'))return;state.lineup=Array(11).fill(null);state.selected=0;save();render()});
 $('share').addEventListener('click',copyXI);
 $('pitchSlots').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(!b)return;state.selected=Number(b.dataset.slot);save();render()});
 $('prospects').addEventListener('click',e=>{const b=e.target.closest('[data-species]');if(!b||b.disabled)return;pickSpecies(Number(b.dataset.species))});
 $('currentPick').addEventListener('click',e=>{if(e.target.id!=='removePick')return;state.lineup[state.selected]=null;save();render()});
 for(const id of ['search','typeFilter','genFilter'])$(id).addEventListener(id==='search'?'input':'change',()=>{limit=36;renderProspects()});
 $('more').addEventListener('click',()=>{limit+=36;renderProspects()});
}
if(!S.length){$('prospects').innerHTML='<p class="empty-results">Pokémon data is unavailable. Reload the page.</p>';return}
wire();render();save();
window.PFC_BUILDER={rating,formations:FORMATIONS,getState:()=>JSON.parse(JSON.stringify(state))};
})();
