/* PokeFC tactical match board.
   QUICK = schematic playback of Quick Sim's precomputed result.
   ENGINE = actual TacticMesh player, ball, event and match-result snapshots.
   Engine results are committed ONLY after a complete official report. */
(()=>{'use strict';
let active=null,raf=0,previous=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
const pitch={x:61,y:40,w:928,h:595};
const point=(x,y)=>[pitch.x+pitch.w*x/105,pitch.y+pitch.h*y/68];
function field(ctx,engine){
 ctx.fillStyle='#062c26';ctx.fillRect(0,0,1050,680);
 const [x,y]=point(0,0);ctx.fillStyle='#116448';ctx.fillRect(x,y,pitch.w,pitch.h);
 ctx.fillStyle='rgba(255,255,255,.034)';for(let i=0;i<10;i++)if(i%2)ctx.fillRect(x+i*pitch.w/10,y,pitch.w/10,pitch.h);
 ctx.strokeStyle='rgba(233,255,242,.8)';ctx.lineWidth=2.2;ctx.strokeRect(x,y,pitch.w,pitch.h);
 let [mx,my]=point(52.5,34);ctx.beginPath();ctx.moveTo(mx,pitch.y);ctx.lineTo(mx,pitch.y+pitch.h);ctx.stroke();ctx.beginPath();ctx.arc(mx,my,76,0,7);ctx.stroke();
 for(const side of [0,105]){const dir=side===0?1:-1;let [px,py]=point(side,34);const [r1,r2]=point(side+dir*16.5,13.84);ctx.strokeRect(Math.min(px,r1),r2,Math.abs(r1-px),pitch.h*(40.32/68));const [s1,s2]=point(side+dir*5.5,24.84);ctx.strokeRect(Math.min(px,s1),s2,Math.abs(s1-px),pitch.h*(18.32/68));let [six]=point(side+dir*11,34);ctx.beginPath();ctx.arc(six,py,3,0,7);ctx.fillStyle='#effcf6';ctx.fill()}
 ctx.fillStyle='#a6d0c2';ctx.fillRect(pitch.x-8,pitch.y+pitch.h*.45,8,pitch.h*.10);ctx.fillRect(pitch.x+pitch.w,pitch.y+pitch.h*.45,8,pitch.h*.10);
 ctx.font='600 15px system-ui';ctx.fillStyle='rgba(231,255,240,.65)';ctx.textAlign='center';ctx.fillText(engine?'PokeFC · TACTICMESH ENGINE':'PokeFC · QUICK SIM SCHEMATIC',525,25);
}
function formation(team,side,t){let counts={GK:0,DEF:0,MID:0,FWD:0};
 const rows={GK:[5,34],DEF:[25,[12,27,41,56]],MID:[45,[17,34,51]],FWD:[70,[16,34,52]]};
 return team.lineup.map((p,i)=>{let n=counts[p.pos]++;let [ax,ys]=rows[p.pos]||rows.MID;let ay=typeof ys==='number'?ys:(ys[n]??34);
 if(side===1)ax=105-ax;let h=hash(p.id+':'+side),phase=h%628/100;
 return {p,i,x:clamp(ax+(t?Math.sin(t*.17+phase)*2.5:0),2.2,102.8),y:clamp(ay+(t?Math.sin(t*.13+phase*1.7)*2.7:0),3,65)};});}
function marker(ctx,item,side){const [x,y]=point(item.x,item.y),r=14;ctx.beginPath();ctx.arc(x,y,r+2,0,7);ctx.fillStyle='#102523';ctx.fill();ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fillStyle=side?'#83d8f7':'#eed07c';ctx.fill();ctx.strokeStyle='#14352e';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#112722';ctx.textAlign='center';ctx.font='800 12px system-ui';ctx.fillText(String(item.i+1),x,y+4);ctx.font='600 10px system-ui';ctx.fillStyle='#f7fff9';ctx.lineWidth=3;ctx.strokeStyle='#003326';ctx.strokeText(item.p.species.slice(0,11),x,y-20);ctx.fillText(item.p.species.slice(0,11),x,y-20)}
function ballQuick(m){const g=m.result.events.filter(e=>e.type==='goal').sort((a,b)=>a.minute-b.minute),near=g.find(e=>Math.abs(e.minute-m.minute)<2.4);
 const control=near?(String(near.team)===String(m.home.id)?0:1):Math.floor(m.minute/7)%2;
 let x=control===0?52+18*Math.sin(m.minute*.27):53-18*Math.sin(m.minute*.27),y=34+15*Math.sin(m.minute*.42);
 if(near){const d=clamp((m.minute-near.minute+2.4)/4.8,0,1);x=control===0?74+d*30:31-d*30;y=34+Math.sin(m.minute*.7)*12}return {x:clamp(x,2,103),y:clamp(y,3,65)};
}
function paint(m){const ctx=m.ctx;ctx.clearRect(0,0,1050,680);field(ctx,m.mode==='tm');
 if(m.mode==='tm'&&m.tmFinished&&m.result.origin==='hybrid'){ctx.fillStyle='#062c26';ctx.fillRect(0,0,1050,39);ctx.fillStyle='#f8df8d';ctx.font='700 15px system-ui';ctx.textAlign='center';ctx.fillText('PHYSICS PAUSED AT '+Math.floor(m.result.handoff.minute)+'′ · FINAL SCORE FROM QUICK SIM',525,25)}
 const t=m.mode==='tm'?0:m.minute,h=formation(m.home,0,t),a=formation(m.away,1,t);
 let ball=m.mode==='tm'?{x:52.5,y:34}:ballQuick(m);
 if(m.mode==='tm'&&m.tmSnapshot){const ids=new Map((m.tmSnapshot.players||[]).map(p=>[String(p.id),p]));
  for(const item of [...h,...a]){const p=ids.get(String(item.p.id));if(p?.position&&Number.isFinite(p.position.x)&&Number.isFinite(p.position.y)){item.x=clamp(p.position.x,0,105);item.y=clamp(p.position.y,0,68)}}
  if(m.tmSnapshot.ball&&Number.isFinite(m.tmSnapshot.ball.x)){ball={x:clamp(m.tmSnapshot.ball.x,0,105),y:clamp(m.tmSnapshot.ball.y,0,68)}}
 }
 for(const p of h)marker(ctx,p,0);for(const p of a)marker(ctx,p,1);
 const [bx,by]=point(ball.x,ball.y);ctx.beginPath();ctx.arc(bx,by,8.7,0,7);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#1b3931';ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(bx,by,2.5,0,7);ctx.fillStyle='#1e2c2c';ctx.fill();
}
function statRows(m){const a=m.result.stats[0],b=m.result.stats[1];const f=(v,s='')=>v==null?'—':v+s;return [['Possession',f(a.possession,'%'),f(b.possession,'%')],['Shots',f(a.shots),f(b.shots)],['Shots on target',f(a.shotsOnTarget),f(b.shotsOnTarget)],['Passes',f(a.passes),f(b.passes)],['Completed passes',f(a.completedPasses),f(b.completedPasses)],['Tackle attempts',f(a.tackleAttempts),f(b.tackleAttempts)],['Tackles won',f(a.tackles),f(b.tackles)],['Goals',f(a.goals),f(b.goals)]].map(([label,h,w])=>`<div class="viewer-stat"><span>${h}</span><small>${label}</small><span>${w}</span></div>`).join('')}
function eventMarkup(m){const events=m.mode==='tm'&&!m.tmFinished?m.tmEvents.filter(x=>x.minute<=m.minute+.01):m.result.events.filter(x=>x.minute<=m.minute);
 let arr=events.map(e=>{const min=e.minuteLabel||Math.floor(e.minute);let label=e.type.toUpperCase(),details='';if(e.type==='goal'){details=` · ${esc(String(e.team)===String(m.home.id)?m.home.city:m.away.city)} · ${esc(m.lookup[e.player]?.species||'Pokémon')}`;if(e.assist)details+=` (assist: ${esc(m.lookup[e.assist]?.species||'Pokémon')})`}
 else if(e.type==='card')details=` · ${esc(e.card||'card')} · ${esc(m.lookup[e.player]?.species||'Pokémon')}`;
 else if(e.type==='foul')details=` · ${esc(m.lookup[e.player]?.species||'Pokémon')}`;
 return `<p><strong>${esc(min)}′ ${esc(label)}</strong>${details}</p>`});
 if(m.mode!=='tm'){if(m.minute>=45)arr.push('<p>45′ Half-time</p>');if(m.minute>=90)arr.push('<p><strong>90′ Full-time</strong></p>')}
 else if(m.tmFinished)arr.push('<p><strong>FULL-TIME · '+(m.result.origin==='hybrid'?'TacticMesh + Quick Sim':'Official TacticMesh')+' result</strong></p>');
 return '<p>Kick-off · 0′</p>'+arr.slice(-65).join('');}
function update(m){if(m!==active)return;
 const es=m.el;
 let score,minute=m.minute;
 if(m.mode==='tm'){score=m.tmFinished?{home:m.result.score[0],away:m.result.score[1]}:(m.tmSnapshot?.score||{home:0,away:0});minute=m.tmFinished?90:Number(m.tmSnapshot?.elapsedSeconds||0)/60;m.minute=minute}
 else {const goals=m.result.events.filter(e=>e.type==='goal'&&e.minute<=minute);score={home:goals.filter(e=>String(e.team)===String(m.home.id)).length,away:goals.filter(e=>String(e.team)===String(m.away.id)).length}}
 es('liveScore').textContent=score.home+' – '+score.away;
 const mm=Math.floor(minute),ss=Math.floor((minute-mm)*60);es('liveClock').textContent=String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');
 const seek=es('viewerSeek');if(m.mode!=='tm')seek.value=minute;
 es('viewerEvents').innerHTML=eventMarkup(m);
 es('viewerStats').innerHTML=m.mode==='tm'&&!m.tmFinished?'<p class="muted tiny">Genuine engine statistics appear at the final whistle. Shots on target are unavailable in TacticMesh’s validated report.</p>':statRows(m);
 es('viewerPlay').textContent=m.running?'Ⅱ Pause':'▶ Play';
 es('viewerComplete').textContent=m.mode==='tm'?(m.tmFinished?'✓ Record result & finish week':m.finishing?'Completing match…':'⚡ Finish with Quick Sim'):(minute<90?'⚡ Skip to full-time & finish week':'✓ Record result & finish week');
 es('viewerComplete').disabled=m.mode==='tm'&&(!m.tmReady||m.finishing);
 const full=es('viewerTMFull');if(full){full.hidden=m.mode!=='tm'||m.tmFinished;full.disabled=!m.tmReady||m.finishing;full.textContent=m.finishing&&m.fullEngineRun?'Running complete TacticMesh match…':'Complete with full TacticMesh (slower)'}
 es('viewerPlay').disabled=m.mode==='tm'&&(!m.tmReady||m.tmFinished||m.finishing);
 const selector=es('viewerMode');if(selector){selector.disabled=m.mode==='tm'&&(minute>0||m.tmFinished||m.finishing);selector.title=selector.disabled?'Use Finish with Quick Sim to switch after kick-off':'Choose the starting match mode';}
 paint(m);
}
function frame(ms){raf=0;if(!active||!active.running||active.mode==='tm')return;let dt=Math.min(.2,(ms-previous)/1000||0);previous=ms;active.minute=clamp(active.minute+dt*active.speed,0,90);if(active.minute>=90)active.running=false;update(active);if(active.running)raf=requestAnimationFrame(frame)}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0;previous=0;if(active?.controller)active.controller.close();if(active)active.running=false;active=null}
function newBoard(data,finish,mode){stop();const canvas=document.getElementById('tacticalPitch');if(!canvas)return null;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 const lookup={};[...data.home.lineup,...data.away.lineup].forEach(p=>lookup[p.id]=p);
 const m=active={...data,ctx,canvas,lookup,mode,minute:0,speed:4,running:false,tmFinished:false,tmReady:false,tmEvents:[],tmSnapshot:null,tmPerf:null,result:data.result,finishing:false,fullEngineRun:false,el:id=>document.getElementById(id)};
 const e=m.el,seek=e('viewerSeek');seek.disabled=mode==='tm';seek.title=mode==='tm'?'Scrubbing is not possible during a live physics simulation':'Seek Quick Sim preview';
 e('viewerPlay').onclick=()=>{
  if(m!==active)return;
  if(mode==='tm'){if(!m.tmReady||m.tmFinished||m.finishing)return;m.running=!m.running;if(m.running)m.controller.play(m.speed);else m.controller.pause()}
  else {if(m.minute>=90)m.minute=0;m.running=!m.running;if(m.running){previous=performance.now();if(!raf)raf=requestAnimationFrame(frame)}else if(raf){cancelAnimationFrame(raf);raf=0}}
  update(m)};
 e('viewerReset').onclick=()=>{if(m!==active)return;if(mode==='tm'){mountEngine(data,finish)}else{m.minute=0;m.running=false;if(raf){cancelAnimationFrame(raf);raf=0}update(m)}};
 e('viewerSpeed').value='4';e('viewerSpeed').onchange=event=>{m.speed=Number(event.target.value)||4;if(m.mode==='tm'&&m.running)m.controller.speed(m.speed)};
 seek.oninput=event=>{if(m!==active||mode==='tm')return;m.minute=clamp(Number(event.target.value),0,90);if(m.minute>=90)m.running=false;update(m)};
 e('viewerComplete').onclick=()=>{if(m!==active)return;
  if(mode==='tm'){
   if(!m.tmReady||m.finishing)return;
   if(!m.tmFinished){
    // The switch is one-way: a statistical result has no reconstructible
    // TacticMesh physics state to return to.
    if(typeof confirm==='function'&&!confirm('Finish the remaining match using Quick Sim? The existing score, goals and match statistics will be preserved. You cannot resume physics after switching.'))return;
    m.running=false;m.finishing=true;m.fullEngineRun=false;
    m.controller.handoff();update(m);return;
   }
   const completed={...data,result:m.result};stop();finish(completed);
  }else {stop();finish(data)};
 };
 const full=e('viewerTMFull');if(full){full.hidden=mode!=='tm';full.onclick=()=>{
  if(m!==active||mode!=='tm'||!m.tmReady||m.tmFinished||m.finishing)return;
  m.running=false;m.finishing=true;m.fullEngineRun=true;m.controller.finish();update(m);
 }}
 if(mode==='tm'){e('viewerPlay').disabled=true;e('viewerReset').disabled=false;e('viewerComplete').disabled=true}else e('viewerPlay').disabled=false;
 update(m);return m;
}
function mountQuick(data,finish){const m=newBoard(data,finish,'quick');const el=document.getElementById('engineInstallStatus');if(el)el.textContent='Quick Sim schematic: precomputed result; movements are illustrative.';return m}
function mountEngine(data,finish){const m=newBoard(data,finish,'tm');if(!m)return;
 const el=document.getElementById('engineInstallStatus');if(el)el.textContent='Loading the genuine local TacticMesh match engine…';
 try{m.controller=window.FXI_TM.connect(data,{
  ready:s=>{if(m!==active)return;m.tmReady=true;m.tmSnapshot=s;m.el('viewerPlay').disabled=false;if(el)el.textContent='TacticMesh ready. The pitch now displays real simulation positions and ball motion.';update(m)},
  snapshot:(s,ev)=>{if(m!==active)return;m.tmSnapshot=s;if(ev?.length)m.tmEvents.push(...ev);update(m)},
  performance:metrics=>{if(m!==active)return;m.tmPerf=metrics;const factor=metrics?.realTimeFactor;
    if(el&&Number.isFinite(factor))el.textContent=(m.finishing?'Completing full 90-minute TacticMesh match':'Live TacticMesh physics')+' · measured '+factor.toFixed(1)+'× real-time speed ('+metrics.ticksPerSecond+' ticks/s). Speed is limited by local CPU.';},
  handoff:(partial,s)=>{if(m!==active)return;try{
    const result=window.FXI_HYBRID.finish(data,partial);
    m.tmSnapshot=s;m.result=result;m.tmFinished=true;m.finishing=false;m.running=false;
    if(el)el.textContent='Switched at '+partial.elapsedSeconds.toFixed(0)+'s. Actual TacticMesh events preserved; remaining minutes simulated instantly. Review result before recording.';
    update(m);
   }catch(err){m.finishing=false;m.tmReady=false;
    if(el)el.textContent='Quick Sim handoff could not be verified: '+err.message+' · Restart match to retry.';update(m)}},
  done:(result,report)=>{if(m!==active)return;m.result=result;m.tmFinished=true;m.finishing=false;m.running=false;m.tmReady=true;m.minute=Number(m.tmSnapshot?.elapsedSeconds||5400)/60;if(el)el.textContent='Full-time · TacticMesh official match report complete. Record it to advance the week.';update(m)},
  error:msg=>{if(m!==active)return;m.running=false;m.finishing=false;m.tmReady=false;m.el('viewerPlay').disabled=true;m.el('viewerComplete').disabled=true;if(el)el.textContent='TacticMesh error: '+msg;update(m)}
 })}catch(err){if(el)el.textContent='Could not connect local TacticMesh: '+err.message}
 return m;
}
function missing(){stop();const e=id=>document.getElementById(id);const note=e('engineInstallStatus');if(note)note.innerHTML='The TacticMesh source is not installed locally yet. Run <code>python3 tacticmesh/install_engine.py</code> once, then refresh this page. Or select Quick Sim schematic above.';for(const id of ['viewerPlay','viewerComplete','viewerReset','viewerTMFull'])if(e(id))e(id).disabled=true;const canvas=e('tacticalPitch');if(canvas){const ctx=canvas.getContext('2d');field(ctx,true)}}
window.FXI_VIEWER={mount:mountQuick,mountQuick,mountEngine,missing,unmount:stop,renderSnapshot(s){if(!active||active.mode!=='tm')return false;active.tmSnapshot=s;update(active);return true}};
})();
