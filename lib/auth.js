import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
export const ALLOWED_ROLES = ["admin", "employee", "evaluator"];

export function normalizeRoles(rawRoles, fallback = "employee") {
  const list = Array.isArray(rawRoles)
    ? rawRoles
    : typeof rawRoles === "string" && rawRoles
    ? [rawRoles]
    : [];

  const filtered = list.filter((r) => ALLOWED_ROLES.includes(r));
  // Si incluye admin, se fuerza a solo admin para evitar combinaciones
  if (filtered.includes("admin")) {
    return ["admin"];
  }
  const unique = Array.from(new Set(filtered));

  if (unique.length === 0) {
    return [ALLOWED_ROLES.includes(fallback) ? fallback : "employee"];
  }
  return unique;
}

export function getRolesFromUser(user) {
  if (!user) return ["employee"];
  const raw = Array.isArray(user.roles) && user.roles.length ? user.roles : user.role;
  const fallback = ALLOWED_ROLES.includes(user.role) ? user.role : "employee";
  const roles = normalizeRoles(raw, fallback);
  if (fallback === "admin" && !roles.includes("admin")) {
    return ["admin"];
  }
  return roles;
}

export function pickPrimaryRole(roles = []) {
  if (roles.includes("admin")) return "admin";
  return roles[0] || "employee";
}

export function signToken(user) {
  const roles = getRolesFromUser(user);
  const payload = {
    id: user._id?.toString?.() || user.id,
    role: pickPrimaryRole(roles),
    roles,
    name: user.firstName || user.username
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
