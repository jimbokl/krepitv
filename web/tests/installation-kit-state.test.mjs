import assert from "node:assert/strict";
import test from "node:test";
import {
  canAdvance,
  createInstallationKitState,
  getCompletedSteps,
  initialInstallationKitState,
  installationKitModelIdFromSearch,
  installationKitReducer,
} from "../src/lib/installationKitState.js";

const model = { id: "tcl-65c7k", brand: "TCL" };

function reduce(state, type, value) {
  return installationKitReducer(state, { type, value });
}

test("fresh and model-deep-link states contain only allowed initial data", () => {
  assert.deepEqual(initialInstallationKitState, {
    step: 1,
    brand: "",
    modelId: null,
    wallProfile: null,
    mechanism: null,
    mountId: null,
    placement: null,
    cables: null,
    revision: 0,
  });
  assert.deepEqual(createInstallationKitState({ model }), {
    ...initialInstallationKitState,
    step: 2,
    brand: "TCL",
    modelId: "tcl-65c7k",
  });
  assert.equal(
    installationKitModelIdFromSearch("?model=tcl-65c7k&wall=concrete&height=120"),
    "tcl-65c7k",
  );
  assert.equal(installationKitModelIdFromSearch("?wall=concrete"), null);
  assert.equal(installationKitModelIdFromSearch("?model=../../secret"), null);
});

test("the reducer advances through six steps only after valid answers", () => {
  let state = createInstallationKitState();
  assert.equal(canAdvance(state), false);

  state = reduce(state, "set-brand", "TCL");
  assert.equal(canAdvance(state), true);
  state = reduce(state, "advance");
  assert.equal(state.step, 2);

  state = reduce(state, "set-model", "tcl-65c7k");
  state = reduce(state, "advance");
  state = reduce(state, "set-wall-profile", "concrete");
  state = reduce(state, "advance");
  state = reduce(state, "set-mechanism", "full-motion");
  state = reduce(state, "advance");
  state = reduce(state, "set-mount", "kromax-atlantis-65");
  state = reduce(state, "advance");

  assert.equal(state.step, 6);
  assert.equal(canAdvance(state), false);
  state = reduce(state, "set-placement", {
    eye_height_cm: 105,
    viewing_distance_cm: 280,
    viewing_angle_degrees: 0,
    furniture_height_cm: 55,
    furniture_clearance_cm: 10,
    desired_turn_degrees: 25,
    safety_clearance_cm: 3,
  });
  state = reduce(state, "set-cables", {
    routing: "open",
    connections: ["power", "hdmi"],
    spare_length_cm: 30,
  });

  assert.equal(canAdvance(state), true);
  assert.deepEqual(getCompletedSteps(state), [1, 2, 3, 4, 5, 6]);
});

test("changing an upstream answer clears every dependent answer", () => {
  let state = {
    step: 6,
    brand: "TCL",
    modelId: "tcl-65c7k",
    wallProfile: "concrete",
    mechanism: "full-motion",
    mountId: "kromax-atlantis-65",
    placement: { eye_height_cm: 105, viewing_distance_cm: 280 },
    cables: { routing: "open", connections: ["hdmi"] },
    revision: 3,
  };

  state = reduce(state, "set-wall-profile", "solid-brick");
  assert.deepEqual(state, {
    ...initialInstallationKitState,
    step: 3,
    brand: "TCL",
    modelId: "tcl-65c7k",
    wallProfile: "solid-brick",
    revision: 4,
  });

  state = reduce(state, "set-brand", "Hisense");
  assert.deepEqual(state, {
    ...initialInstallationKitState,
    brand: "Hisense",
    revision: 5,
  });
});

test("back and guarded step navigation never create an impossible state", () => {
  let state = createInstallationKitState({ model });
  state = reduce(state, "go-to-step", 6);
  assert.equal(state.step, 2);
  state = reduce(state, "back");
  assert.equal(state.step, 1);
  state = reduce(state, "go-to-step", 0);
  assert.equal(state.step, 1);
  state = reduce(state, "reset");
  assert.deepEqual(state, initialInstallationKitState);
});
