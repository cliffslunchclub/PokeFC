'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const production=fs.readFileSync(path.join(root,'.github/workflows/deploy-siteground.yml'),'utf8');
const local=fs.readFileSync(path.join(root,'watch/soccerjs/build-local.sh'),'utf8');
const viewer=fs.readFileSync(path.join(root,'watch/soccerjs/viewer-entry.cjs'),'utf8');
for(const mod of ['clip-export','clip-recorder']){
 assert(viewer.includes("require('./"+mod+".cjs')"),'Viewer requires '+mod);
 assert(production.includes('cp watch/soccerjs/'+mod+'.cjs soccer-js-upstream/'),
  'SiteGround native esbuild must copy '+mod);
 assert(local.includes('cp "$HERE/'+mod+'.cjs"'),
  'Public local CI must include '+mod);
}
assert(production.includes('--define:__PFC_BUILD_ID__='),
 'Production must identify its exact Git commit in companion clip JSON');
assert(local.includes('--define:__PFC_BUILD_ID__='),
 'Test recordings also need build identifiers');
console.log('PASS SiteGround parity: clip recorder/metadata copied into both Soccer-JS builds and production SHA embedded');
