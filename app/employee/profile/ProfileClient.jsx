"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../../components/TopBar";
import RoleNav from "../../components/RoleNav";

export default function ProfileClient({ roles = [] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    avatarUrl: "",
    address: "",
    commune: "",
    city: ""
  });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function loadMe() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/me");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error cargando perfil");
      setUser(data.user);
      setForm({
        firstName: data.user.firstName || "",
        lastName: data.user.lastName || "",
        email: data.user.email || "",
        avatarUrl: data.user.avatarUrl || "",
        address: data.user.address || "",
        commune: data.user.commune || "",
        city: data.user.city || ""
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch(`/api/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error guardando perfil");
      setInfo("Perfil actualizado correctamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  function handleAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadAvatar(file);
  }

  async function uploadAvatar(file) {
    setUploadingAvatar(true);
    setError("");
    setInfo("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error subiendo la imagen");
      setForm((prev) => ({ ...prev, avatarUrl: data.url }));
      setInfo("Imagen subida correctamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  const topBarName =
    user?.firstName || user?.username || user?.email || "Empleado";

  return (
    <div className="w-full">
      <TopBar
        userName={topBarName}
        subtitle="Perfil"
        avatarUrl={user?.avatarUrl || ""}
        actions={
          <RoleNav
            roles={roles}
            active="/employee/profile"
            onNavigate={router.push}
          />
        }
        onLogout={handleLogout}
      />


      <div className="space-y-4 px-4 pb-4">
        <div className="card p-5 md:p-7 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <div>
              <p className="text-xs text-slate-500">Perfil de empleado</p>
              <h2 className="text-lg font-semibold text-slate-800">
                {user ? user.username : "Cargando..."}
              </h2>
            </div>
          </div>

        {loading ? (
          <p className="text-sm text-slate-500">Cargando perfil...</p>
        ) : (
          <>
            {error && (
              <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-2xl">
                {error}
              </p>
            )}
            {info && (
              <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-2xl">
                {info}
              </p>
            )}

            <form className="space-y-3 text-xs" onSubmit={handleSave}>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-pastel-lila to-pastel-celeste flex items-center justify-center text-slate-700 font-bold text-lg overflow-hidden border border-white/70">
                  {form.avatarUrl ? (
                    <img
                      src={form.avatarUrl}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    form.firstName?.charAt(0) || "U"
                  )}
                </div>
                <div className="flex-1">
                  <label className="label">URL foto de perfil</label>
                  <input
                    className="input"
                    value={form.avatarUrl}
                    onChange={(e) =>
                      setForm({ ...form, avatarUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Puedes pegar una URL o subir una imagen; se almacena en Cloudinary.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    className="text-[11px] text-slate-600 mt-2"
                    onChange={handleAvatarFile}
                    disabled={uploadingAvatar}
                  />
                  {uploadingAvatar && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Subiendo imagen...
                    </p>
                  )}
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

              <div className="pt-2 flex justify-end">
                <button type="submit" className="btn-primary" disabled={saving}>
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
