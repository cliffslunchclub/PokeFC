/* PokéFC Franchise optional Quick Sim schematic viewer.
 * Soccer-JS 2.5D is the primary Watch. This separate 2D schematic
 * never generates or changes the precomputed Quick Sim score.
 * Record is explicit and idempotent; cancel/back never writes.
 */
(function(root){'use strict';
 let active=null,raf=0,previous=0;
 const $=id=>document.getElementById(id);
 const clamp=(x,min,max)=>Math.max(min,Math.min(max,Number(x)||0));
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 function scoreAt(m,t){
  const s=[0,0];
  for(const e of m.result.events||[]){
   if(e.type!=='goal'||e.minute>t)continue;
   s[String(e.team)===String(m.home.id)?0:1]++;
  }
  return s;
 }
 function formation(team,side,t){
  let groups={GK:[],DEF:[],MID:[],FWD:[]};
  team.lineup.forEach((p,i)=>{let role=p.pos||'MID';
   if(/GK/.test(role))role='GK';else if(/CB|LB|RB|WB|DEF/.test(role))role='DEF';
   else if(/ST|RW|LW|FWD/.test(role))role='FWD';else role='MID';
   (groups[role]||groups.MID).push({p,i});
  });
  const x={GK:.09,DEF:.28,MID:.51,FWD:.75};
  return Object.entries(groups).flatMap(([role,arr])=>arr.map(({p,i},j)=>({
   p,i,x:105*(side?1-x[role]:x[role])+Math.sin(t*.22+i)*.35,
   y:68*(j+1)/(arr.length+1)+Math.cos(t*.31+i)*.25
  })));
 }
 function draw(m){
  const c=m.canvas,ctx=m.ctx,w=c.width,h=c.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#0c593e';ctx.fillRect(0,0,w,h);
  const sx=w/105,sy=h/68;
  ctx.strokeStyle='#d9e9ce';ctx.lineWidth=2;
  ctx.strokeRect(8,8,w-16,h-16);
  ctx.beginPath();ctx.moveTo(w/2,8);ctx.lineTo(w/2,h-8);
  ctx.arc(w/2,h/2,Math.min(w,h)*.11,0,Math.PI*2);ctx.stroke();
  for(let side=0;side<2;side++){
   const roster=side?m.away:m.home;
   for(const p of formation(roster,side,m.minute)){
    const x=p.x*sx,y=p.y*sy;ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);
    ctx.fillStyle=side?'#fff':'#e53935';ctx.fill();
    ctx.strokeStyle='#182b27';ctx.stroke();
    ctx.fillStyle=side?'#b31d2a':'#fff';ctx.font='bold 12px system-ui';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(p.i+1),x,y);
   }
  }
  const bx=w*(.5+.25*Math.sin(m.minute*.22)),by=h*(.5+.20*Math.cos(m.minute*.19));
  ctx.beginPath();ctx.arc(bx,by,6,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.stroke();
 }
 function update(m){
  if(active!==m)return;
  const score=scoreAt(m,m.minute);
  $('liveScore').textContent=score.join(' – ');
  const mm=Math.floor(m.minute),ss=Math.floor((m.minute-mm)*60);
  $('liveClock').textContent=String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');
  $('viewerSeek').value=m.minute;
  $('viewerPlay').textContent=m.playing?'Ⅱ Pause':'▶ Play';
  $('viewerPlay').disabled=m.recorded;
  $('viewerReset').disabled=m.recorded;
  $('viewerComplete').disabled=m.recorded;
  $('viewerComplete').textContent=m.minute>=90?'✓ Record result & finish week':'⚡ Skip to full time';
  $('viewerMode').disabled=m.minute>0&&!m.recorded;
  $('viewerTMFull')?.setAttribute?.('hidden','');
  const lookup=new Map([...m.home.lineup,...m.away.lineup].map(p=>[String(p.id),p]));
  const events=(m.result.events||[]).filter(e=>Number(e.minute)<=m.minute);
  $('viewerEvents').innerHTML='<p>Kick-off · 0′</p>'+events.map(e=>{
   const name=lookup.get(String(e.player))?.species||'Pokémon';
   return '<p>'+esc(Math.floor(e.minute))+'′ '+esc((e.type||'event').toUpperCase())+
    ' · '+esc(name)+'</p>';
  }).join('')+(m.minute>=90?'<p><strong>90′ Full time</strong></p>':'');
  const stats=m.result.stats||[];
  $('viewerStats').innerHTML='<p class="tiny muted">Official Quick Sim match statistics</p>'+
   [['Goals','goals'],['Shots','shots'],['Shots on target','shotsOnTarget'],['Passes','passes'],['Possession','possession']].map(([n,k])=>
    '<div class="viewer-stat"><span>'+esc(stats[0]?.[k]??'—')+'</span><small>'+n+'</small><span>'+esc(stats[1]?.[k]??'—')+'</span></div>').join('');
  draw(m);
 }
 function stop(){
  if(raf){cancelAnimationFrame(raf);raf=0}
  active=null;previous=0;
 }
 function tick(ms){
  raf=0;const m=active;
  if(!m||!m.playing)return;
  const delta=Math.min(.25,previous?(ms-previous)/1000:0);previous=ms;
  m.minute=clamp(m.minute+delta*m.speed,0,90);
  if(m.minute>=90){m.playing=false;previous=0}
  update(m);
  if(m.playing)raf=requestAnimationFrame(tick);
 }
 function mountQuick(data,finish){
  stop();
  const canvas=$('tacticalPitch'),ctx=canvas?.getContext('2d');
  if(!ctx)return false;
  const m=active={...data,canvas,ctx,result:data.result,finish,minute:0,speed:4,playing:false,recorded:false};
  $('viewerSoccerRecord').hidden=true;$('viewerSoccerCancel').hidden=true;
  $('viewerProjection').disabled=true;$('viewerCamera').disabled=true;
  $('viewerSeek').disabled=false;
  const n=$('engineInstallStatus');
  if(n)n.textContent='Quick Sim schematic: illustrative 2D positions; score and statistics are official.';
  $('viewerPlay').onclick=()=>{
   if(active!==m||m.recorded)return;
   if(m.minute>=90)m.minute=0;
   m.playing=!m.playing;
   if(m.playing){previous=0;raf=requestAnimationFrame(tick)}
   else if(raf){cancelAnimationFrame(raf);raf=0}
   update(m);
  };
  $('viewerReset').onclick=()=>{
   if(active!==m||m.recorded)return;
   m.playing=false;m.minute=0;if(raf){cancelAnimationFrame(raf);raf=0}update(m);
  };
  $('viewerSpeed').onchange=e=>{if(active===m)m.speed=clamp(e.target.value,.25,16)};
  $('viewerSeek').oninput=e=>{
   if(active!==m||m.recorded)return;
   m.minute=clamp(e.target.value,0,90);
   if(m.minute>=90)m.playing=false;
   update(m);
  };
  $('viewerComplete').onclick=()=>{
   if(active!==m||m.recorded)return;
   if(m.minute<90){m.playing=false;m.minute=90;if(raf){cancelAnimationFrame(raf);raf=0};update(m);return}
   m.recorded=true;const result=m.result;
   stop();finish({...data,result});
  };
  update(m);return m;
 }
 root.FXI_VIEWER={mountQuick,mount:mountQuick,unmount:stop};
 if(typeof module!=='undefined'&&module.exports)module.exports={mountQuick,unmount:stop};
})(typeof window!=='undefined'?window:globalThis);
