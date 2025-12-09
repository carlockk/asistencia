"use client";

function ActionButton({ label, onClick, title }) {
  return (
    <button
      type="button"
      className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-[11px] text-slate-600 hover:border-slate-300 hover:text-slate-800"
      onClick={onClick}
      title={title}
    >
      {label}
    </button>
  );
}

export function TreeEditor({
  items,
  level = 0,
  onChangeTitle,
  onAddChild,
  onRemove,
  onMoveUp,
  onMoveDown,
  onPromote,
  onDemote,
  onToggleCheck,
  onChangeOptions,
  enableReorder = false
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="border border-slate-100 rounded-xl bg-white/70 p-3"
          style={{ marginLeft: level * 18 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Nivel {level + 1}</span>
            <input
              className="input text-xs flex-1"
              value={item.title}
              onChange={(e) => onChangeTitle(item.id, e.target.value)}
              placeholder="Pregunta o item"
            />
            <label className="flex items-center gap-1 text-[11px] text-slate-600">
              <input
                type="checkbox"
                checked={item.hasCheck !== false}
                onChange={() => onToggleCheck(item.id)}
              />
              Tiene check
            </label>
            {item.hasCheck !== false && (
              <div className="flex items-center gap-1 text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  checked={Array.isArray(item.options) && item.options.length > 0}
                  onChange={(e) =>
                    onChangeOptions(
                      item.id,
                      e.target.checked
                        ? item.options?.map((opt) => opt.label).join("\n") || ""
                        : ""
                    )
                  }
                />
                Opciones personalizadas
              </div>
            )}
            <div className="flex items-center gap-1">
              {enableReorder && (
                <>
                  <ActionButton label="↑" title="Subir" onClick={() => onMoveUp(item.id)} />
                  <ActionButton
                    label="↓"
                    title="Bajar"
                    onClick={() => onMoveDown(item.id)}
                  />
                  <ActionButton
                    label="←"
                    title="Subir nivel"
                    onClick={() => onPromote(item.id)}
                  />
                  <ActionButton
                    label="→"
                    title="Bajar nivel"
                    onClick={() => onDemote(item.id)}
                  />
                </>
              )}
              <button
                type="button"
                className="btn-secondary text-[11px] px-2 py-1"
                onClick={() => onAddChild(item.id)}
              >
                + Sub item
              </button>
              <button
                type="button"
                className="text-rose-600 text-[11px] px-2 py-1"
                onClick={() => onRemove(item.id)}
              >
                Quitar
              </button>
            </div>
          </div>
          {item.children?.length ? (
            <div className="mt-2">
              <TreeEditor
                items={item.children}
                level={level + 1}
                onChangeTitle={onChangeTitle}
                onAddChild={onAddChild}
                onRemove={onRemove}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                onPromote={onPromote}
                onDemote={onDemote}
                onToggleCheck={onToggleCheck}
                onChangeOptions={onChangeOptions}
                enableReorder={enableReorder}
              />
            </div>
          ) : null}
          {item.hasCheck !== false && Array.isArray(item.options) && item.options.length > 0 && (
            <div className="mt-2">
              <label className="label text-[11px]">Opciones (una por línea)</label>
              <textarea
                className="input text-[12px] min-h-[70px]"
                value={item.options.map((opt) => opt.label).join("\n")}
                onChange={(e) => onChangeOptions(item.id, e.target.value)}
                placeholder={"Siempre\nCasi siempre\nA veces\nNunca"}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ReadOnlyTree({ items, responses = [], level = 0, ratingLabel }) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const resp = responses.find((r) => r.itemId === item.id);
        return (
          <div
            key={item.id}
            className="border border-slate-100 rounded-xl bg-white/60 p-3"
            style={{ marginLeft: level * 18 }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800">{item.title}</p>
              {item.hasCheck === false ? (
                <span className="text-[11px] text-slate-500">Solo título</span>
              ) : resp ? (
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-slate-800 text-white">
                  {ratingLabel?.[resp.value] || resp.value}
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">Sin respuesta</span>
              )}
            </div>
            {resp?.comment ? (
              <p className="text-[11px] text-slate-600 mt-1">{resp.comment}</p>
            ) : null}
            {item.children?.length ? (
              <div className="mt-2">
                <ReadOnlyTree
                  items={item.children}
                  responses={responses}
                  level={level + 1}
                  ratingLabel={ratingLabel}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
