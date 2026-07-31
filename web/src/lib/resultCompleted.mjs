export const RESULT_COMPLETED_EVENT = "krepitv:result-completed";

const SAFE_CONTROLLED_TOKEN = /^[a-z][a-z0-9_-]{0,63}$/;
const SAFE_PATHNAME = /^\/(?:[A-Za-z0-9_-]+\/?)*$/;

function controlledToken(value) {
  return typeof value === "string" && SAFE_CONTROLLED_TOKEN.test(value)
    ? value
    : undefined;
}

function sameSitePathname(value) {
  return typeof value === "string" &&
    value.length <= 241 &&
    SAFE_PATHNAME.test(value)
    ? value
    : undefined;
}

export function resultCompletedDetail(result = {}, sourcePath) {
  const toolId = controlledToken(result?.toolId);
  const resultType = controlledToken(result?.resultType);
  if (!toolId || !resultType) return false;

  const detail = { toolId, resultType };
  const safeSourcePath = sameSitePathname(sourcePath);
  if (safeSourcePath !== undefined) detail.sourcePath = safeSourcePath;
  if (
    Number.isInteger(result?.resultCount) &&
    result.resultCount >= 0 &&
    result.resultCount <= 1000
  ) {
    detail.resultCount = result.resultCount;
  }
  return detail;
}

export function emitResultCompleted(windowObject, detail) {
  if (
    !windowObject ||
    typeof windowObject.dispatchEvent !== "function" ||
    typeof windowObject.CustomEvent !== "function"
  ) {
    return false;
  }

  const safeDetail = resultCompletedDetail(
    detail,
    detail?.sourcePath ?? windowObject.location?.pathname,
  );
  if (!safeDetail) return false;

  try {
    windowObject.dispatchEvent(
      new windowObject.CustomEvent(RESULT_COMPLETED_EVENT, { detail: safeDetail }),
    );
  } catch {
    return false;
  }
  return true;
}
