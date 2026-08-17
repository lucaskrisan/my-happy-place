import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/quiz")({
  component: () => <DevModuleLayout title="Quiz" description="Perguntas rápidas dentro da narrativa." />,
});
