import assert from "node:assert/strict";
import test from "node:test";
import {
  actionGoalPayload,
  planMetrikaGoals,
  reconcileMetrikaGoals,
} from "../../scripts/analytics/metrika-goals.mjs";

const token = "x".repeat(32);

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return JSON.stringify(payload); },
  };
}

function actionGoal(id, name, eventId, conditionType = "exact") {
  return {
    conditions: [{ type: conditionType, url: eventId }],
    id,
    name,
    type: "action",
  };
}

test("plan accepts exactly one exact action goal per event", () => {
  const goals = [
    actionGoal(1, "A", "market_click"),
    actionGoal(2, "B", "result_completed"),
    actionGoal(3, "C", "mount_detail_click"),
  ];
  assert.deepEqual(
    planMetrikaGoals(goals).map((item) => [item.eventId, item.status, item.goalId]),
    [
      ["market_click", "satisfied", 1],
      ["result_completed", "satisfied", 2],
      ["mount_detail_click", "satisfied", 3],
    ],
  );
});

test("plan refuses duplicates and same-name goals with another condition", () => {
  const goals = [
    actionGoal(1, "A", "market_click"),
    actionGoal(2, "B", "market_click"),
    actionGoal(3, "Готовый результат расчёта или подбора", "other_event"),
  ];
  const plan = planMetrikaGoals(goals);
  assert.equal(plan[0].status, "conflict_duplicate_condition");
  assert.equal(plan[1].status, "conflict_name_mismatch");
  assert.equal(plan[2].status, "missing");
});

test("payload contains only the exact JavaScript event condition", () => {
  assert.deepEqual(actionGoalPayload({ eventId: "result_completed", name: "Result" }), {
    goal: {
      conditions: [{ type: "exact", url: "result_completed" }],
      name: "Result",
      type: "action",
    },
  });
});

test("dry run never posts missing goals", async () => {
  const calls = [];
  const fetchImpl = async (_url, options) => {
    calls.push(options.method);
    return response({ goals: [actionGoal(1, "Market", "market_click")] });
  };
  const result = await reconcileMetrikaGoals({ counterId: 111176777, fetchImpl, token });
  assert.deepEqual(calls, ["GET"]);
  assert.equal(result.applied, false);
  assert.deepEqual(result.plan.map((item) => item.status), ["satisfied", "missing", "missing"]);
});

test("apply creates missing goals sequentially and verifies each authoritative list", async () => {
  let goals = [actionGoal(1, "Market", "market_click")];
  const methods = [];
  const fetchImpl = async (_url, options) => {
    methods.push(options.method);
    if (options.method === "GET") return response({ goals });
    const body = JSON.parse(options.body).goal;
    goals = [...goals, actionGoal(goals.length + 1, body.name, body.conditions[0].url)];
    return response({ goal: goals.at(-1) });
  };
  const result = await reconcileMetrikaGoals({
    apply: true,
    counterId: 111176777,
    fetchImpl,
    token,
  });
  assert.equal(result.applied, true);
  assert.equal(result.plan.every((item) => item.status === "satisfied"), true);
  assert.equal(methods.filter((method) => method === "POST").length, 2);
});

test("network failure after POST is resolved by GET and is never blindly retried", async () => {
  let goals = [
    actionGoal(1, "Market", "market_click"),
    actionGoal(2, "Mount", "mount_detail_click"),
  ];
  let postCount = 0;
  const fetchImpl = async (_url, options) => {
    if (options.method === "GET") return response({ goals });
    postCount += 1;
    const body = JSON.parse(options.body).goal;
    goals = [...goals, actionGoal(3, body.name, body.conditions[0].url)];
    throw new Error("connection reset after remote commit");
  };
  const result = await reconcileMetrikaGoals({
    apply: true,
    counterId: 111176777,
    fetchImpl,
    token,
  });
  assert.equal(postCount, 1);
  assert.equal(result.plan.every((item) => item.status === "satisfied"), true);
});
