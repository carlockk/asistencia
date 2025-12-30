"use client";

import AdminEvaluationsClient from "./AdminEvaluationsClient";
import EvaluatorEvaluationsClient from "./EvaluatorEvaluationsClient";

export default function EvaluationsClient({ roles = [], userName }) {
  const r = Array.isArray(roles) ? roles : [roles];
  if (r.includes("admin")) {
    return <AdminEvaluationsClient adminName={userName} />;
  }
  return <EvaluatorEvaluationsClient evaluatorName={userName} roles={r} />;
}
