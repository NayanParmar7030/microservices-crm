import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { login } from "../api/auth.api";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { applyAuthPayload } from "../lib/session";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = await login({
        email,
        password,
        tenantSlug: tenantSlug.trim() || undefined,
      });
      applyAuthPayload(payload);
      const params = new URLSearchParams(window.location.search);
      const redirectTarget = params.get("redirect") || "/tasks";
      await navigate({ to: redirectTarget });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto mt-16 max-w-md">
      <Card>
        <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
        <p className="mt-1 text-sm text-slate-500">Use your CRM account credentials.</p>
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <Input
            className="w-full"
            type="email"
            required
            aria-label="Email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            className="w-full"
            type="password"
            required
            minLength={8}
            aria-label="Password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Input
            className="w-full"
            aria-label="Tenant slug"
            placeholder="Tenant slug (optional)"
            value={tenantSlug}
            onChange={(event) => setTenantSlug(event.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-3 text-sm text-slate-600">
          New here?{" "}
          <Link className="font-medium text-indigo-600 hover:text-indigo-700" to="/register">
            Create account
          </Link>
        </p>
      </Card>
    </section>
  );
}
