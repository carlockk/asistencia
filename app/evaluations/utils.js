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
    const hasCheck = item?.hasCheck !== false;
    if (hasCheck && item?.id) acc.push(item.id);
    if (item?.children?.length) collectCheckableIds(item.children, acc);
  });
  return acc;
}
