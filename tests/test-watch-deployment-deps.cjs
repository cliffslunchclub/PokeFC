'use strict';
// Production workflow bundles in a separate checked-out Soccer-JS tree.
// Every local require from the entry point must be copied before esbuild.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const main=fs.readFileSync(path.join(root,'watch/soccerjs/viewer-entry.cjs'),'utf8');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/deploy-siteground.yml'),'utf8');
const requires=[...main.matchAll(/require\(['"]\.\/([^'"]+\.cjs)['"]\)/g)].map(x=>x[1]);
assert(requires.length>=12,'Expected Soccer-JS source imports');
for(const name of requires){
 const local=path.join(root,'watch/soccerjs',name);
 assert(fs.existsSync(local),'Missing local viewer dependency: '+name);
 if(name.startsWith('pokemon-'))assert(workflow.includes('cp watch/soccerjs/pokemon-*.cjs soccer-js-upstream/'));
 else assert(workflow.includes('cp watch/soccerjs/'+name+' soccer-js-upstream/'),
  'Deployment bundle does not copy viewer dependency: '+name);
}
assert.match(workflow,/--define:__PFC_BUILD_ID__/,'Production build must embed matching build ID');
assert.match(workflow,/--bundle --platform=browser/);
assert(workflow.includes('PFC_INCLUDE_SOCCERJS=1 bash scripts/build-siteground.sh'));
console.log('PASS production bundle copies all '+requires.length+' Watch entry dependencies, including clip recorder/exporter');
