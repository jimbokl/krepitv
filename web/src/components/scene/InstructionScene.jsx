import { useEffect, useId, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, ArrowCounterClockwise } from "@phosphor-icons/react";
import { INSTRUCTION_SCENES, boundedSceneStep, scenePlaybackNext } from "../../lib/instructionScenes.mjs";
import { RoomStage } from "./RoomStage.jsx";

export function InstructionScene({ kind = "mounting" }) {
  const scene = INSTRUCTION_SCENES[kind];
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const id = useId();
  const step = scene?.steps[boundedSceneStep(index, scene.steps.length)];

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    function sync() { setReducedMotion(preference.matches); if (preference.matches) setPlaying(false); }
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);
  useEffect(() => { setIndex(0); setPlaying(false); }, [kind]);
  useEffect(() => {
    if (!playing || reducedMotion || !scene) return undefined;
    const timer = window.setTimeout(() => {
      const next = scenePlaybackNext(index, scene.steps.length);
      setIndex(next.step);
      setPlaying(next.playing);
    }, 5500);
    return () => window.clearTimeout(timer);
  }, [index, playing, reducedMotion, scene]);
  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  if (!scene || !step) return null;

  function goTo(next) { setIndex(boundedSceneStep(next, scene.steps.length)); setPlaying(false); }
  function togglePlayback() {
    if (index === scene.steps.length - 1 && !playing) setIndex(0);
    setPlaying(!playing);
  }
  return <section aria-labelledby={`${id}-heading`} className="instruction-scene" data-instruction-scene={kind} data-scene-playing={playing}>
    <div className="instruction-scene__heading">
      <p className="instruction-scene__eyebrow">{scene.eyebrow} <span>Интерактивная инструкция</span></p>
      <h2 id={`${id}-heading`}>{scene.title}</h2>
    </div>
    <div className="instruction-scene__body">
      <div className="instruction-scene__stage">
        <svg aria-describedby={`${id}-caption`} aria-label={step.cue} className="room-stage" data-scene-pose={step.pose} role="img" viewBox="0 0 1000 650">
          <RoomStage focus={step.focus} kind={kind} pose={step.pose} />
        </svg>
        <div className="instruction-scene__cue" id={`${id}-caption`}><span aria-hidden="true" />{step.cue}</div>
        <p className="instruction-scene__scale">Иллюстрация устройства · не шаблон сверления</p>
      </div>
      <div className="instruction-scene__explanation">
        <div className="instruction-scene__counter" aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span> / {String(scene.steps.length).padStart(2, "0")}</div>
        <div aria-live={playing ? "off" : "polite"} className="instruction-scene__copy" aria-atomic="true">
          <p className="instruction-scene__step-label">{step.label}</p>
          <h3>{step.title}</h3><p>{step.copy}</p>
        </div>
        <div className="instruction-scene__controls">
          <button aria-label="Предыдущий шаг" disabled={index === 0} onClick={() => goTo(index - 1)} type="button"><ArrowLeft aria-hidden="true" /></button>
          {!reducedMotion ? <button aria-label={playing ? "Приостановить показ" : index === scene.steps.length - 1 ? "Посмотреть сначала" : "Показать по шагам"} aria-pressed={playing} onClick={togglePlayback} type="button">{playing ? <Pause aria-hidden="true" weight="fill" /> : index === scene.steps.length - 1 ? <ArrowCounterClockwise aria-hidden="true" /> : <Play aria-hidden="true" weight="fill" />}</button> : <span className="instruction-scene__motion-note">Переходы без анимации</span>}
          <button aria-label="Следующий шаг" disabled={index === scene.steps.length - 1} onClick={() => goTo(index + 1)} type="button"><ArrowRight aria-hidden="true" /></button>
        </div>
        <a className="instruction-scene__next" href={scene.link.href}>{scene.link.label}<ArrowRight aria-hidden="true" /></a>
      </div>
    </div>
    <nav aria-label="Шаги визуальной инструкции" className="instruction-scene__timeline">
      {scene.steps.map((item, number) => <button aria-current={number === index ? "step" : undefined} className={number === index ? "is-current" : ""} key={item.id} onClick={() => goTo(number)} type="button"><span aria-hidden="true">{String(number + 1).padStart(2, "0")}</span>{item.label}</button>)}
    </nav>
    <details className="instruction-scene__method"><summary>Что эта сцена показывает, а что нужно проверить</summary><p>Сцена объясняет порядок действий. Размеры деталей условные; по ней нельзя выбирать анкеры или сверлить стену. Для своей модели используйте паспорт, расчёт ниже и инструкцию кронштейна. Точные числа планировщика рассчитываются отдельно в вашем браузере.</p></details>
  </section>;
}
