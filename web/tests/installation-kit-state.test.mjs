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
    installationKitModelIdFromSearch("?model=tcl-65c7k&wall=concrete&height=120&connectorClearance=35"),
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
    connectorClearance: {
      connectionKind: "hdmi",
      portDirection: "rearward",
      requiredClearanceMm: 35,
      factSource: "user",
    },
  });

  assert.equal(canAdvance(state), true);
  assert.deepEqual(getCompletedSteps(state), [1, 2, 3, 4, 5, 6]);
});

test("connector clearance is controlled, ephemeral and reset with its dependencies", () => {
  let state = {
    ...createInstallationKitState({ model }),
    step: 6,
    wallProfile: "concrete",
    mechanism: "full-motion",
    mountId: "kromax-atlantis-65",
    revision: 10,
  };
  const placement = {
    eye_height_cm: 105,
    viewing_distance_cm: 280,
    viewing_angle_degrees: 0,
    furniture_height_cm: 55,
    furniture_clearance_cm: 10,
    desired_turn_degrees: 25,
    safety_clearance_cm: 3,
  };
  state = reduce(state, "set-placement", placement);
  state = reduce(state, "set-cables", {
    routing: "open",
    connections: ["power", "hdmi"],
    spare_length_cm: 30,
    connectorClearance: {
      connectionKind: "hdmi",
      portDirection: "rearward",
      requiredClearanceMm: 35,
      factSource: "user",
    },
  });
  assert.equal(state.revision, 12);
  assert.equal(state.cables.connectorClearance.requiredClearanceMm, 35);

  const beforeConnectionChange = state.revision;
  state = reduce(state, "set-cables", {
    ...state.cables,
    connections: ["power"],
  });
  assert.equal(state.revision, beforeConnectionChange + 1);
  assert.equal(state.cables.connectorClearance, null);

  const invalid = reduce(state, "set-cables", {
    routing: "open",
    connections: ["power"],
    spare_length_cm: 30,
    connectorClearance: {
      connectionKind: "hdmi",
      portDirection: "rearward",
      requiredClearanceMm: 35,
      factSource: "user",
    },
  });
  assert.equal(invalid.cables, null);

  state = reduce({
    ...state,
    cables: {
      routing: "open",
      connections: ["power"],
      spare_length_cm: 30,
      connectorClearance: null,
    },
  }, "set-mount", "onkron-m7l");
  assert.equal(state.cables, null);
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
