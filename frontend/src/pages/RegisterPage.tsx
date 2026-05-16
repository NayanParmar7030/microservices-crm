import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { register } from "../api/auth.api";
import { applyAuthPayload } from "../lib/session";

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    organizationName: "", firstName: "", lastName: "", email: "", password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = await register(form);
      applyAuthPayload(payload);
      await navigate({ to: "/tasks" });
    } catch {
      setError("Registration failed. Email may already be in use.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">⚡ CRM<span>Pro</span></div>
        <h1 className="auth-title">Create your workspace</h1>
        <p className="auth-subtitle">Set up your organization in seconds</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Organization name</label>
            <input
              className="form-input"
              required
              placeholder="Acme Inc."
              value={form.organizationName}
              onChange={set("organizationName")}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">First name</label>
              <input className="form-input" required placeholder="John" value={form.firstName} onChange={set("firstName")} />
            </div>
            <div className="form-group">
              <label className="form-label">Last name</label>
              <input className="form-input" required placeholder="Doe" value={form.lastName} onChange={set("lastName")} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Work email</label>
            <input className="form-input" type="email" required placeholder="you@company.com" value={form.email} onChange={set("email")} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" required minLength={8} placeholder="Min. 8 characters" value={form.password} onChange={set("password")} />
          </div>

          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626"
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
            {submitting ? "Creating workspace..." : "Create account"}
          </button>
        </form>

        <div className="auth-divider">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
