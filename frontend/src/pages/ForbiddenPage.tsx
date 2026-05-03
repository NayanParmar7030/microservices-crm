import { Link } from "@tanstack/react-router";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export function ForbiddenPage() {
  return (
    <section className="mx-auto mt-12 max-w-xl">
      <Card className="text-center">
        <h2 className="text-xl font-semibold text-slate-900">Access denied</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your role does not have permission to view this route.
        </p>
        <div className="mt-4">
          <Link to="/tasks">
            <Button>Back to tasks</Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}
