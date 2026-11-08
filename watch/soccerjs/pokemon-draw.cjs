'use strict';
const {badge}=require('./pokemon-badge.cjs');
function draw(g,player,entry,screen,showNumbers,selected,projectionScale=1){
 // Follow the pitch camera proportionally, but keep text/badges at readable
 // UI pixel sizes. The sprite's FEET, not its center, are field-anchored.
 const scale=Math.max(.2,Math.min(3,Number(projectionScale)||1));
 const ground=screen(player.x,player.y,0);
 const q=screen(player.x,player.y,player.z||0),x=q.x,y=q.y,size=80*scale;
 g.save();
 g.beginPath();g.ellipse(ground.x,ground.y-2*scale,22*scale,9*scale,0,0,Math.PI*2);
 g.fillStyle=entry.color+'38';g.strokeStyle=entry.color;
 g.lineWidth=selected?4:2.5;g.shadowColor='#061820';g.shadowBlur=3;
 g.fill();g.stroke();g.shadowBlur=0;
 const loaded=entry.image?.naturalWidth>0;
 if(loaded){g.imageSmoothingEnabled=false;g.drawImage(entry.image,x-size/2,y-size-4*scale,size,size)}
 else{g.fillStyle='#31465C';g.beginPath();g.arc(x,y-26*scale,17*scale,0,Math.PI*2);g.fill();
  g.fillStyle='#FFF';g.font='bold 13px system-ui';g.textAlign='center';g.fillText('?',x,y-22*scale)}
 if(showNumbers)badge(g,x,y-size-15,entry.number,entry.color,entry.role==='GK');
 if(selected){
  const name=entry.name.slice(0,16),labelY=y-size-(showNumbers?44:22);
  g.font='bold 12px system-ui';const w=g.measureText(name).width+18;
  g.fillStyle='#0C1C2DEB';g.fillRect(x-w/2,labelY-12,w,24);
  g.fillStyle='#FFF';g.textBaseline='middle';g.textAlign='center';g.fillText(name,x,labelY);
 }
 g.restore();return !!loaded;
}
module.exports={draw};
