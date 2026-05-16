import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { login } from "../api/auth.api";
import { applyAuthPayload } from "../lib/session";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = await login({ email, password, tenantSlug: tenantSlug.trim() || undefined });
      applyAuthPayload(payload);
      const params = new URLSearchParams(window.location.search);
      await navigate({ to: params.get("redirect") || "/tasks" });
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">⚡ CRM<span>Pro</span></div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your workspace</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className="form-input"
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tenant slug <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span></label>
            <input
              className="form-input"
              placeholder="my-company"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
            />
          </div>

          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 8, padding: "10px 14px",
              fontSize: 13, color: "#dc2626"
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: "100%", height: 42, fontSize: 14, marginTop: 4 }}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="auth-divider">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
