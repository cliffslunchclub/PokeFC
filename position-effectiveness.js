/* PokéFC positional suitability v1 — browser and Node, no saved-player migration.
 * Compare natural role fits, never apply a flat S-tier bonus.
 */
(function(root){'use strict';
 const WEIGHTS={
  GK:{hp:.20,defense:.30,spDefense:.30,speed:.20},
  DEF:{defense:.35,hp:.20,attack:.20,speed:.25},
  MID:{spAttack:.30,spDefense:.25,attack:.20,speed:.25},
  FWD:{attack:.35,spAttack:.20,speed:.35,hp:.10}
 };
 function role(pos){
  const p=String(pos||'').toUpperCase();
  if(p==='GK')return 'GK';
  if(['LB','RB','CB','LWB','RWB','DEF'].includes(p))return 'DEF';
  if(['ST','LW','RW','FWD'].includes(p))return 'FWD';
  return 'MID';
 }
 function fit(stats,pos){
  const w=WEIGHTS[role(pos)];
  return Math.min(100,20+.55*Object.entries(w).reduce((n,[k,v])=>n+(Number(stats?.[k])||0)*v,0));
 }
 function profile(stats,pos){
  const chosen=role(pos),byRole=Object.fromEntries(Object.keys(WEIGHTS).map(k=>[k,fit(stats,k)]));
  const bestFit=Math.max(...Object.values(byRole)),assignedFit=byRole[chosen];
  const gap=Math.max(0,bestFit-assignedFit);
  // 10 fit points below natural best = 3.5% penalty; maximum penalty 12%.
  const efficiency=Math.round(Math.max(.88,1-.0035*gap)*10000)/10000;
  return {role:chosen,fit:assignedFit,bestFit,gap,efficiency};
 }
 const api={version:'v1',weights:WEIGHTS,role,fit,profile};
 root.PFC_POSITION_EFFECTIVENESS=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
