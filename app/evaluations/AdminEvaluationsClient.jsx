"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../components/TopBar";
import AdminNav from "../components/AdminNav";
import { TreeEditor, ReadOnlyTree } from "./components/TreeEditor";
import { ratingLabel, makeId } from "./utils";
import { useAvatar } from "./useAvatar";

export default function AdminEvaluationsClient({ adminName }) {
  const router = useRouter();
  const avatarUrl = useAvatar();
  const pageSize = 10;
  const nav = (
    <AdminNav active="/evaluations" onNavigate={(path) => router.push(path)} />
  );

  const [checklistForm, setChecklistForm] = useState({
    title: "",
    description: "",
    items: []
  });
  const [checklists, setChecklists] = useState([]);
  const [evaluators, setEvaluators] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignForm, setAssignForm] = useState({
    checklistId: "",
    evaluatorIds: [],
    employeeIds: [],
    applyToAllEmployees: false,
    notes: ""
  });

  const [savingChecklist, setSavingChecklist] = useState(false);
  const [savingAssign, setSavingAssign] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [editingChecklistId, setEditingChecklistId] = useState(null);

  function findContext(list, id, ancestors = []) {
    for (let i = 0; i < list.length; i += 1) {
      const item = list[i];
      if (item.id === id) {
        return { list, index: i, ancestors };
      }
      if (item.children?.length) {
        const res = findContext(item.children, id, [
          ...ancestors,
          { list, index: i, item }
        ]);
        if (res) return res;
      }
    }
    return null;
  }

  function cloneTree(list) {
    return list.map((item) => ({
      ...item,
      children: item.children ? cloneTree(item.children) : []
    }));
  }

  function updateChecklistItems(updater) {
    setChecklistForm((prev) => ({
      ...prev,
      items: updater(cloneTree(prev.items))
    }));
  }

  function moveUp(id) {
    updateChecklistItems((items) => {
      const ctx = findContext(items, id);
      if (!ctx) return items;
      const { list, index } = ctx;
      if (index <= 0) return items;
      [list[index - 1], list[index]] = [list[index], list[index - 1]];
      return items;
    });
  }

  function moveDown(id) {
    updateChecklistItems((items) => {
      const ctx = findContext(items, id);
      if (!ctx) return items;
      const { list, index } = ctx;
      if (index >= list.length - 1) return items;
      [list[index + 1], list[index]] = [list[index], list[index + 1]];
      return items;
    });
  }

  function promote(id) {
    updateChecklistItems((items) => {
      const ctx = findContext(items, id);
      if (!ctx) return items;
      const { list, index, ancestors } = ctx;
      if (ancestors.length === 0) return items; // ya es raiz
      const parentInfo = ancestors[ancestors.length - 1];
      const parentList = parentInfo.list;
      const parentIndex = parentInfo.index;
      const [node] = list.splice(index, 1);
      parentList.splice(parentIndex + 1, 0, node);
      return items;
    });
  }

  function demote(id) {
    updateChecklistItems((items) => {
      const ctx = findContext(items, id);
      if (!ctx) return items;
      const { list, index } = ctx;
      if (index <= 0) return items; // no hay hermano anterior
      const [node] = list.splice(index, 1);
      const prevSibling = list[index - 1];
      prevSibling.children = prevSibling.children || [];
      prevSibling.children.push(node);
      return items;
    });
  }

  function updateNodeTitle(id, value) {
    const update = (list) =>
      list.map((item) => {
        if (item.id === id) return { ...item, title: value };
        if (item.children?.length) {
          return { ...item, children: update(item.children) };
        }
        return item;
      });
    setChecklistForm((prev) => ({ ...prev, items: update(prev.items) }));
  }

  function addChild(id) {
    const add = (list) =>
      list.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            children: [
              ...(item.children || []),
              { id: makeId(), title: "", children: [] }
            ]
          };
        }
        if (item.children?.length) return { ...item, children: add(item.children) };
        return item;
      });
    setChecklistForm((prev) => ({ ...prev, items: add(prev.items) }));
  }

  function removeNode(id) {
    const filter = (list) =>
      list
        .filter((item) => item.id !== id)
        .map((item) => ({
          ...item,
          children: item.children ? filter(item.children) : []
        }));
    setChecklistForm((prev) => ({ ...prev, items: filter(prev.items) }));
  }

  function addRootItem() {
    setChecklistForm((prev) => ({
      ...prev,
      items: [...prev.items, { id: makeId(), title: "", children: [] }]
    }));
  }

  function toggleCheck(id) {
    updateChecklistItems((items) => {
      const ctx = findContext(items, id);
      if (!ctx) return items;
      const current = ctx.list[ctx.index];
      current.hasCheck = current.hasCheck === false ? true : false;
      if (current.hasCheck === false) {
        current.options = [];
      }
      return items;
    });
  }

  function changeOptions(id, text) {
    updateChecklistItems((items) => {
      const ctx = findContext(items, id);
      if (!ctx) return items;
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) {
        ctx.list[ctx.index].options = [];
      } else {
        ctx.list[ctx.index].options = lines.map((label) => ({
          label,
          value: label.toLowerCase().replace(/\s+/g, "_")
        }));
      }
      return items;
    });
  }

  async function loadChecklists() {
    try {
      const res = await fetch("/api/checklists");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error cargando checklists");
      setChecklists(data.checklists || []);
      if (!assignForm.checklistId && data.checklists?.length) {
        setAssignForm((prev) => ({ ...prev, checklistId: data.checklists[0].id }));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadEvaluators() {
    try {
      const res = await fetch("/api/users?role=evaluator");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error cargando evaluadores");
      const mapped = (data.users || []).map((u) => ({
        id: u.id,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username
      }));
      setEvaluators(mapped);
      if (!assignForm.evaluatorIds.length && mapped.length) {
        setAssignForm((prev) => ({ ...prev, evaluatorIds: [mapped[0].id] }));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadEmployees() {
    try {
      const res = await fetch("/api/users?role=employee");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error cargando empleados");
      const mapped = (data.users || []).map((u) => ({
        id: u.id,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username
      }));
      setEmployees(mapped);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadChecklists();
    loadEvaluators();
    loadEmployees();
  }, []);

  async function handleCreateChecklist(e) {
    e.preventDefault();
    setSavingChecklist(true);
    setMessage("");
    setError("");
    try {
      const payload = { ...checklistForm };
      const url = editingChecklistId
        ? `/api/checklists/${editingChecklistId}`
        : "/api/checklists";
      const method = editingChecklistId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error guardando checklist");
      setMessage(
        editingChecklistId
          ? "Checklist actualizado correctamente."
          : "Checklist creado correctamente."
      );
      setChecklistForm({ title: "", description: "", items: [] });
      setEditingChecklistId(null);
      loadChecklists();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingChecklist(false);
    }
  }

  function startEditChecklist(list) {
    setChecklistForm({
      title: list.title,
      description: list.description || "",
      items: list.items || []
    });
    setEditingChecklistId(list.id);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditChecklist() {
    setEditingChecklistId(null);
    setChecklistForm({ title: "", description: "", items: [] });
  }

  async function handleAssign(e) {
    e.preventDefault();
    setSavingAssign(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        ...assignForm,
        employeeIds: assignForm.applyToAllEmployees ? [] : assignForm.employeeIds
      };
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error creando evaluacion");
      setMessage(
        Array.isArray(data.evaluations) && data.evaluations.length > 1
          ? "Evaluaciones asignadas a los evaluadores."
          : "Evaluacion asignada al evaluador."
      );
      setAssignForm((prev) => ({
        ...prev,
        checklistId: "",
        evaluatorIds: [],
        employeeIds: [],
        applyToAllEmployees: false,
        notes: ""
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAssign(false);
    }
  }

  return (
    <div className="space-y-4">
      <TopBar
        userName={adminName}
        subtitle="Checklists y evaluaciones"
        avatarUrl={avatarUrl}
        actions={nav}
        onLogout={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/");
        }}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr,0.9fr] gap-4">
        <div className="card p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs text-slate-500">Construye un checklist</p>
                <h2 className="text-lg font-semibold text-slate-800">
                  {editingChecklistId ? "Editar checklist" : "Estructura jerarquica"}
                </h2>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary" onClick={addRootItem}>
                  + Agregar item raiz
                </button>
                {editingChecklistId && (
                  <button
                    type="button"
                    className="btn-secondary text-[11px]"
                    onClick={cancelEditChecklist}
                  >
                    Cancelar edición
                  </button>
                )}
              </div>
            </div>

          {error && (
            <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-2xl">
              {error}
            </p>
          )}
          {message && (
            <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-2xl">
              {message}
            </p>
          )}

          <form className="space-y-3 text-sm" onSubmit={handleCreateChecklist}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Nombre del checklist</label>
                <input
                  className="input"
                  value={checklistForm.title}
                  onChange={(e) =>
                    setChecklistForm({ ...checklistForm, title: e.target.value })
                  }
                  placeholder="Ej: Higiene y seguridad"
                />
              </div>
              <div>
                <label className="label">Descripcion</label>
                <input
                  className="input"
                  value={checklistForm.description}
                  onChange={(e) =>
                    setChecklistForm({ ...checklistForm, description: e.target.value })
                  }
                  placeholder="Contexto o instrucciones"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white/70 p-3 space-y-3">
              <div className="text-[12px] text-slate-600 flex items-center justify-between">
                <span>
                  Define preguntas y sub-items (Siempre / Casi siempre / A veces / Nunca).
                </span>
                <button
                  type="button"
                  className="btn-secondary text-[11px]"
                  onClick={addRootItem}
                >
                  + Item
                </button>
              </div>
              {checklistForm.items.length === 0 ? (
                <p className="text-[12px] text-slate-500">
                  Aun no hay items. Agrega el primero para comenzar.
                </p>
              ) : (
                <TreeEditor
                  items={checklistForm.items}
                  onChangeTitle={updateNodeTitle}
                  onAddChild={addChild}
                  onRemove={removeNode}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                  onPromote={promote}
                  onDemote={demote}
                  onToggleCheck={toggleCheck}
                  onChangeOptions={changeOptions}
                  enableReorder
                />
              )}
            </div>

            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={savingChecklist}>
                {savingChecklist
                  ? "Guardando..."
                  : editingChecklistId
                  ? "Actualizar checklist"
                  : "Guardar checklist"}
              </button>
            </div>
          </form>
        </div>

        <div className="card p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs text-slate-500">Asignar evaluaciones</p>
                <h2 className="text-lg font-semibold text-slate-800">
                  Envia a un evaluador
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary text-[12px]"
                  onClick={() => window.open("/evaluations/list", "_blank")}
                >
                  Ver evaluaciones
                </button>
              </div>
            </div>

          <form className="space-y-3 text-sm" onSubmit={handleAssign}>
            <div>
              <label className="label">Checklist</label>
              <select
                className="input"
                value={assignForm.checklistId}
                onChange={(e) =>
                  setAssignForm({ ...assignForm, checklistId: e.target.value })
                }
              >
                {checklists.length === 0 && <option value="">Sin listas</option>}
                {checklists.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Evaluadores (selecciona uno o varios)</label>
              <select
                className="input"
                multiple
                value={assignForm.evaluatorIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map(
                    (o) => o.value
                  );
                  setAssignForm({ ...assignForm, evaluatorIds: selected });
                }}
              >
                {evaluators.length === 0 && <option value="">Sin usuarios</option>}
                {evaluators.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Usa Ctrl/⌘ + click para seleccionar m£ltiples.
              </p>
            </div>
            <div className="space-y-2">
              <label className="label">Empleado evaluado (opcional)</label>
              <div className="flex items-center gap-2 text-[12px] text-slate-600">
                <input
                  type="checkbox"
                  className="accent-banco-rojo"
                  checked={assignForm.applyToAllEmployees}
                  onChange={(e) =>
                    setAssignForm((prev) => ({
                      ...prev,
                      applyToAllEmployees: e.target.checked,
                      employeeIds: e.target.checked ? [] : prev.employeeIds
                    }))
                  }
                  id="apply-all-emps"
                />
                <label htmlFor="apply-all-emps" className="cursor-pointer select-none">
                  Aplicar a todos los empleados actuales
                </label>
              </div>
              <select
                className="input"
                multiple
                disabled={assignForm.applyToAllEmployees}
                value={assignForm.employeeIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map(
                    (o) => o.value
                  );
                  setAssignForm({
                    ...assignForm,
                    employeeIds: selected,
                    applyToAllEmployees: false
                  });
                }}
              >
                {employees.length === 0 && <option value="">Sin empleados</option>}
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Si no seleccionas empleado ni marcas la casilla, el checklist queda general.
              </p>
            </div>
            <div>
              <label className="label">Notas u objetivo</label>
              <textarea
                className="input min-h-[80px]"
                value={assignForm.notes}
                onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                placeholder="Indicaciones para el evaluador"
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={savingAssign}>
                {savingAssign ? "Enviando..." : "Crear evaluacion"}
              </button>
            </div>
          </form>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-[12px] text-slate-500 mb-2">
              Checklists creados recientemente
            </p>
            <div className="space-y-2 max-h-48 overflow-auto pr-1">
              {checklists.length === 0 ? (
                <p className="text-[12px] text-slate-500">Aun no hay listas.</p>
              ) : (
                checklists.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl text-[12px]"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{c.title}</p>
                      <p className="text-slate-500">{c.items?.length || 0} preguntas</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn-secondary text-[11px] px-2.5 py-1"
                        onClick={() => startEditChecklist(c)}
                      >
                        Editar
                      </button>
                      <span className="text-slate-500">
                        {new Date(c.createdAt).toLocaleDateString("es-CL")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
