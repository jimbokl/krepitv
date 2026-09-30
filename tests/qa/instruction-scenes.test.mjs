import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { INSTRUCTION_SCENES, PAGE_SCENES, boundedSceneStep, scenePlaybackNext } from '../../web/src/lib/instructionScenes.mjs';

test('visual instruction scripts cover four reusable jobs and six existing pages', () => {
  assert.equal(Object.keys(INSTRUCTION_SCENES).length, 4);
  assert.equal(Object.keys(PAGE_SCENES).length, 6);
  for (const kind of Object.values(PAGE_SCENES)) assert.ok(INSTRUCTION_SCENES[kind]);
  for (const scene of Object.values(INSTRUCTION_SCENES)) {
    assert.ok(scene.steps.length >= 4);
    assert.equal(new Set(scene.steps.map(step => step.id)).size, scene.steps.length);
    for (const step of scene.steps) for (const key of ['id','label','title','copy','cue','pose','focus']) assert.ok(step[key]);
    assert.ok(scene.link.href.startsWith('/'));
  }
});
test('step bounds and opt-in playback stop at the final step', () => {
  assert.equal(boundedSceneStep(-9,6),0);
  assert.equal(boundedSceneStep(99,6),5);
  assert.equal(boundedSceneStep(NaN,6),0);
  assert.deepEqual(scenePlaybackNext(4,6),{step:5,playing:false});
  assert.deepEqual(scenePlaybackNext(5,6),{step:5,playing:false});
  assert.deepEqual(scenePlaybackNext(0,1),{step:0,playing:false});
});
test('illustrations cannot replace exact calculations, drill templates or tool completions', async () => {
  const component = await readFile(new URL('../../web/src/components/scene/InstructionScene.jsx',import.meta.url),'utf8');
  const stage = await readFile(new URL('../../web/src/components/scene/RoomStage.jsx',import.meta.url),'utf8');
  const styles = await readFile(new URL('../../web/src/styles.css',import.meta.url),'utf8');
  assert.match(component,/не шаблон сверления/);
  assert.match(component,/по ней нельзя выбирать анкеры или сверлить стену/);
  assert.doesNotMatch(component,/emitResultCompleted|data-analytics-tool|fetch\(/);
  assert.match(stage,/\.\.\.screen/);
  assert.match(stage,/\.\.\.wall/);
  assert.match(stage,/translate\(\$\{tvX\}px, \$\{tvY\}px\)/);
  assert.match(stage,/data-room-connection="power"/);
  assert.match(stage,/data-room-connection="hdmi"/);
  assert.match(styles,/prefers-reduced-motion: reduce/);
  assert.match(styles,/animation-play-state: paused/);
});
test('wall planner guards same-tick double submits and discards stale results', async () => {
  const source = await readFile(new URL('../../web/src/components/WallPlannerCalculator.jsx',import.meta.url),'utf8');
  assert.match(source,/if \(pendingCalculation\.current \|\| !canCalculate\) return/);
  assert.match(source,/if \(sequence !== calculationSequence\.current\) return/);
  assert.match(source,/moveSequence\.current \+= 1/);
});
