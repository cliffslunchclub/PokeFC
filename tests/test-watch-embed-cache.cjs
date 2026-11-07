'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const iframe=read('watch/soccerjs/index.html');
const bridge=read('watch/soccerjs/watch-bridge.js');
const play=read('play/play.js'),playPage=read('play/index.html');
const franchise=read('assets/js/soccerjs-franchise-viewer.js');
const franchisePage=read('franchise/index.html');
const challenges=read('challenge/index.html');
for(const [name,value] of [['CSS',iframe.match(/viewer\.css\?v=(\d+)/)?.[1]],
 ['viewer bundle',iframe.match(/viewer\.bundle\.js\?v=(\d+)/)?.[1]],
 ['bridge inline URL',bridge.match(/index\.html\?embedded=1&inline=1&v=(\d+)/)?.[1]],
 ['franchise inline URL',franchise.match(/index\.html\?embedded=1&inline=1&v=(\d+)/)?.[1]],
 ['Quick Play bridge',play.match(/watch-bridge\.js\?v=(\d+)/)?.[1]],
 ['Challenge bridge',challenges.match(/watch-bridge\.js\?v=(\d+)/)?.[1]],
 ['Franchise bridge',franchisePage.match(/watch-bridge\.js\?v=(\d+)/)?.[1]]]){
 assert.equal(value,'18',name+' must load the same new viewer release');
}
assert(playPage.includes('play.js?v=25'),
 'Quick Play must refresh the parent script that loads Watch');
assert(franchisePage.includes('soccerjs-franchise-viewer.js?v=16'),
 'Franchise must refresh its iframe adapter');
assert(iframe.includes('id="commentaryPanel"')&&iframe.includes('id="commentaryToggle"'));
assert(iframe.includes('id="zoomIn"')&&iframe.includes('id="zoomOut"'));
const css=read('watch/soccerjs/viewer.css');
assert(css.includes('.watch-commentary')&&css.includes('html.pfc-inline .pitchwrap'),
 'Embedded commentary must be styled within the pitch');
console.log('PASS refreshed Watch assets: inline commentary, zoom, and cache versions across all modes');
