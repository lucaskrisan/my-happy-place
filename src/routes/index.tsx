import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const router = useRouter();

  useEffect(() => {
    router.navigate({ to: "/intro" });
  }, [router]);

  return null;
}
