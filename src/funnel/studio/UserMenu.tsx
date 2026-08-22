import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSupabaseSession } from "@/lib/supabase/useSession";
import { useProfile } from "@/lib/supabase/useProfile";
import { Badge } from "./ui";

export function UserMenu() {
  const navigate = useNavigate();
  const session = useSupabaseSession();
  const userId = session.status === "signed-in" ? session.session.user.id : undefined;
  const email = session.status === "signed-in" ? session.session.user.email : undefined;
  const profileState = useProfile(userId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  if (session.status !== "signed-in" || !email) return null;

  const signOut = async () => {
    await getSupabaseBrowserClient().auth.signOut();
    void navigate({ to: "/login" });
  };

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Menu da conta"
        onClick={() => setOpen((value) => !value)}
        className="grid h-9 w-9 place-items-center rounded-full bg-studio-primary-soft text-sm font-semibold text-studio-primary-strong hover:bg-studio-primary-soft/80 transition-colors"
      >
        {email.slice(0, 1).toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-20 w-64 rounded-xl border border-studio-border bg-studio-surface-2 p-3 shadow-xl">
          <p className="truncate text-sm font-medium text-studio-text">{email}</p>
          {profileState.status === "ready" && profileState.profile && (
            <div className="mt-1.5"><Badge tone={profileState.profile.role === "admin" ? "primary" : "neutral"}>{profileState.profile.role === "admin" ? "admin" : "cliente"}</Badge></div>
          )}
          <button onClick={() => void signOut()} className="mt-3 w-full rounded-lg px-3 py-2 text-left text-sm text-studio-error hover:bg-white/[.06] transition-colors">
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
