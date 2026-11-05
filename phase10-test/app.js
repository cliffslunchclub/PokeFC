(function () {
  'use strict';
  const quick=window.FXI_QUICK, director=window.PFC_MATCH_DIRECTOR;
  const byId=id=>document.getElementById(id);
  const canvas=byId('pitch'),ctx=canvas.getContext('2d');
  const width=canvas.width,height=canvas.height;
  const X=60,Y=50,W=width-120,H=height-100;
  const roles=['GK','DEF','DEF','DEF','DEF','MID','MID','MID','FWD','FWD','FWD'];
  const state={seed:'phase10-public-01',preview:null,result:null,plan:null,windowStart:0,
    currentMinute:0,running:false,windowFinished:false,lastFrame:null,highlightEvent:null};
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  function players(side){
    return roles.map((pos,i)=>{
      const quality=(i*7+(side==='home'?4:1))%18-9;
      const main={shortPassing:70+quality,firstTouch:68+quality,vision:69+quality,
        sprintSpeed:68+quality,tackling:68+quality,finishing:67+quality,interception:65+quality,
        awareness:66+quality,shooting:67+quality,composure:69+quality};
      const detail={positioning:69+quality,strength:71+quality,reflexes:70+quality,handling:70+quality,
        diving:70+quality,kicking:69+quality,decisionMaking:68+quality};
      return {id:side+'-'+(i+1),name:side==='home'?'Pewter '+(i+1):'Cerulean '+(i+1),pos,main,detail};
    });
  }
  function fixture(seed){
    return {seed,home:{id:'pewter',name:'Pewter City FC',tactic:'balanced',lineup:players('home')},
      away:{id:'cerulean',name:'Cerulean City FC',tactic:'balanced',lineup:players('away')}};
  }
  function setRunning(value){
    state.running=value;
    byId('watchBtn').disabled=value;
    byId('pauseBtn').disabled=!value;
    byId('status').textContent=value?'NOW WATCHING':state.currentMinute>=90?'FULL TIME':state.windowFinished?'CLIP FINISHED':'PAUSED / READY';
  }
  function makeMatch(seed){
    setRunning(false);state.lastFrame=null;state.seed=seed;
    state.preview=fixture(seed);
    state.result=quick.simulate(state.preview,{seed});
    state.plan=director.build(state.preview,state.result,{seed});
    director.validate(state.plan);
    state.windowStart=0;state.currentMinute=0;state.windowFinished=false;
    byId('windowSlider').value='0';
    byId('seed').value=seed;
    populateStats();
    const initial=state.plan.official.teams.reduce((s,t)=>s+t.shots,0);
    byId('verifyText').textContent='Verified: '+initial+' shot events, '+state.result.events.filter(e=>e.type==='goal').length+
      ' official goals. Identical seeded results whether watched, paused, replayed or skipped.';
    setRunning(false);drawFrame();updateText();
  }
  function positionFor(teamIndex,role,index) {
    const mirror=teamIndex===0?1:-1,inner=(x)=>teamIndex===0?x:100-x;
    if(role==='GK')return {x:inner(6),y:30};
    if(role==='DEF'){const y=[8,23,38,53][index-1];return {x:inner(23),y};}
    if(role==='MID'){const y=[12,30,48][index-5];return {x:inner(43),y};}
    const y=[13,30,47][index-8];return {x:inner(64),y};
  }
  const px=p=>({x:X+p.x/100*W,y:Y+p.y/60*H});
  function pitch() {
    ctx.clearRect(0,0,width,height);
    ctx.fillStyle='#0d382d';ctx.fillRect(0,0,width,height);
    ctx.fillStyle='#2f694d';ctx.fillRect(X,Y,W,H);
    for(let i=0;i<10;i++){ctx.fillStyle=i%2===0?'#43855d':'#397952';ctx.fillRect(X+i*W/10,Y,W/10,H);}
    ctx.strokeStyle='rgba(247,251,242,.66)';ctx.lineWidth=3;ctx.strokeRect(X,Y,W,H);
    ctx.beginPath();ctx.moveTo(X+W/2,Y);ctx.lineTo(X+W/2,Y+H);ctx.stroke();
    ctx.beginPath();ctx.arc(X+W/2,Y+H/2,83,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(X+W/2,Y+H/2,5,0,Math.PI*2);ctx.fillStyle='#e8f6eb';ctx.fill();
    ctx.strokeRect(X,Y+H*.18,W*.17,H*.64);ctx.strokeRect(X+W-W*.17,Y+H*.18,W*.17,H*.64);
    ctx.strokeRect(X,Y+H*.34,W*.06,H*.32);ctx.strokeRect(X+W-W*.06,Y+H*.34,W*.06,H*.32);
    ctx.strokeRect(X-17,Y+H*.435,17,H*.13);ctx.strokeRect(X+W,Y+H*.435,17,H*.13);
    ctx.fillStyle='rgba(255,255,255,.17)';ctx.font='800 12px system-ui';ctx.fillText('PEWTER',X+14,Y+H-16);
    ctx.textAlign='right';ctx.fillText('CERULEAN',X+W-14,Y+H-16);ctx.textAlign='left';
  }
  function scriptedEvent(minute){
    if(!state.plan)return null;
    const shots=state.plan.events;
    let best=null,bestDistance=Infinity;
    for(const e of shots){
      const d=minute-e.minute;
      if(d>=-.42&&d<=.22&&Math.abs(d)<bestDistance){best=e;bestDistance=Math.abs(d);}
    }
    return best;
  }
  function playerPositions(minute,event){
    const sides=[state.preview.home,state.preview.away],positions=[];
    for(let side=0;side<2;side++)for(let i=0;i<11;i++){
      const player=sides[side].lineup[i],base=positionFor(side,player.pos,i);
      const x=base.x+Math.sin(minute*.9+i*1.6+side)*1.1;
      const y=base.y+Math.cos(minute*1.1+i*1.2+side)*.85;
      positions.push({id:String(player.id),teamId:sides[side].id,side,index:i,pos:player.pos,
        x:clamp(x,2,98),y:clamp(y,3,57),number:i+1});
    }
    if(event){
      const shooter=positions.find(p=>p.id===event.playerId),side=event.teamId===sides[0].id?0:1;
      if(shooter){shooter.x=side===0?82:18;shooter.y=30+Math.sin(event.minute*3)*9;}
      const goalkeeper=positions.find(p=>p.id===event.goalkeeperId);
      if(goalkeeper&&event.outcome==='saved'&&minute>=event.minute-.06)goalkeeper.y=(shooter?shooter.y:30)*.6+30*.4;
    }
    return positions;
  }
  function ballState(minute,event,positions) {
    if(!event){
      const g=Math.sin(minute*1.65)*30;
      return {x:50+g,y:30+Math.sin(minute*3.7)*12};
    }
    const shooter=positions.find(p=>p.id===event.playerId);
    if(!shooter)return {x:50,y:30};
    const side=event.teamId===state.preview.home.id?0:1;
    const shotGoal={x:side===0?99:1,y:event.outcome==='off-target'?(shooter.y<30?0:60):30};
    const passer={x:side===0?56:44,y:29};
    const time=event.minute-minute;
    if(time>=.10){const t=clamp((.42-time)/.32,0,1);return {x:passer.x+(shooter.x-passer.x)*t,y:passer.y+(shooter.y-passer.y)*t};}
    if(time>0){const t=clamp((.10-time)/.10,0,1);return {x:shooter.x+(shotGoal.x-shooter.x)*t,y:shooter.y+(shotGoal.y-shooter.y)*t};}
    return shotGoal;
  }
  function drawFrame(){
    if(!state.plan)return;
    const minute=state.currentMinute;pitch();
    const event=scriptedEvent(minute),locations=playerPositions(minute,event),ball=ballState(minute,event,locations);
    for(const p of locations){
      const at=px(p);const home=p.side===0;const isShooter=!!event&&event.playerId===p.id;
      ctx.beginPath();ctx.arc(at.x,at.y,isShooter?17:14,0,Math.PI*2);
      ctx.fillStyle=home?'#e7e46f':'#4baff3';ctx.fill();
      ctx.lineWidth=isShooter?4:2;ctx.strokeStyle=home?'#27312c':'#153250';ctx.stroke();
      ctx.fillStyle=home?'#1b2835':'#e9f6ff';ctx.font='900 13px system-ui';
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(p.number),at.x,at.y+1);
    }
    const at=px(ball);ctx.beginPath();ctx.arc(at.x+1,at.y+2,8,0,Math.PI*2);
    ctx.fillStyle='#0005';ctx.fill();ctx.beginPath();ctx.arc(at.x,at.y,7,0,Math.PI*2);
    ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#111a21';ctx.lineWidth=2;ctx.stroke();
    ctx.textAlign='left';ctx.textBaseline='alphabetic';
    const toast=byId('eventToast');
    if(event && minute>=event.minute && minute<=event.minute+.21){
      const club=event.teamId===state.preview.home.id?'PEWTER':'CERULEAN';
      toast.textContent=(event.outcome==='goal'?'⚽ GOAL! ':event.outcome==='saved'?'🧤 SAVED! ':'↗ OFF TARGET · ')+club+' · '+Math.floor(event.minute+1)+"′";
      toast.hidden=false;
    }else toast.hidden=true;
  }
  function populateStats(){
    const stats=state.result.stats;const specs=[
      {name:'GOALS',key:'goals',format:x=>x},
      {name:'SHOTS',key:'shots',format:x=>x},
      {name:'ON TARGET',key:'shotsOnTarget',format:x=>x},
      {name:'PASSES',key:'passes',format:x=>x},
      {name:'PASS ACCURACY',value:(i)=>Math.round(100*stats[i].completedPasses/Math.max(1,stats[i].passes)),format:x=>x+'%'},
      {name:'TACKLES WON',key:'tackles',format:x=>x},
      {name:'POSSESSION',key:'possession',format:x=>x+'%'}
    ];
    byId('statsRows').replaceChildren();
    for(const spec of specs){
      const a=spec.value?spec.value(0):stats[0][spec.key],b=spec.value?spec.value(1):stats[1][spec.key];
      const weight=a+b?100*a/(a+b):50;
      const row=document.createElement('div');row.className='statrow';
      const left=document.createElement('span');left.className='value';left.textContent=spec.format(a);
      const middle=document.createElement('div');
      const text=document.createElement('div');text.className='title';text.textContent=spec.name;
      const bar=document.createElement('div');bar.className='track';
      const homebar=document.createElement('span');homebar.className='homebar';homebar.style.width=weight+'%';
      const awaybar=document.createElement('span');awaybar.className='awaybar';
      bar.append(homebar,awaybar);middle.append(text,bar);
      const right=document.createElement('span');right.className='value';right.textContent=spec.format(b);
      row.append(left,middle,right);byId('statsRows').append(row);
    }
  }
  function updateEventLog(){
    const events=director.eventsBetween(state.plan,state.windowStart,state.windowStart+5);
    byId('eventCount').textContent=events.length+' shot'+(events.length===1?'':'s');
    const target=byId('eventLog');target.replaceChildren();
    if(events.length===0){const p=document.createElement('p');p.className='empty';p.textContent='No shots in this five-minute window. Advance to another period or generate a new match.';target.append(p);return;}
    for(const e of events){
      const club=e.teamId===state.preview.home.id?'Pewter City':'Cerulean City';
      const row=document.createElement('div');row.className='eventitem';
      const t=document.createElement('span');t.className='eventtime';t.textContent=Math.floor(e.minute+1)+"′";
      const info=document.createElement('div');info.className='eventinfo';
      const strong=document.createElement('strong');strong.textContent=e.outcome==='goal'?'Goal — '+club:e.outcome==='saved'?'Saved shot — '+club:'Missed shot — '+club;
      const small=document.createElement('small');small.textContent='Shooter: #'+e.playerId.split('-').pop()+
        (e.assistId?' · Assist #'+e.assistId.split('-').pop():'')+
        (e.source==='official-quick-sim-goal'?' · Official':' · Reconstructed');
      info.append(strong,small);
      const icon=document.createElement('span');icon.className='ballIcon';icon.textContent=e.outcome==='goal'?'⚽':e.outcome==='saved'?'🧤':'↗';
      row.append(t,info,icon);target.append(row);
    }
  }
  function updateText(){
    if(!state.plan)return;
    const min=state.currentMinute,minutes=Math.floor(min),seconds=Math.floor((min-minutes)*60);
    byId('clock').textContent=String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0');
    const s=director.scoreAt(state.plan,min);
    byId('score').innerHTML=s[0]+' <span>:</span> '+s[1];
    byId('rangeLabel').textContent='MINUTES '+state.windowStart+'–'+(state.windowStart+5);
    byId('progressLabel').textContent=Math.round(clamp((min-state.windowStart)/5,0,1)*100)+'% watched';
  }
  function setWindow(start){
    setRunning(false);state.windowFinished=false;state.lastFrame=null;
    state.windowStart=clamp(Number(start)||0,0,85);
    state.currentMinute=state.windowStart;byId('windowSlider').value=String(state.windowStart);
    updateEventLog();updateText();drawFrame();
  }
  function tick(time){
    if(state.running){
      if(state.lastFrame!==null){
        const sec=clamp((time-state.lastFrame)/1000,0,.10),speed=Number(byId('speedSelect').value)||1;
        state.currentMinute=Math.min(state.windowStart+5,state.currentMinute+sec*(5/25)*speed);
        if(state.currentMinute>=state.windowStart+5){
          state.windowFinished=true;setRunning(false);
        }
      }
      state.lastFrame=time;updateText();drawFrame();
    }
    requestAnimationFrame(tick);
  }
  byId('watchBtn').addEventListener('click',()=>{
    if(state.currentMinute>=state.windowStart+5||state.currentMinute>=90)state.currentMinute=state.windowStart;
    state.windowFinished=false;state.lastFrame=null;setRunning(true);drawFrame();updateText();
  });
  byId('pauseBtn').addEventListener('click',()=>{setRunning(false);state.lastFrame=null;drawFrame();updateText();});
  byId('restartBtn').addEventListener('click',()=>setWindow(state.windowStart));
  byId('skipBtn').addEventListener('click',()=>{
    setRunning(false);state.currentMinute=90;state.windowFinished=true;state.lastFrame=null;
    byId('status').textContent='FULL TIME · VERIFIED';drawFrame();updateText();
  });
  byId('windowSlider').addEventListener('input',event=>setWindow(Number(event.target.value)));
  byId('prevBtn').addEventListener('click',()=>setWindow(state.windowStart-5));
  byId('nextBtn').addEventListener('click',()=>setWindow(state.windowStart+5));
  byId('newMatchBtn').addEventListener('click',()=>{
    const seed=byId('seed').value.trim().slice(0,40);
    if(!seed){byId('seed').focus();return;}
    try{makeMatch(seed);setWindow(0);}catch(err){byId('verifyText').textContent='Could not build match: '+err.message;}
  });
  try{
    if(!quick||!director)throw Error('Required match modules could not load');
    makeMatch(state.seed);setWindow(0);requestAnimationFrame(tick);
  }catch(err){
    console.error(err);byId('verifyText').textContent='Match could not start: '+err.message;
    byId('watchBtn').disabled=true;
  }
})();