import editorialPolicy from "../../../data/editorial_policy.json";

const evidenceLabels = Object.freeze({
  "seo-reviewed": "Официальные инструкции и редакционная проверка",
  "seo-calculated": "Источники, формула и перечисленные допущения",
  "verified-model": "Официальные характеристики и расчёт совместимости",
  mount: "Паспорт кронштейна и граф совместимости",
  "observed-model": "Наблюдение ассортимента без технической рекомендации",
});

export function buildEditorialEvidence({ contentKind, checkedAt }) {
  const basis = evidenceLabels[contentKind];
  if (!basis) {
    throw new Error(`Неизвестное основание редакционного материала: ${contentKind}`);
  }
  if (!isValidIsoDate(checkedAt)) {
    throw new Error(`Некорректная дата редакционной проверки: ${checkedAt}`);
  }
  if (
    editorialPolicy.schema_version !== 1
    || editorialPolicy.author?.name !== "Редакция KREPI TV"
    || editorialPolicy.author?.path !== "/redaktsiya/"
    || editorialPolicy.physical_test?.status !== "not_tested"
    || editorialPolicy.physical_test?.label !== "Физический тест не проводился"
  ) {
    throw new Error("Редакционный контракт KREPI TV нарушен");
  }

  return Object.freeze({
    author: editorialPolicy.author,
    automationDisclosure: editorialPolicy.automation_disclosure,
    basis,
    checkedAt,
    checkedLabel: formatEditorialDate(checkedAt),
    correctionsPath: editorialPolicy.corrections_path,
    methodologyPath: editorialPolicy.methodology_path,
    physicalTest: editorialPolicy.physical_test,
    sourcePolicy: editorialPolicy.source_policy,
  });
}

export function formatEditorialDate(value) {
  if (!isValidIsoDate(value)) {
    throw new Error(`Некорректная дата редакционной проверки: ${value}`);
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value ?? "")) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}
