import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "./client";

export type Profile = { id: string; email: string; role: "admin" | "client" };
export type ProfileState = { status: "loading" } | { status: "ready"; profile: Profile | null };

export function useProfile(userId: string | undefined): ProfileState {
  const [state, setState] = useState<ProfileState>({ status: "loading" });
  useEffect(() => {
    if (!userId) {
      setState({ status: "ready", profile: null });
      return;
    }
    setState({ status: "loading" });
    let cancelled = false;
    void getSupabaseBrowserClient()
      .from("profiles")
      .select("id,email,role")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("useProfile failed", error);
        setState({ status: "ready", profile: (data as Profile | null) ?? null });
      });
    return () => { cancelled = true; };
  }, [userId]);
  return state;
}
