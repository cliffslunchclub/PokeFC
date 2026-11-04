'use strict';
/* PokeFC · The Pitch — independent HTML Canvas soccer prototype.
   All match physics, AI, camera, and drawing are original to this project.
   No source from Open Soccer / Modelence is included. */
(() => {
  const FIELD={w:1200,h:720,goalTop:302,goalBottom:418};
  const $a = id => document.getElementById(id);
  const cap=(v,a,b)=>Math.max(a,Math.min(b,v));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const smooth=(a,b,t)=>a+(b-a)*t;
  const colors={home:'#daf477',away:'#efaf88',line:'#d7f3d0'};
  const MINUTE_PER_REAL_SECOND=0.83; // ~108 seconds real time per 90-minute match.
  let active=null;
  let enabled=false;
  let bound=false;
  let touchStick={x:0,y:0};
  const keys=new Set();
  const charging={key:null,start:0};
  let actionTouch=null;

  function makeSide(isHome,monIds){
    const formation=FORMATIONS[state.formation];
    return formation.map(([role,lat,depth],index)=>{
      const mon=byId(monIds[index]||sample[index])||POKEMON[index+1];
      const x=80+(100-depth)/100*1040;
      return {isHome,index,role,mon,x:isHome?x:FIELD.w-x,y:70+lat/100*580,
        anchorX:isHome?x:FIELD.w-x,anchorY:70+lat/100*580,
        vx:0,vy:0,angle:isHome?0:Math.PI,anim:0,hasBall:false,
        atkTimer:0,pace:mon.pace,shot:mon.shot,pass:mon.pass,dribble:mon.pass,def:mon.defense,phy:mon.physical,keeper:mon.keeper};
    });
  }
  function opponentSquad(rating){
    const used=new Set();
    return FORMATIONS[state.formation].map(([role],i)=>{
      let pool=POKEMON.filter(p=>!used.has(p.id) && Math.abs(fit(p,role)-rating)<19);
      if(pool.length<2)pool=POKEMON.filter(p=>!used.has(p.id));
      pool.sort((a,b)=>Math.abs(fit(a,role)-rating)-Math.abs(fit(b,role)-rating));
      const chosen=pool[Math.floor(Math.random()*Math.min(13,pool.length))];
      used.add(chosen.id);return chosen.id;
    });
  }
  class Match{
    constructor(rival){
      this.canvas=$a('arcadeCanvas');this.ctx=this.canvas.getContext('2d');this.rival=rival;
      this.squadSig=state.formation+'|'+state.lineup.join(',')+'|'+state.name;
      this.home=makeSide(true,state.lineup);
      this.away=makeSide(false,opponentSquad(rival.rating));
      this.players=[...this.home,...this.away];
      this.name=state.name||'Indigo Athletic';
      this.elapsed=0;this.homeScore=0;this.awayScore=0;
      this.homeShots=0;this.awayShots=0;this.homePasses=0;
      this.events=[];this.ball={x:600,y:360,vx:0,vy:0,owner:null,lock:0,shotBy:null,lastTouch:null};
      this.player=this.home[9];this.cameraX=600;this.lastTime=0;this.lastUI=0;
      this.isRunning=false;this.isFullTime=false;this.stoppage=0;this.message='';this.messageTimer=0;
      this.flash=0;this.kickCharge=0;this.autoswitchAt=0;this.lastDrawW=0;
      this.particles=[];this.goalkeeperAttempts=new Set();
      this.resetPositions(true);this.resize();this.draw();this.updateHUD();
    }
    resize(){
      if(!this.canvas)return;
      const bounds=this.canvas.getBoundingClientRect();
      const w=Math.max(300,bounds.width),h=Math.max(180,bounds.height);
      const dpr=Math.min(devicePixelRatio||1,2);
      if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){
        this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);
      }
      this.w=w;this.h=h;this.dpr=dpr;
      this.scale=Math.min(w/930,h/575);
      this.sx=this.scale*1.13;
      this.sy=this.scale*.70;
    }
    resetPositions(homeKick){
      this.players.forEach(p=>{p.x=p.anchorX;p.y=p.anchorY;p.vx=0;p.vy=0;p.hasBall=false;});
      const team=homeKick?this.home:this.away;
      const striker=team.find(p=>p.role==='ST')||team[9];
      striker.x=homeKick?588:612;striker.y=360;
      this.player=this.home.find(p=>p.role==='ST')||this.home[9];
      this.ball={x:homeKick?596:604,y:360,vx:0,vy:0,owner:striker,lock:.3,shotBy:null,lastTouch:striker};
      striker.hasBall=true;this.goalkeeperAttempts.clear();
    }
    announce(message,time=2.2){this.message=message;this.messageTimer=time;this.log(message);}
    log(message){this.events.unshift({min:Math.min(90,Math.floor(this.elapsed)),message});this.events=this.events.slice(0,9);
      const log=$a('arcadeEvents');if(log)log.innerHTML=this.events.slice(0,5).map(e=>`<div class="arcade-event"><b>${String(e.min).padStart(2,'0')}'</b><span>${escapeHTML(e.message)}</span></div>`).join('');}
    start(){if(this.isFullTime)return;this.isRunning=true;this.lastTime=performance.now();this.announce(this.elapsed?'Back underway!':'Kickoff! The crowd is ready.');this.loop(this.lastTime);}
    pause(){this.isRunning=false;$a('arcadeStartBtn').textContent=this.isFullTime?'Full time':'Resume match';this.updateHUD();this.draw();}
    restart(){this.pause();const repl=new Match(this.rival);active=repl;repl.start();}
    loop(now){if(!this.isRunning)return;const dt=cap((now-this.lastTime)/1000,0,.033);this.lastTime=now;
      if(dt>0)this.update(dt);this.draw();if(now-this.lastUI>125){this.updateHUD();this.lastUI=now;}
      if(this.isRunning)requestAnimationFrame(t=>{if(active===this)this.loop(t)});
    }
    updateHUD(){
      $a('arcadeHome').textContent=this.name;$a('arcadeAway').textContent=this.rival.name;
      $a('arcadeHomeScore').textContent=this.homeScore;$a('arcadeAwayScore').textContent=this.awayScore;
      const m=cap(Math.floor(this.elapsed),0,90);$a('arcadeClock').textContent=`${String(m).padStart(2,'0')}:00`;
      $a('arcadePlayerName').textContent=this.player.mon.name;
      $a('arcadePlayerRole').textContent=this.player.role;
      $a('arcadePlayerStat').textContent=`PAC ${this.player.pace}   SHO ${this.player.shot}   PAS ${this.player.pass}`;
      $a('arcadeStatShots').textContent=`${this.homeShots} – ${this.awayShots}`;
      $a('arcadeStatPasses').textContent=String(this.homePasses);
      $a('arcadeStatus').textContent=this.isFullTime?'FULL TIME':this.isRunning?'LIVE':'PAUSED';
      $a('arcadeStartBtn').textContent=this.isFullTime?'Match finished':this.isRunning?'Pause match':this.elapsed?'Resume match':'Kick off';
      $a('arcadeStartBtn').disabled=this.isFullTime;
      $a('arcadeChargeBar').style.width=`${this.kickCharge*100}%`;
      $a('arcadeChargeLabel').textContent=this.kickCharge>0?'CHARGING KICK':'READY';
    }
    update(dt){
      if(this.stoppage>0){this.stoppage-=dt;if(this.stoppage<=0)this.resetPositions(this.nextKickHome);return;}
      this.elapsed+=dt*MINUTE_PER_REAL_SECOND;
      if(this.elapsed>=90){this.elapsed=90;this.isFullTime=true;this.isRunning=false;this.announce('FULL TIME! Final whistle.');return;}
      if(this.messageTimer>0)this.messageTimer-=dt;
      this.flash=Math.max(0,this.flash-dt*2);
      this.ball.lock=Math.max(0,this.ball.lock-dt);
      if(this.ball.owner&&this.ball.owner.isHome)this.player=this.ball.owner;
      else if(this.elapsed>=this.autoswitchAt){
        const nearest=this.home.slice(1).sort((a,b)=>distance(a,this.ball)-distance(b,this.ball))[0];
        if(nearest)this.player=nearest;this.autoswitchAt=this.elapsed+1.5*MINUTE_PER_REAL_SECOND;
      }
      this.tickPlayers(dt);this.tickBall(dt);
      this.cameraX=smooth(this.cameraX,cap(this.ball.x,410,790),Math.min(1,dt*3.5));
      if(charging.key)this.kickCharge=cap((performance.now()-charging.start)/780,0,1);
    }
    movementDir(){let x=0,y=0;if(keys.has('ArrowLeft'))x--;if(keys.has('ArrowRight'))x++;if(keys.has('ArrowUp'))y--;if(keys.has('ArrowDown'))y++;x+=touchStick.x;y+=touchStick.y;
      const l=Math.hypot(x,y);return l>1?{x:x/l,y:y/l}:{x,y};}
    tickPlayers(dt){
      const owner=this.ball.owner;
      for(const p of this.players){
        let tx=0,ty=0;
        if(p===this.player){const d=this.movementDir();tx=d.x;ty=d.y;
          if(!d.x&&!d.y&&!p.hasBall){const b=this.ball;const dist=distance(p,b);if(dist<110 && keys.has('KeyC')){tx=(b.x-p.x)/(dist||1);ty=(b.y-p.y)/(dist||1)}}
        }else if(p.role==='GK'){
          if(p.hasBall){p.atkTimer-=dt;if(p.atkTimer<=0){this.kick(p,'pass',.55);p.atkTimer=1.5;}}
          const ownX=p.isHome?58:FIELD.w-58;
          const targetY=cap(this.ball.y,FIELD.goalTop+15,FIELD.goalBottom-15);
          tx=cap((ownX-p.x)/28,-1,1);ty=cap((targetY-p.y)/36,-1,1);
        }else if(owner===p){
          const targetX=p.isHome?FIELD.w-42:42;
          const deltaY=360-p.y;
          tx=(targetX-p.x)/900;ty=deltaY/430;
          const md=Math.hypot(tx,ty);tx/=md||1;ty/=md||1;
        }else {
          const chasing=(owner&&owner.isHome!==p.isHome) || !owner;
          const targetBall=chasing?owner||this.ball:this.ball;
          const isDefending=p.isHome?!owner || !owner.isHome:!owner || owner.isHome;
          const team=p.isHome?this.home:this.away;
          const candidate=team.filter(k=>k.role!=='GK'&&k!==this.player).slice().sort((a,b)=>distance(a,targetBall)-distance(b,targetBall))[0];
          const chase=isDefending && p===candidate;
          let goalX=p.anchorX,goalY=p.anchorY;
          if(chase){goalX=targetBall.x;goalY=targetBall.y;}
          else {
            const shift=cap((this.ball.x-600)*.21,-110,110);
            goalX=p.anchorX+shift;
            if(!isDefending&&p.role==='ST')goalX+=(p.isHome?1:-1)*65;
            goalY+=cap((this.ball.y-360)*.15,-60,60);
          }
          tx=cap((goalX-p.x)/60,-1,1);ty=cap((goalY-p.y)/60,-1,1);
          const dist=Math.hypot(tx,ty);if(dist>1){tx/=dist;ty/=dist}
          if(dist<.09){tx=0;ty=0}
        }
        const isSprint=p===this.player&&(keys.has('KeyE')||keys.has('ShiftLeft')||keys.has('ShiftRight'));
        const speed=(p===this.player?155:135)*(.75+p.pace/180)*(p.hasBall?.82:1)*(isSprint?1.5:1)*(p.role==='GK'?.84:1);
        p.vx=smooth(p.vx,tx*speed,Math.min(1,dt*(p===this.player?10:5.5)));
        p.vy=smooth(p.vy,ty*speed,Math.min(1,dt*(p===this.player?10:5.5)));
        p.x=cap(p.x+p.vx*dt,13,FIELD.w-13);p.y=cap(p.y+p.vy*dt,13,FIELD.h-13);
        if(Math.abs(p.vx)+Math.abs(p.vy)>10)p.angle=Math.atan2(p.vy,p.vx);
        p.anim+=dt*Math.hypot(p.vx,p.vy)/33;
      }
      this.applyTackles(dt);
      if(this.ball.owner&&this.ball.owner.isHome===false)this.awayDecisions(dt);
    }
    applyTackles(dt){const own=this.ball.owner;if(!own||this.ball.lock>0)return;
      const challengers=(own.isHome?this.away:this.home).filter(p=>p.role!=='GK'&&distance(p,own)<28);
      for(const p of challengers){const playerManual=p===this.player;
        const odds=playerManual?(keys.has('KeyC')?.9:.23):.6;
        if(Math.random()<dt*odds*(.7+p.def/90)){
          own.hasBall=false;this.ball.owner=p;this.ball.lastTouch=p;p.hasBall=true;this.ball.lock=.8;
          if(playerManual)this.announce(`${p.mon.name} wins possession!`,1.2);break;
        }
      }
    }
    awayDecisions(dt){const carrier=this.ball.owner;if(!carrier||carrier.isHome||carrier.role==='GK')return;
      carrier.atkTimer-=dt;if(carrier.atkTimer>0)return;
      carrier.atkTimer=.8+Math.random()*.9;
      if(carrier.x<315){this.kick(carrier,'shoot',.35+Math.random()*.6);return;}
      const near=this.home.filter(p=>distance(p,carrier)<115).length;
      if(near>0 && Math.random()<.8){this.kick(carrier,Math.random()<.25?'through':'pass',.2+Math.random()*.5);}
    }
    tickBall(dt){const b=this.ball;
      if(b.owner){b.x=b.owner.x+Math.cos(b.owner.angle)*13;b.y=b.owner.y+Math.sin(b.owner.angle)*13;return;}
      b.x+=b.vx*dt;b.y+=b.vy*dt;
      b.vx*=Math.exp(-dt*.65);b.vy*=Math.exp(-dt*.65);
      if(b.y<7||b.y>FIELD.h-7){b.y=cap(b.y,7,FIELD.h-7);b.vy*=-.45;}
      if(b.x>=FIELD.w-5||b.x<=5){
        if(b.y>FIELD.goalTop&&b.y<FIELD.goalBottom){
          const homeGoal=b.x>FIELD.w/2;this.goal(homeGoal);return;
        }
        this.restartAtEdge(b.x>FIELD.w/2);return;
      }
      // Goalkeeper reacts to approaching shots and ground balls near goal.
      for(const keeper of [this.home[0],this.away[0]]){
        if(distance(keeper,b)<42 && b.lock<.3){
          const shotSpeed=Math.hypot(b.vx,b.vy);
          const saveChance=cap(.42+keeper.keeper/250-shotSpeed/2100,.26,.9);
          if(!this.goalkeeperAttempts.has(keeper) && Math.random()<saveChance){
            this.goalkeeperAttempts.add(keeper);
            b.owner=keeper;keeper.hasBall=true;b.vx=0;b.vy=0;b.lock=1;
            keeper.atkTimer=1.3;this.announce(`${keeper.mon.name} makes the save!`,1.4);return;
          }
        }
      }
      if(b.lock>0)return;
      let closest=null,cd=Infinity;
      for(const p of this.players){const d=distance(p,b);if(d<cd){closest=p;cd=d}}
      if(closest&&cd<22){b.owner=closest;closest.hasBall=true;if(closest.role==='GK')closest.atkTimer=1.2;b.lastTouch=closest;b.vx=b.vy=0;b.lock=.35;this.goalkeeperAttempts.clear();}
    }
    goal(isHome){if(isHome)this.homeScore++;else this.awayScore++;
      const scorer=this.ball.shotBy;
      this.announce(`GOAL! ${scorer?scorer.mon.name:(isHome?this.name:this.rival.name)} scores!`,4.0);
      this.flash=1;this.stoppage=2.8;this.ball.owner=null;this.ball.vx=0;this.ball.vy=0;
      this.nextKickHome=!isHome;
      this.resetAfterGoal=true;
    }
    restartAtEdge(awaySide){
      this.ball.owner=null;this.ball.vx=0;this.ball.vy=0;this.ball.lock=0;
      const team=awaySide?this.away:this.home;
      const receiver=team[0];receiver.x=awaySide?FIELD.w-62:62;receiver.y=360;receiver.atkTimer=1;
      this.ball.owner=receiver;receiver.hasBall=true;this.ball.lastTouch=receiver;
      this.announce('Goal kick',1.1);
    }
    passTarget(p,through){const teammates=p.isHome?this.home:this.away;const direction=p.isHome?1:-1;
      const choices=teammates.filter(q=>q!==p&&q.role!=='GK').map(q=>{
        const dx=(q.x-p.x)*direction,dy=Math.abs(q.y-p.y),d=distance(p,q);
        const score=(dx>0?90:0)+dx*.2-dy*.13-Math.abs(d-(through?270:180))*.23+Math.random()*20;
        return {p:q,score};
      }).sort((a,b)=>b.score-a.score);
      return choices[0]?.p||teammates.find(q=>q!==p);
    }
    kick(p,type,charge=.4){if(!p||this.ball.owner!==p||this.stoppage>0)return false;
      const b=this.ball;const dir=p.isHome?1:-1;
      p.hasBall=false;b.owner=null;b.shotBy=type==='shoot'?p:null;b.lastTouch=p;b.lock=.48;this.goalkeeperAttempts.clear();
      let aimX,aimY,speed;
      if(type==='shoot'){
        if(p.isHome)this.homeShots++;else this.awayShots++;
        aimX=p.isHome?FIELD.w+70:-70;
        const skill=p.shot;const error=(Math.random()-.5)*(185-skill*1.20);
        aimY=360+error;
        const fromGoal=Math.abs(aimX-p.x);
        // Controlled shots have slightly stronger direction toward the goal.
        speed=cap(410+charge*330+(skill-65)*2,380,840);
        if(fromGoal>780){aimY+=Math.random()*50-25;speed*=.84;}
      }else{
        const target=this.passTarget(p,type==='through');if(!target)return false;
        aimX=target.x+(type==='through'?dir*(75+charge*80):0);
        aimY=target.y+(Math.random()-.5)*(105-p.pass)*.8;
        speed=type==='chip'?410+charge*180:type==='through'?410+charge*170:340+charge*130;
        if(p.isHome)this.homePasses++;
      }
      const dx=aimX-p.x,dy=aimY-p.y,l=Math.hypot(dx,dy)||1;
      b.x=p.x+dx/l*20;b.y=p.y+dy/l*20;b.vx=dx/l*speed;b.vy=dy/l*speed;
      if(type==='shoot'){this.announce(`${p.mon.name} shoots!`,1);}
      return true;
    }
    action(code,charge=.4){if(!this.isRunning||this.stoppage>0)return;
      if(code==='switch'){this.switchPlayer();return;}
      if(code==='tackle'){
        const victim=this.ball.owner;
        if(victim&&!victim.isHome&&distance(this.player,victim)<57){
          const ok=Math.random()<.46+this.player.def/230;
          if(ok){victim.hasBall=false;this.ball.owner=this.player;this.player.hasBall=true;this.ball.lock=.7;this.announce('Great tackle by '+this.player.mon.name+'!',1.2)}
          else this.announce('Challenge missed!',.75);
        }else this.announce('Close down the ball to tackle',.8);
        return;
      }
      const owner=this.ball.owner;if(!owner||!owner.isHome)return;
      this.kick(owner,code,charge);
    }
    switchPlayer(){if(this.ball.owner?.isHome){this.player=this.ball.owner;return;}
      const players=this.home.filter(p=>p.role!=='GK').sort((a,b)=>distance(a,this.ball)-distance(b,this.ball));
      let idx=players.indexOf(this.player);this.player=players[(idx+1)%Math.min(players.length,4)]||players[0];
      this.autoswitchAt=this.elapsed+2.5*MINUTE_PER_REAL_SECOND;this.updateHUD();}
    scene(){return {x:this.w/2,y:this.h*.55};}
    pt(x,y){
      const depth=y/FIELD.h;
      const perspective=.93+depth*.10;
      return {x:this.w*.5+(x-this.cameraX)*this.sx*perspective,
              y:this.h*.20+y*this.sy+(x-this.cameraX)*this.sx*.016};
    }
    draw(){if(!this.ctx)return;this.resize();const ctx=this.ctx,w=this.w,h=this.h;
      ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,w,h);
      this.drawStadium(ctx,w,h);this.drawPitch(ctx);
      const sorted=this.players.slice().sort((a,b)=>a.y-b.y);
      for(const p of sorted)this.drawPlayer(ctx,p);
      this.drawBall(ctx);
      if(this.messageTimer>0&&this.message){ctx.save();const label=this.message.toUpperCase();ctx.textAlign='center';ctx.font=`900 ${cap(w/38,13,25)}px system-ui`;const mw=Math.min(w-30,ctx.measureText(label).width+45);ctx.fillStyle='rgba(9,24,18,.87)';this.roundRect(ctx,(w-mw)/2,h*.16,mw,43,12);ctx.fill();ctx.fillStyle='#def477';ctx.fillText(label,w/2,h*.16+29);ctx.restore()}
      if(!this.isRunning&&!this.isFullTime){ctx.fillStyle='#04110aba';ctx.fillRect(0,0,w,h);ctx.textAlign='center';ctx.fillStyle='#dcf56a';ctx.font=`900 ${cap(w/22,25,56)}px system-ui`;ctx.fillText(this.elapsed?'PAUSED':'THE PITCH',w/2,h*.44);ctx.font=`500 ${cap(w/70,11,16)}px system-ui`;ctx.fillStyle='#d4e4d4';ctx.fillText(this.elapsed?'Select resume match to continue':'Select kick off to play your Starting XI',w/2,h*.51)}
      if(this.isFullTime){ctx.fillStyle='#06170ed8';ctx.fillRect(0,0,w,h);ctx.textAlign='center';ctx.fillStyle='#dcf56a';ctx.font=`900 ${cap(w/21,23,54)}px system-ui`;ctx.fillText('FULL TIME',w/2,h*.39);ctx.font=`800 ${cap(w/13,38,85)}px system-ui`;ctx.fillStyle='#fff';ctx.fillText(`${this.homeScore}  –  ${this.awayScore}`,w/2,h*.57)}
      if(this.flash>0){ctx.fillStyle=`rgba(228,247,113,${this.flash*.2})`;ctx.fillRect(0,0,w,h)}
    }
    roundRect(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
    drawStadium(c,w,h){
      const gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#152c25');gr.addColorStop(.23,'#244735');gr.addColorStop(1,'#07170e');c.fillStyle=gr;c.fillRect(0,0,w,h);
      for(let y=0;y<Math.max(25,h*.19);y+=9){
        c.fillStyle=y%18===0?'#2d5240':'#1c3a2d';c.fillRect(0,y,w,6);
        for(let x=5;x<w;x+=13){const rnd=((x*59+y*37)%13)/13;c.fillStyle=rnd>.7?'#d3b88b':rnd>.45?'#778d77':'#435d52';c.fillRect(x+((y*7)%5),y+1,3,2)}
      }
      c.fillStyle='#1a2520';c.fillRect(0,h*.17,w,14);c.fillStyle='#cfeb69';c.fillRect(0,h*.19,w,3);
      c.fillStyle='#0e291f';c.fillRect(0,h*.905,w,h*.1);c.fillStyle='#456c4e';c.fillRect(0,h*.9,w,3);
    }
    drawPitch(c){
      const corners=[[0,0],[FIELD.w,0],[FIELD.w,FIELD.h],[0,FIELD.h]].map(([x,y])=>this.pt(x,y));
      c.beginPath();c.moveTo(corners[0].x,corners[0].y);corners.slice(1).forEach(p=>c.lineTo(p.x,p.y));c.closePath();c.fillStyle='#19573e';c.fill();
      for(let x=0;x<FIELD.w;x+=120){c.beginPath();const pts=[[x,0],[x+120,0],[x+120,FIELD.h],[x,FIELD.h]].map(([px,py])=>this.pt(px,py));c.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>c.lineTo(p.x,p.y));c.closePath();c.fillStyle=x/120%2?'#1a694b':'#1e7150';c.fill();}
      c.lineWidth=Math.max(1,this.scale*2);c.strokeStyle='#cbead9c9';
      const line=(a,b)=>{const p=this.pt(...a),q=this.pt(...b);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke()};
      const box=(x1,y1,x2,y2)=>{line([x1,y1],[x2,y1]);line([x2,y1],[x2,y2]);line([x2,y2],[x1,y2]);line([x1,y2],[x1,y1])};
      box(12,12,FIELD.w-12,FIELD.h-12);line([600,12],[600,FIELD.h-12]);
      this.drawCircle(c,600,360,94);this.drawCircle(c,600,360,3,true);
      box(12,199,192,521);box(FIELD.w-192,199,FIELD.w-12,521);
      box(12,280,72,440);box(FIELD.w-72,280,FIELD.w-12,440);
      this.drawCircle(c,132,360,3,true);this.drawCircle(c,FIELD.w-132,360,3,true);
      this.drawGoal(c,false);this.drawGoal(c,true);
      // Subtle pitch-side billboards.
      const p1=this.pt(100,FIELD.h+17),p2=this.pt(1090,FIELD.h+17);
      c.strokeStyle='#d5f07f';c.lineWidth=3;c.beginPath();c.moveTo(p1.x,p1.y);c.lineTo(p2.x,p2.y);c.stroke();
    }
    drawCircle(c,x,y,r,filled=false){const center=this.pt(x,y),cx=this.pt(x+r,y),cy=this.pt(x,y+r);
      c.beginPath();c.ellipse(center.x,center.y,Math.abs(cx.x-center.x),Math.abs(cy.y-center.y),0,0,Math.PI*2);
      if(filled){c.fillStyle='#dbf6cf';c.fill()}else c.stroke();}
    drawGoal(c,right){const x=right?FIELD.w:0,back=right?FIELD.w+35:-35;
      const pts=[[x,FIELD.goalTop],[back,FIELD.goalTop-13],[back,FIELD.goalBottom+13],[x,FIELD.goalBottom]].map(([px,py])=>this.pt(px,py));
      c.strokeStyle='#f8fff1';c.lineWidth=3;c.beginPath();c.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>c.lineTo(p.x,p.y));c.closePath();c.stroke();
      c.strokeStyle='#e1fbe36e';c.lineWidth=1;
      for(let t=.17;t<1;t+=.17){const p=this.pt(x+(back-x)*t,FIELD.goalTop-13*t),q=this.pt(x+(back-x)*t,FIELD.goalBottom+13*t);
        c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke()}
    }
    drawPlayer(c,p){const point=this.pt(p.x,p.y),size=cap(this.scale*13,6.5,17)*(p.role==='GK'?1.13:1);
      c.save();c.translate(point.x,point.y);c.fillStyle='#06180a80';c.beginPath();c.ellipse(0,size*.55,size*1.15,size*.55,0,0,Math.PI*2);c.fill();
      if(p===this.player){c.strokeStyle='#e5fb90';c.lineWidth=2.3;c.beginPath();c.ellipse(0,size*.53,size*1.45,size*.78,0,0,Math.PI*2);c.stroke();}
      if(p.hasBall){c.strokeStyle=p.isHome?'#ddfb7d':'#ffb4ac';c.lineWidth=2;c.beginPath();c.arc(0,-size*.65,size*1.5,0,Math.PI*2);c.stroke();}
      c.fillStyle=p.role==='GK'?(p.isHome?'#60cbdc':'#ba9cf0'):(p.isHome?colors.home:colors.away);
      c.strokeStyle=p.isHome?'#052a21':'#4b2033';c.lineWidth=2;
      c.beginPath();c.ellipse(0,-size*.7,size*.88,size*1.03,0,0,Math.PI*2);c.fill();c.stroke();
      c.fillStyle=TYPE_INFO[p.mon.types[0]]?.[0]||'#fff';c.beginPath();c.arc(0,-size*.95,size*.48,0,Math.PI*2);c.fill();
      c.fillStyle='#09241d';c.font=`900 ${cap(size*.62,7,12)}px system-ui`;c.textAlign='center';c.fillText(initialsOf(p.mon),0,-size*.43);
      if(p===this.player||p.hasBall){const label=p.mon.name,cFont=cap(this.scale*11,9,14);c.font=`700 ${cFont}px system-ui`;
        const tw=c.measureText(label).width+16;c.fillStyle=p.isHome?'#e5f9af':'#ffdbc7';this.roundRect(c,-tw/2,-size*3.25,tw,17,5);c.fill();c.fillStyle='#11261b';c.fillText(label,0,-size*3.25+12)}
      c.restore();
    }
    drawBall(c){const p=this.pt(this.ball.x,this.ball.y);const radius=cap(this.scale*6,3,8);
      c.fillStyle='#031b1080';c.beginPath();c.ellipse(p.x+3,p.y+radius*1.3,radius*1.2,radius*.6,0,0,Math.PI*2);c.fill();
      c.fillStyle='#f5faf7';c.strokeStyle='#253b37';c.lineWidth=1.3;c.beginPath();c.arc(p.x,p.y-radius*.3,radius,0,Math.PI*2);c.fill();c.stroke();
      c.fillStyle='#34453c';c.beginPath();c.moveTo(p.x,p.y-radius*.75);c.lineTo(p.x+radius*.47,p.y-radius*.2);c.lineTo(p.x,p.y+radius*.23);c.lineTo(p.x-radius*.47,p.y-radius*.2);c.closePath();c.fill();
    }
  }
  function ensureMatch(){if(!active){const rival=RIVALS[Number($a('arcadeOpponent').value)||0];active=new Match(rival);}return active;}
  function newMatch(start){if(active)active.pause();
    const rival=RIVALS[Number($a('arcadeOpponent').value)||0];active=new Match(rival);
    if(start)active.start();else active.draw();
  }
  function onShow(){enabled=true;if(active&&active.squadSig!==state.formation+'|'+state.lineup.join(',')+'|'+state.name)newMatch(false);ensureMatch();setTimeout(()=>{if(active){active.resize();active.draw();}},30);}
  function onHide(){enabled=false;keys.clear();touchStick={x:0,y:0};charging.key=null;if(active)active.pause();}
  function keyNorm(e){return e.code}
  function onKeyDown(e){if(!enabled)return;if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
    const code=keyNorm(e);
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyD','KeyS','KeyA','KeyW','KeyQ','KeyC','KeyE','Space','ShiftLeft','ShiftRight'].includes(code))e.preventDefault();
    keys.add(code);if(!active||!active.isRunning||e.repeat)return;
    if(code==='KeyQ')active.action('switch');
    else if(['KeyD','KeyS','KeyA','KeyW'].includes(code)){
      if(code==='KeyD'&&!active.ball.owner?.isHome){active.action('tackle');return;}
      charging.key=code;charging.start=performance.now();
    }
    if(code==='Space')active.pause();
  }
  function onKeyUp(e){if(!enabled)return;keys.delete(e.code);
    if(!active||!active.isRunning)return;
    if(charging.key===e.code){const power=cap((performance.now()-charging.start)/800,.14,1);
      active.action(({KeyD:'shoot',KeyS:'pass',KeyA:'chip',KeyW:'through'})[e.code],power);
      charging.key=null;active.kickCharge=0;}
  }
  function bind(){if(bound)return;bound=true;
    const opt=$a('arcadeOpponent');opt.innerHTML=RIVALS.map((r,i)=>`<option value="${i}">${escapeHTML(r.name)} · ${r.rating} OVR</option>`).join('');
    opt.onchange=()=>newMatch(false);
    $a('arcadeStartBtn').onclick=()=>{const game=ensureMatch();if(game.isRunning)game.pause();else game.start()};
    $a('arcadeRestartBtn').onclick=()=>newMatch(true);
    $a('arcadeRandomBtn').onclick=()=>{randomize();newMatch(false);notify('New random XI ready for kickoff')};
    $a('arcadeEditBtn').onclick=()=>showPage('builder');
    window.addEventListener('keydown',onKeyDown,{passive:false});window.addEventListener('keyup',onKeyUp);
    window.addEventListener('blur',()=>{keys.clear();touchStick={x:0,y:0};if(active&&active.isRunning&&enabled)active.pause()});
    window.addEventListener('resize',()=>{if(active&&enabled)active.draw()});
    const stick=$a('arcadeJoystick');let pointer=null;
    const changeStick=e=>{const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
      const x=(e.clientX-cx)/(r.width*.35),y=(e.clientY-cy)/(r.height*.35);
      const len=Math.hypot(x,y),nx=len>1?x/len:x,ny=len>1?y/len:y;
      touchStick={x:nx,y:ny};$a('arcadeStickKnob').style.transform=`translate(${nx*34}px,${ny*34}px)`;};
    stick.addEventListener('pointerdown',e=>{e.preventDefault();pointer=e.pointerId;stick.setPointerCapture(pointer);changeStick(e)});
    stick.addEventListener('pointermove',e=>{if(e.pointerId===pointer)changeStick(e)});
    for(const evt of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(evt,()=>{pointer=null;touchStick={x:0,y:0};$a('arcadeStickKnob').style.transform='translate(0,0)'});
    document.querySelectorAll('[data-arcade-action]').forEach(btn=>{
      const action=btn.dataset.arcadeAction;
      btn.addEventListener('pointerdown',e=>{e.preventDefault();if(!active)return;
        if(action==='switch'||action==='tackle'){active.action(action);return;}
        actionTouch={id:e.pointerId,start:performance.now(),action};btn.setPointerCapture(e.pointerId);
        btn.classList.add('charging');});
      const release=e=>{btn.classList.remove('charging');if(!actionTouch||actionTouch.id!==e.pointerId)return;
        active?.action(actionTouch.action,cap((performance.now()-actionTouch.start)/800,.16,1));actionTouch=null;};
      btn.addEventListener('pointerup',release);btn.addEventListener('pointercancel',e=>{btn.classList.remove('charging');actionTouch=null;});
    });
  }
  document.addEventListener('DOMContentLoaded',bind);
  window.ArcadeMatchUI={onShow,onHide,newMatch};
})();
