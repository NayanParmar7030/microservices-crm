import { Card } from "../components/ui/Card";

export function SettingsUsersPage() {
  return (
    <section className="grid gap-4">
      <Card>
        <h2 className="text-xl font-semibold text-slate-900">User Settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Admin-only area prepared for user and role management screens.
        </p>
      </Card>
    </section>
  );
}
