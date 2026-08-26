export const REQUIRED_METRIKA_GOALS = Object.freeze([
  Object.freeze({
    eventId: "market_click",
    name: "Переход на Яндекс Маркет",
  }),
  Object.freeze({
    eventId: "result_completed",
    name: "Готовый результат расчёта или подбора",
  }),
  Object.freeze({
    eventId: "mount_detail_click",
    name: "Переход к карточке кронштейна",
  }),
  Object.freeze({
    eventId: "installation_kit_interaction",
    name: "Действие со сводкой монтажного комплекта",
  }),
]);

function isExactActionGoal(goal, eventId) {
  return goal?.type === "action"
    && Array.isArray(goal.conditions)
    && goal.conditions.length === 1
    && goal.conditions[0]?.type === "exact"
    && goal.conditions[0]?.url === eventId;
}

export function actionGoalPayload(definition) {
  return {
    goal: {
      name: definition.name,
      type: "action",
      conditions: [{ type: "exact", url: definition.eventId }],
    },
  };
}

export function planMetrikaGoals(currentGoals, required = REQUIRED_METRIKA_GOALS) {
  if (!Array.isArray(currentGoals)) throw new TypeError("currentGoals must be an array");

  return required.map((definition) => {
    const exact = currentGoals.filter((goal) => isExactActionGoal(goal, definition.eventId));
    const sameName = currentGoals.filter((goal) => goal?.name === definition.name);
    if (exact.length === 1) {
      return {
        eventId: definition.eventId,
        goalId: exact[0].id,
        name: exact[0].name,
        status: "satisfied",
      };
    }
    if (exact.length > 1) {
      return {
        count: exact.length,
        eventId: definition.eventId,
        status: "conflict_duplicate_condition",
      };
    }
    if (sameName.length > 0) {
      return {
        count: sameName.length,
        eventId: definition.eventId,
        status: "conflict_name_mismatch",
      };
    }
    return {
      eventId: definition.eventId,
      name: definition.name,
      status: "missing",
    };
  });
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw_error: text.slice(0, 500) };
  }
}

function safeApiError(payload) {
  const first = Array.isArray(payload?.errors) ? payload.errors[0] : null;
  return first?.error_type ?? payload?.code ?? "unknown_api_error";
}

export async function reconcileMetrikaGoals({
  apply = false,
  counterId,
  fetchImpl = globalThis.fetch,
  required = REQUIRED_METRIKA_GOALS,
  token,
}) {
  if (!/^\d+$/.test(String(counterId ?? ""))) throw new Error("counterId must be numeric");
  if (typeof token !== "string" || token.length < 16) throw new Error("OAuth token is missing");
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation is missing");

  const endpoint = `https://api-metrika.yandex.net/management/v1/counter/${counterId}/goals`;
  const headers = {
    Accept: "application/json",
    Authorization: `OAuth ${token}`,
  };

  async function loadGoals() {
    const response = await fetchImpl(endpoint, { headers, method: "GET" });
    const payload = await readJsonResponse(response);
    if (!response.ok || !Array.isArray(payload.goals)) {
      throw new Error(`Metrika goals GET failed: HTTP ${response.status}, ${safeApiError(payload)}`);
    }
    return payload.goals;
  }

  let goals = await loadGoals();
  let plan = planMetrikaGoals(goals, required);
  const conflicts = plan.filter((item) => item.status.startsWith("conflict_"));
  if (conflicts.length > 0 || !apply) {
    return { applied: false, counterId: String(counterId), plan };
  }

  for (const item of plan.filter((candidate) => candidate.status === "missing")) {
    const definition = required.find((candidate) => candidate.eventId === item.eventId);
    let response;
    try {
      response = await fetchImpl(endpoint, {
        body: JSON.stringify(actionGoalPayload(definition)),
        headers: { ...headers, "Content-Type": "application/json" },
        method: "POST",
      });
    } catch {
      // The request may have reached Yandex before the connection failed. Never
      // retry blindly: load the authoritative list and decide from its state.
      goals = await loadGoals();
      plan = planMetrikaGoals(goals, required);
      const recovered = plan.find((candidate) => candidate.eventId === item.eventId);
      if (recovered?.status === "satisfied") continue;
      throw new Error(`Metrika goal create outcome is unknown for ${item.eventId}`);
    }
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(
        `Metrika goal create failed for ${item.eventId}: HTTP ${response.status}, ${safeApiError(payload)}`,
      );
    }
    goals = await loadGoals();
    plan = planMetrikaGoals(goals, required);
    const verified = plan.find((candidate) => candidate.eventId === item.eventId);
    if (verified?.status !== "satisfied") {
      throw new Error(`Metrika did not verify created goal ${item.eventId}`);
    }
  }

  plan = planMetrikaGoals(await loadGoals(), required);
  return {
    applied: true,
    counterId: String(counterId),
    plan,
  };
}
