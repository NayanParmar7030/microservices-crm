import { useEffect } from "react";
import { refreshSession } from "../api/auth.api";
import { applyAuthPayload } from "../lib/session";
import { useAuthStore } from "../store/auth.store";

export function AuthBootstrap() {
  const setBootstrapped = useAuthStore((state) => state.setBootstrapped);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);

  useEffect(() => {
    if (isBootstrapped) {
      return;
    }
    const run = async () => {
      try {
        const payload = await refreshSession();
        applyAuthPayload(payload);
      } catch {
        // Expected for anonymous sessions.
      } finally {
        setBootstrapped(true);
      }
    };
    void run();
  }, [isBootstrapped, setBootstrapped]);

  return null;
}
