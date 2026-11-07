'use strict';
// Keep the player's ground footprint inside the boards in every scene/camera.
// The ball keeps its own collision model, including official open-goal shots.
const INSET=.9;
function apply(frame,field){
 return {...frame,actors:frame.actors.map(p=>({...p,
  x:Math.max(INSET,Math.min(field.width-INSET,p.x)),
  y:Math.max(INSET,Math.min(field.height-INSET,p.y))}))};
}
module.exports={INSET,apply};
