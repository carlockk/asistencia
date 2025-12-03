"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const emptyForm = {
  username: "",
  password: "",
  role: "employee",
  firstName: "",
  lastName: "",
  docType: "RUT",
  docNumber: "",
  address: "",
  commune: "",
  city: "",
  email: "",
  hourlyRate: "",
  observation: "",
  avatarUrl: ""
};

export default function AdminUserEditClient({ userId }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/users/${userId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error cargando usuario");
        setForm({
          username: data.user.username || "",
          password: "",
          role: data.user.role || "employee",
          firstName: data.user.firstName || "",
          lastName: data.user.lastName || "",
          docType: data.user.docType || "RUT",
          docNumber: data.user.docNumber || "",
          address: data.user.address || "",
          commune: data.user.commune || "",
          city: data.user.city || "",
          email: data.user.email || "",
          hourlyRate: data.user.hourlyRate ?? "",
          observation: data.user.observation || "",
          avatarUrl: data.user.avatarUrl || ""
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [userId]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setInfo("");
    try {
      const payload = { ...form };
      if (!payload.password) {
        delete payload.password;
      }
      payload.hourlyRate =
        payload.hourlyRate === "" ? 0 : Number(payload.hourlyRate);

      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error guardando usuario");
      setInfo("Perfil actualizado correctamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    router.push("/admin");
  }

  async function handleAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setError("");
    setInfo("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error subiendo la imagen");
      setForm((prev) => ({ ...prev, avatarUrl: data.url }));
      setInfo("Imagen subida. Guarda para aplicar cambios.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex items-start md:items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="card p-5 md:p-6 relative">
          <button
            type="button"
            className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
            onClick={goBack}
            aria-label="Cerrar modal de edicion"
          >
            ✕
          </button>
          <div className="flex items-center justify-between gap-2 pr-8">
            <div>
              <p className="text-xs text-slate-500">Edicion de usuario</p>
              <h2 className="text-lg font-semibold text-slate-800">
                {form.username || "Usuario"}
              </h2>
            </div>
            <button
              className="btn-secondary text-xs px-3 py-1.5"
              type="button"
              onClick={handleLogout}
            >
              Cerrar sesion
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500 mt-3">Cargando usuario...</p>
          ) : (
            <>
              {error && (
                <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-2xl mt-3">
                  {error}
                </p>
              )}
              {info && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-2xl mt-3">
                  {info}
                </p>
              )}

              <form className="space-y-3 text-xs mt-3" onSubmit={handleSave}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Usuario</label>
                    <input
                      className="input"
                      value={form.username}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Contrasena (opcional)</label>
                    <input
                      type="password"
                      className="input"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      placeholder="Dejar vacio para mantener"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Nombre</label>
                    <input
                      className="input"
                      value={form.firstName}
                      onChange={(e) =>
                        setForm({ ...form, firstName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Apellido</label>
                    <input
                      className="input"
                      value={form.lastName}
                      onChange={(e) =>
                        setForm({ ...form, lastName: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Tipo doc</label>
                    <select
                      className="input"
                      value={form.docType}
                      onChange={(e) =>
                        setForm({ ...form, docType: e.target.value })
                      }
                    >
                      <option value="RUT">RUT</option>
                      <option value="DNI">DNI</option>
                      <option value="Pasaporte">Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">No documento</label>
                    <input
                      className="input"
                      value={form.docNumber}
                      onChange={(e) =>
                        setForm({ ...form, docNumber: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Comuna</label>
                    <input
                      className="input"
                      value={form.commune}
                      onChange={(e) =>
                        setForm({ ...form, commune: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Ciudad</label>
                    <input
                      className="input"
                      value={form.city}
                      onChange={(e) =>
                        setForm({ ...form, city: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Direccion</label>
                  <input
                    className="input"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="label">Correo</label>
                  <input
                    className="input"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Valor hora ($)</label>
                    <input
                      type="number"
                      className="input"
                      value={form.hourlyRate}
                      onChange={(e) =>
                        setForm({ ...form, hourlyRate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Rol</label>
                    <select
                      className="input"
                      value={form.role}
                      onChange={(e) =>
                        setForm({ ...form, role: e.target.value })
                      }
                    >
                      <option value="employee">Empleado</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Observacion</label>
                  <textarea
                    className="input min-h-[60px]"
                    value={form.observation}
                    onChange={(e) =>
                      setForm({ ...form, observation: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="label">URL foto de perfil</label>
                  <input
                    className="input"
                    value={form.avatarUrl}
                    onChange={(e) =>
                      setForm({ ...form, avatarUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="text-[11px] text-slate-600 mt-2"
                    onChange={handleAvatarFile}
                    disabled={uploadingAvatar}
                  />
                  {uploadingAvatar && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Subiendo imagen a Cloudinary...
                    </p>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
