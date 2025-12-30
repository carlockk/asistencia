export const ratingOptions = [
  { value: "siempre", label: "Siempre" },
  { value: "casi_siempre", label: "Casi siempre" },
  { value: "aveces", label: "A veces" },
  { value: "nunca", label: "Nunca" }
];

export const ratingLabel = ratingOptions.reduce((acc, opt) => {
  acc[opt.value] = opt.label;
  return acc;
}, {});

export function fieldTypeForItem(item) {
  if (item?.fieldType) return item.fieldType;
  if (item?.type) return item.type;
  if (item?.hasCheck === false) return "section";
  return "rating";
}

export function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `node-${Math.random().toString(16).slice(2)}`;
}

export function flattenItems(items = [], acc = []) {
  items.forEach((item) => {
    if (item?.id) acc.push(item.id);
    if (item?.children?.length) flattenItems(item.children, acc);
  });
  return acc;
}

export function collectCheckableIds(items = [], acc = []) {
  items.forEach((item) => {
    const fieldType = fieldTypeForItem(item);
    const hasCheck = fieldType === "section" ? false : item?.hasCheck !== false;
    if (hasCheck && item?.id) acc.push(item.id);
    if (item?.children?.length) collectCheckableIds(item.children, acc);
  });
  return acc;
}

export function optionsForItem(item) {
  const fieldType = fieldTypeForItem(item);
  if (fieldType === "boolean") {
    return [
      { value: "si", label: "Si" },
      { value: "no", label: "No" }
    ];
  }
  if (fieldType === "select") {
    if (!Array.isArray(item?.options)) return [];
    return item.options.map((opt) => ({
      value: opt.value || opt.label?.toLowerCase()?.replace(/\s+/g, "_") || "",
      label: opt.label || opt.value
    }));
  }
  if (Array.isArray(item?.options) && item.options.length > 0) {
    return item.options.map((opt) => ({
      value: opt.value || opt.label?.toLowerCase()?.replace(/\s+/g, "_") || "",
      label: opt.label || opt.value
    }));
  }
  return ratingOptions;
}
