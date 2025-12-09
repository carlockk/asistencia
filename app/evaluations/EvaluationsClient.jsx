"use client";

import AdminEvaluationsClient from "./AdminEvaluationsClient";
import EvaluatorEvaluationsClient from "./EvaluatorEvaluationsClient";

export default function EvaluationsClient({ role, userName }) {
  if (role === "admin") {
    return <AdminEvaluationsClient adminName={userName} />;
  }
  return <EvaluatorEvaluationsClient evaluatorName={userName} />;
}
