import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./client";

export type SessionState = { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; session: Session };

export function useSupabaseSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setState(data.session ? { status: "signed-in", session: data.session } : { status: "signed-out" });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? { status: "signed-in", session } : { status: "signed-out" });
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  return state;
}
