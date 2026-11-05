'use strict';
// Ensure the public playtest has the exact set of static assets, local
// dependencies and an explicit warning about non-TacticMesh visualizations.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const dir='dist/phase10-test';
for(const f of ['index.html','styles.css','app.js','quick-sim.js','timeline.js']){
 assert(fs.statSync(dir+'/'+f).size>100,'Empty/absent public asset: '+f);
}
const html=fs.readFileSync(dir+'/index.html','utf8');
for(const x of ['styles.css','app.js','quick-sim.js','timeline.js']){
 assert(html.includes('./'+x+'?v=1'),'Missing script/style '+x);
}
assert(html.includes('not yet the full TacticMesh animation engine'),'Missing honest animation disclaimer');
assert(html.includes('No account, download or payment required'),'Free access claim missing');
const js=fs.readFileSync(dir+'/app.js','utf8');
for(const x of ['director.build(', 'director.scoreAt(', 'director.eventsBetween(', 'director.validate(']){
 assert(js.includes(x),'Missing authoritative replay API call '+x);
}
assert(!/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage)\s*[\(.]/.test(js),
 'Public test must not transmit user data or persist a local account');
assert(fs.readdirSync(dir).sort().join(',')==='app.js,index.html,quick-sim.js,styles.css,timeline.js',
 'Unexpected files in public test directory');
console.log('PASS Phase 10 public playtest packaging: five isolated static files, no production deploy artifacts');
