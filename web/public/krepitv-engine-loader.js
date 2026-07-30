import init, * as engine from "/pkg/krepitv_engine.js";

try {
  await init();
  globalThis.__krepitvEngine = engine;
  globalThis.dispatchEvent(new CustomEvent("krepitv-engine-ready"));
} catch (error) {
  globalThis.__krepitvEngineError = true;
  globalThis.dispatchEvent(new CustomEvent("krepitv-engine-error"));
  throw error;
}
