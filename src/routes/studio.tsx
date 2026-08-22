import { useEffect } from "react";
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useSupabaseSession } from "@/lib/supabase/useSession";

export const Route = createFileRoute("/studio")({ component: StudioLayout, errorComponent: StudioError });

function StudioLayout() {
  const session = useSupabaseSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => {
    if (session.status === "signed-out") void navigate({ to: "/login", search: { redirect: pathname } });
  }, [session.status, pathname, navigate]);
  if (session.status !== "signed-in") {
    return <main className="grid min-h-screen place-items-center bg-studio-bg text-studio-text-muted">Carregando…</main>;
  }
  return <Outlet />;
}

// Nothing upstream guards against a saved project failing schema validation on load (an older/incompatible
// version, a field hand-edited in devtools, a partial write from a previous storage-quota failure) — without
// this, that crash was a permanent blank white screen with no way back except manually clearing storage.
function StudioError({ reset }: ErrorComponentProps) {
  const startOver = () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("funnel-studio:"))
      .forEach((key) => localStorage.removeItem(key));
    window.location.href = "/studio";
  };
  return (
    <main className="grid min-h-screen place-items-center bg-studio-bg px-6 text-center text-studio-text">
      <div className="max-w-md">
        <p className="text-sm font-semibold uppercase tracking-wider text-studio-error">Algo deu errado</p>
        <h1 className="mt-3 text-2xl font-semibold">Não conseguimos abrir seu projeto</h1>
        <p className="mt-3 text-sm text-studio-text-secondary">
          Os dados salvos deste projeto podem estar corrompidos ou de uma versão incompatível. Você pode tentar de novo, ou recomeçar do zero (isso apaga os projetos salvos neste navegador).
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="rounded-lg bg-studio-surface-2 px-4 py-2.5 text-sm font-medium text-studio-text hover:bg-white/[.1] transition-colors">
            Tentar novamente
          </button>
          <button onClick={startOver} className="rounded-lg bg-studio-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-studio-primary-strong transition-colors">
            Recomeçar do zero
          </button>
        </div>
      </div>
    </main>
  );
}
