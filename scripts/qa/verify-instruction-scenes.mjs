import { spawnSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const base = process.env.SCENE_QA_URL || 'http://127.0.0.1:4190';
const run = '.design-harness/runs/20260930-visual-instruction-engine';
await mkdir(`${run}/evidence/screenshots`,{recursive:true});
const cases = [];
for (const [viewport,width,height] of [['mobile',320,800],['tablet',768,1024],['desktop',1440,900]]) {
  for (const state of ['default','success','disabled','focus','paused','reduced-motion']) {
    cases.push({viewport,width,height,state,route:'/kak-povesit-televizor-na-stenu/',scene:true});
  }
  for (const state of ['default','success','empty','loading','error']) {
    cases.push({viewport,width,height,state,route:'/televizor-na-stene/',scene:false});
  }
}
for (const route of ['/na-kakoy-vysote-veshat-televizor/','/rozetki-pod-televizor-na-stene/','/kakoy-hdmi-kabel-nuzhen/','/televizor-ne-vidit-noutbuk-cherez-hdmi/']) {
  cases.push({viewport:'mobile',width:320,height:800,state:'success',route,scene:true,extra:true});
}
for (const scene of [true,false]) {
  cases.push({viewport:'desktop',width:1440,height:900,state:'success',route:scene?'/kak-povesit-televizor-na-stenu/':'/televizor-na-stene/',scene,zoom:true});
}
for (const [route,step] of [['/rozetki-pod-televizor-na-stene/',1],['/rozetki-pod-televizor-na-stene/',2],['/kakoy-hdmi-kabel-nuzhen/',1],['/kak-povesit-televizor-na-stenu/',4]]) {
  for (const [viewport,width,height] of [['mobile',320,800],['desktop',1440,900]]) {
    cases.push({viewport,width,height,state:'success',route,scene:true,extra:true,step});
  }
}
for (const [viewport,width,height] of [['mobile',320,800],['tablet',768,1024],['desktop',1440,900]]) {
  cases.push({viewport,width,height,state:'success',route:'/televizor-na-stene/',scene:false,diagram:true});
}
let passed = 0;
for (const item of cases) {
  const name = `${item.scene?'scene':'planner'}-${item.extra?item.route.split('/')[1]+'-':''}${item.viewport}-${item.state}${item.zoom?'-zoom':''}${item.step!==undefined?'-step'+item.step:''}${item.diagram?'-diagram':''}`;
  const output = `${run}/evidence/screenshots/${name}.png`;
  const selector = item.scene ? item.state==='focus'?'.instruction-scene__timeline':item.state==='disabled'?'.instruction-scene__controls':'[data-instruction-scene]' : item.diagram?'[data-wall-planner-diagram="результат"]':item.state==='success'?'[data-wall-planner-result]':item.state==='empty'?'input[name="wallWidth"]':item.state==='loading'?'[data-analytics-tool="wall_planner"] button[type="submit"]':item.state==='error'?'[data-analytics-tool="wall_planner"] [role="status"]':'[data-analytics-tool="wall_planner"]';
  const args = ['scripts/qa/capture-page.mjs','--url',`${base}${item.route}`,'--output',output,'--width',String(item.width),'--height',String(item.height),item.scene?'--instruction-scene-state':'--wall-planner-state',item.state,'--selector',selector];
  if (item.state==='focus') args.push('--focus-selector','.instruction-scene__timeline button:first-child');
  if (item.zoom) args.push('--text-zoom','200','--text-spacing');
  if (item.step!==undefined) args.push('--instruction-scene-step',String(item.step));
  const result = spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:2_000_000});
  if (result.status !== 0) { process.stderr.write(`${name}: ${result.stderr}\n${result.stdout}`); process.exit(result.status || 1); }
  passed++;
  process.stdout.write(`PASS ${name}\n`);
}
// First-response HTML must remain useful without JavaScript or WASM.
for (const route of [...new Set(cases.map(item=>item.route))]) {
  const html = await readFile(path.join('docs',route,'index.html'),'utf8');
  if (!html.includes('<h1') || !html.includes('href=') || !html.includes('Частые вопросы')) throw new Error(`No-JS answer missing: ${route}`);
}
process.stdout.write(`PASS ${passed} rendered cases; no-JS answer preserved.\n`);
