'use strict';
// Replays are view-only presentations from official PSE incidents,
// never separate simulation outcomes or speculative set-piece timestamps.
const assert=require('node:assert/strict');
const {catalog,clipFor,resolve}=require('../watch/soccerjs/highlight-replay.cjs');
const {motionFrame}=require('../watch/soccerjs/phase10-motion.cjs');
const home={id:'home',name:'Pewter',lineup:Array.from({length:11},(_,i)=>({
 id:'h'+i,name:i===2?'Pika <script>alert(1)</script>':'Home '+i}))};
const away={id:'away',name:'Cerulean',lineup:Array.from({length:11},(_,i)=>({
 id:'a'+i,name:'Away '+i}))};
const fixture={schema:'pokefc-quick-sim-export/v1',durationMinutes:120,
 home,away,score:[1,1],events:[
 {type:'goal',minute:12.4,team:'home',player:'h2'},
 {type:'save',minute:25,team:'away',player:'a0'},
 // Unofficial/unsupported set-piece incidents may NOT appear in highlights.
 {type:'corner',minute:28,team:'away',player:'a1'},
 {type:'goal',minute:100.3,team:'away',player:'a5'}
 ],shootout:{version:'pse-shootout-v1',attempts:[
 {id:'pse-pk-0001',side:'home',kickerId:'h8',keeperId:'a0',outcome:'goal',scored:true},
 {id:'pse-pk-0002',side:'away',kickerId:'a8',keeperId:'h0',outcome:'saved',scored:false}
 ]}};
const original=JSON.stringify(fixture);
assert.deepEqual(catalog(fixture,0),[],'No spoilers before official goals');
assert.deepEqual(catalog(fixture,12.39),[],'Goal must not appear ahead of its timestamp');
assert.deepEqual(catalog(fixture,12.4).map(e=>e.id),['goal-0']);
assert.deepEqual(catalog(fixture,28).map(e=>e.id),['goal-0'],'Corner not officially enabled');
assert.deepEqual(catalog(fixture,105).map(e=>e.id),['goal-0','goal-1']);
assert.deepEqual(catalog(fixture,119).map(e=>e.id),['goal-0','goal-1']);
assert.deepEqual(catalog(fixture,120,0).map(e=>e.id),['goal-0','goal-1']);
assert.deepEqual(catalog(fixture,120,1).map(e=>e.id),['goal-0','goal-1','pk-0']);
assert.deepEqual(catalog(fixture,120,2).map(e=>e.id),['goal-0','goal-1','pk-0','pk-1']);
assert.equal(resolve(fixture,'goal-1',50,0),null,'Cannot replay a future event');
assert.equal(resolve(fixture,'pk-1',120,1),null,'Cannot replay an unviewed future kick');
assert.equal(resolve(fixture,'goal-1',101,0).name,'Away 5');
assert.match(resolve(fixture,'goal-0',13,0).name,/<script>/,
 'Text is unescaped data: UI must use textContent, never inject raw HTML');
const goal=resolve(fixture,'goal-0',13,0),window=clipFor(fixture,goal);
assert.equal(window.kind,'goal');
assert(window.start<goal.minute&&window.end>goal.minute);
assert.equal(window.durationSeconds,6);
const goalFrame=motionFrame(fixture,goal.minute+.02,{width:106,height:68});
assert.equal(goalFrame.officialEvent?.player,goal.event.player);
const penalty=resolve(fixture,'pk-0',120,1),pclip=clipFor(fixture,penalty);
assert.equal(pclip.kind,'shootout');assert.equal(pclip.kickIndex,1);
const start=motionFrame(fixture,120,{width:106,height:68},{kickIndex:1,kickProgress:0});
const mid=motionFrame(fixture,120,{width:106,height:68},{kickIndex:1,kickProgress:.65});
const end=motionFrame(fixture,120,{width:106,height:68},{kickIndex:1,kickProgress:1});
assert.notEqual(start.ball.x,mid.ball.x,'Penalty replay depicts changing ball position');
assert.notEqual(mid.ball.x,end.ball.x);
assert.equal(start.officialEvent,null,'Outcome not displayed before illustrative kick completes');
assert.equal(end.officialEvent?.id,penalty.event.id);
assert.equal(end.action,'official-shootout-goal');
assert.deepEqual(fixture.score,[1,1],'Shootout does not change 120-minute score');
// Only a v1 PSE event ledger may populate actual corner/free-kick/PK clips.
const officialSetFixture={...fixture,durationMinutes:90,setPieceRules:'v1',
 score:[0,0],shootout:null,events:[
 {id:'pse-v1-00001',type:'corner',minute:12.5,team:'home',player:'h2'},
 {id:'pse-v1-00002',type:'free-kick',minute:29.2,team:'away',player:'a5'},
 {id:'pse-v1-00003',type:'penalty-kick',minute:43.7,team:'home',player:'h7',outcome:'saved'}
]};
const safeBefore=JSON.stringify(officialSetFixture);
assert.deepEqual(catalog(officialSetFixture,12.49).map(e=>e.id),[],
 'Official corner may not spoil the future');
assert.deepEqual(catalog(officialSetFixture,12.5).map(e=>e.id),['sp-pse-v1-00001']);
assert.deepEqual(catalog(officialSetFixture,40).map(e=>e.id),
 ['sp-pse-v1-00001','sp-pse-v1-00002']);
for(const entry of catalog(officialSetFixture,90)){
 const clip=clipFor(officialSetFixture,entry);
 assert.equal(clip.kind,'set-piece');
 assert(clip.start<entry.minute&&clip.end>entry.minute);
 const frame=motionFrame(officialSetFixture,entry.minute+.02,{width:106,height:68});
 assert.equal(frame.officialEvent?.id,entry.event.id,'A replay cannot fabricate a different incident');
 assert.equal(frame.action,'official-'+entry.setPiece);
}
assert.equal(resolve(officialSetFixture,'sp-pse-v1-00003',40,0),null,
 'Future match penalty cannot be replayed');
assert.equal(JSON.stringify(officialSetFixture),safeBefore,'Set-piece replay mutated PSE match');
assert.equal(JSON.stringify(fixture),original,'No match or save state mutation');
const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'../watch/soccerjs/index.html'),'utf8');
for(const id of ['highlightToggle','highlightNotice','highlightDrawer','highlightList','highlightReplay',
 'highlightReplayReturn','highlightReplaySpeed','highlightNoticeDismiss'])
 assert(html.includes('id="'+id+'"'),'Shared Watch UI missing '+id);
const css=require('node:fs').readFileSync(require('node:path').join(__dirname,'../watch/soccerjs/viewer.css'),'utf8');
assert.match(css,/min-height:44px/,'Touch-size replay buttons required');
console.log('PASS official Match Highlights: no future spoilers, stable goal/PK clips, penalty motion, unchanged ledger and responsive UI');
