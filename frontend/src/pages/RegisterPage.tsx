import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { register } from "../api/auth.api";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { applyAuthPayload } from "../lib/session";

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    organizationName: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = await register(form);
      applyAuthPayload(payload);
      await navigate({ to: "/tasks" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto mt-12 max-w-md">
      <Card>
        <h2 className="text-xl font-semibold text-slate-900">Create account</h2>
        <p className="mt-1 text-sm text-slate-500">Provision tenant and admin user in one step.</p>
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <Input
            className="w-full"
            placeholder="Organization name"
            required
            value={form.organizationName}
            onChange={(event) => setForm((prev) => ({ ...prev, organizationName: event.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="First name"
              required
              value={form.firstName}
              onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
            />
            <Input
              placeholder="Last name"
              required
              value={form.lastName}
              onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
            />
          </div>
          <Input
            className="w-full"
            type="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <Input
            className="w-full"
            type="password"
            placeholder="Password"
            required
            minLength={8}
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create account"}
          </Button>
        </form>
        <p className="mt-3 text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="font-medium text-indigo-600 hover:text-indigo-700" to="/login">
            Sign in
          </Link>
        </p>
      </Card>
    </section>
  );
}
