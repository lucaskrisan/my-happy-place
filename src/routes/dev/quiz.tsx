import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/quiz")({
  component: () => <DevPlaceholderPage number="10" title="Quiz" description="Perguntas rápidas dentro da narrativa." />,
});
