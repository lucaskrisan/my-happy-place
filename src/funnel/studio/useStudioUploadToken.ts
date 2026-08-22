import { useSupabaseSession } from "@/lib/supabase/useSession";

export type StudioUploadTokenState =
  | { status: "loading"; token: "" }
  | { status: "signed-out"; token: "" }
  | { status: "ready"; token: string };

/**
 * Permanent upload authorization now rides on the same Supabase session already required to use
 * /studio — no separate manual token to paste. `useSupabaseSession()` keeps this in sync with sign-in,
 * sign-out, and token refresh, so a mid-session expiry surfaces here as "signed-out" automatically.
 */
export function useStudioUploadToken(): StudioUploadTokenState {
  const session = useSupabaseSession();
  if (session.status === "loading") return { status: "loading", token: "" };
  if (session.status === "signed-out") return { status: "signed-out", token: "" };
  return { status: "ready", token: session.session.access_token };
}
