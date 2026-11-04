/* PokéFC Challenge drag & drop: one rules gateway for mouse, pen and touch.
 * Keyboard/mobile click + dropdown controls remain available in the game UI. */
(function(root){
 'use strict';
 let dispose=null;
 const sourceName=s=>s.type==='item'?'Item: '+s.value:
  s.type==='held-item'?'Held item':s.type==='candidate'?'Pokémon #'+s.value:'Drafted Pokémon';
 function mount(app,options){
  if(dispose)dispose();
  if(!app||!options)return;
  let active=null,target=null,ghost=null;
  const win=typeof window!=='undefined'?window:null;
  const doc=typeof document!=='undefined'?document:null;
  const spots=Array.from(app.querySelectorAll?.('[data-slot-card]')||[]);
  const clearHighlight=()=>{
   spots.forEach(el=>{el.classList?.remove?.('drag-valid','drag-invalid','drag-hover')});
   target=null;
  };
  const release=()=>{
   clearHighlight();
   if(ghost?.remove)ghost.remove();
   ghost=null;active=null;
   win?.removeEventListener?.('pointermove',pointerMove);
   win?.removeEventListener?.('pointerup',pointerUp);
   win?.removeEventListener?.('pointercancel',release);
  };
  const valid=(source,index)=>{
   try{return Boolean(options.canDrop?.(source,index))}catch{return false}
  };
  const showTarget=(el)=>{
   if(target===el)return;
   clearHighlight();
   if(!el||!active)return;
   target=el;
   const index=Number(el.dataset?.slotCard),allowed=valid(active,index);
   el.classList?.add?.('drag-hover',allowed?'drag-valid':'drag-invalid');
  };
  const commit=(el)=>{
   if(!active||!el)return;
   const index=Number(el.dataset?.slotCard),source=active;
   release();
   options.onDrop?.(source,index);
  };
  const sourceOf=(kind,value)=>{
   const type=String(kind);
   if(!['item','held-item','candidate','pokemon'].includes(type))return null;
   return {type,value:String(value)};
  };
  const begin=(source,ev)=>{
   if(!source||!options.canDrag?.(source)){ev?.preventDefault?.();return false}
   active=source;return true;
  };
  const pointerAt=(e)=>doc?.elementFromPoint?.(e.clientX,e.clientY)?.closest?.('[data-slot-card]')||null;
  function pointerMove(e){
   if(!active)return;
   if(e.cancelable)e.preventDefault();
   if(ghost?.style)ghost.style.transform='translate('+(e.clientX+13)+'px,'+(e.clientY+13)+'px)';
   showTarget(pointerAt(e));
   // A short scroll step lets a touch drag reach a pitch outside the viewport.
   if(e.clientY<45)win?.scrollBy?.(0,-15);
   else if(e.clientY>(win?.innerHeight||900)-45)win?.scrollBy?.(0,15);
  }
  function pointerUp(e){
   if(!active)return;
   const el=pointerAt(e);
   if(el)commit(el);else release();
  }
  const native=(el,source)=>{
   if(!el||!source||!options.canDrag?.(source))return;
   el.draggable=true;
   el.ondragstart=e=>{
    if(!begin(source,e))return;
    if(e.dataTransfer){e.dataTransfer.effectAllowed=source.type==='item'?'copy':'move';e.dataTransfer.setData('text/plain','pokefc-challenge-drag')}
    e.stopPropagation?.();
   };
   el.ondragend=release;
  };
  Array.from(app.querySelectorAll?.('[data-shop-pick]')||[]).forEach(el=>native(el,sourceOf('item',el.dataset?.shopPick)));
  Array.from(app.querySelectorAll?.('[data-species-id]')||[]).forEach(el=>native(el,sourceOf('candidate',el.dataset?.speciesId)));
  spots.forEach(el=>{
   native(el,sourceOf('pokemon',el.dataset?.slotCard));
   el.ondragenter=e=>{if(!active)return;e.preventDefault?.();showTarget(el)};
   el.ondragover=e=>{if(!active)return;e.preventDefault?.();if(e.dataTransfer)e.dataTransfer.dropEffect=valid(active,Number(el.dataset?.slotCard))?'move':'none';showTarget(el)};
   el.ondrop=e=>{if(!active)return;e.preventDefault?.();e.stopPropagation?.();commit(el)};
   el.ondragleave=e=>{if(el===target)clearHighlight()};
  });
  Array.from(app.querySelectorAll?.('[data-held-item-source]')||[]).forEach(el=>native(el,sourceOf('held-item',el.dataset?.heldItemSource)));
  Array.from(app.querySelectorAll?.('[data-drag-grip]')||[]).forEach(grip=>{
   const source=sourceOf(grip.dataset?.dragGrip,grip.dataset?.dragValue);
   if(!source||!options.canDrag?.(source))return;
   grip.onpointerdown=e=>{
    if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;
    if(!begin(source,e))return;
    if(e.cancelable)e.preventDefault();
    if(doc?.createElement&&doc?.body){
     ghost=doc.createElement('div');ghost.className='challenge-drag-ghost';
     ghost.textContent=sourceName(source);
     doc.body.appendChild(ghost);
     ghost.style.transform='translate('+(e.clientX+13)+'px,'+(e.clientY+13)+'px)';
    }
    win?.addEventListener?.('pointermove',pointerMove,{passive:false});
    win?.addEventListener?.('pointerup',pointerUp);
    win?.addEventListener?.('pointercancel',release);
   };
  });
  dispose=release;
 }
 root.PFC_CHALLENGE_DND={mount,cancel(){if(dispose)dispose();dispose=null}};
})(typeof window!=='undefined'?window:globalThis);
