import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  const router = useRouter();

  useEffect(() => {
    router.navigate({ to: "/dev" });
  }, [router]);

  return null;
}
