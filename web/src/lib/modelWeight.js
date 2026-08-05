const ALLOWED_WEIGHT_BASES = new Set([
  "without_stand",
  "with_stand",
  "published_unspecified",
]);

export function modelWeightBasis(model) {
  const value = model?.weight_basis ?? "without_stand";
  return ALLOWED_WEIGHT_BASES.has(value) ? value : "published_unspecified";
}

export function modelWeightLabel(model) {
  return modelWeightBasis(model) === "without_stand"
    ? "Паспортная масса"
    : "Консервативная масса";
}

export function modelWeightSuffix(model) {
  switch (modelWeightBasis(model)) {
    case "with_stand":
      return "с подставкой, консервативно";
    case "published_unspecified":
      return "тип не указан, консервативно";
    default:
      return "без подставки";
  }
}

export function modelWeightReserveText(model) {
  switch (modelWeightBasis(model)) {
    case "with_stand":
      return "Использована опубликованная масса с подставкой: она выше массы корпуса и даёт консервативный порог. Затем добавлен запас 25%.";
    case "published_unspecified":
      return "Источник не уточняет тип опубликованной массы, поэтому значение целиком принято как консервативное. Затем добавлен запас 25%.";
    default:
      return "К паспортной массе телевизора без подставки добавлен запас 25%.";
  }
}
