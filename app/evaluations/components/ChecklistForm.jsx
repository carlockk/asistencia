"use client";

import { fieldTypeForItem, optionsForItem } from "../utils";

function FieldLabel({ text }) {
  return <p className="text-sm font-semibold text-slate-800 mb-2">{text}</p>;
}

function ItemContainer({ children, level }) {
  return (
    <div
      className="border border-slate-100 rounded-xl bg-white/70 p-3"
      style={{ marginLeft: level * 18 }}
    >
      {children}
    </div>
  );
}

export default function ChecklistForm({ items, responseMap, onChange, level = 0 }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const fieldType = fieldTypeForItem(item);
        const value = responseMap[item.id] ?? "";
        return (
          <ItemContainer key={item.id} level={level}>
            <FieldLabel text={item.title} />
            {fieldType === "section" ? (
              <p className="text-[11px] text-slate-500 mb-1">Solo titulo, sin respuesta.</p>
            ) : null}
            {fieldType === "rating" ? (
              <div className="flex flex-wrap gap-2">
                {optionsForItem(item).map((opt) => (
                  <label
                    key={opt.value}
                    className={`px-3 py-1 rounded-full border text-[12px] cursor-pointer ${
                      value === opt.value
                        ? "bg-banco-rojo text-white border-banco-rojo"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`resp-${item.id}`}
                      value={opt.value}
                      className="hidden"
                      checked={value === opt.value}
                      onChange={() => onChange(item.id, opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            ) : null}
            {fieldType === "select" ? (
              <select
                className="input text-[12px]"
                value={value}
                onChange={(e) => onChange(item.id, e.target.value)}
              >
                <option value="">Selecciona una opcion</option>
                {optionsForItem(item).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : null}
            {fieldType === "boolean" ? (
              <div className="flex flex-wrap gap-2">
                {optionsForItem(item).map((opt) => (
                  <label
                    key={opt.value}
                    className={`px-3 py-1 rounded-full border text-[12px] cursor-pointer ${
                      value === opt.value
                        ? "bg-banco-rojo text-white border-banco-rojo"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`resp-${item.id}`}
                      value={opt.value}
                      className="hidden"
                      checked={value === opt.value}
                      onChange={() => onChange(item.id, opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            ) : null}
            {fieldType === "number" ? (
              <input
                type="number"
                className="input text-[12px]"
                value={value}
                onChange={(e) => onChange(item.id, e.target.value)}
                placeholder="0"
              />
            ) : null}
            {fieldType === "text" ? (
              <textarea
                className="input text-[12px] min-h-[70px]"
                value={value}
                onChange={(e) => onChange(item.id, e.target.value)}
                placeholder="Escribe aqui"
              />
            ) : null}
            {fieldType === "date" ? (
              <input
                type="date"
                className="input text-[12px]"
                value={value}
                onChange={(e) => onChange(item.id, e.target.value)}
              />
            ) : null}
            {fieldType === "time" ? (
              <input
                type="time"
                className="input text-[12px]"
                value={value}
                onChange={(e) => onChange(item.id, e.target.value)}
              />
            ) : null}
            {item.children?.length ? (
              <div className="mt-2">
                <ChecklistForm
                  items={item.children}
                  responseMap={responseMap}
                  onChange={onChange}
                  level={level + 1}
                />
              </div>
            ) : null}
          </ItemContainer>
        );
      })}
    </div>
  );
}
