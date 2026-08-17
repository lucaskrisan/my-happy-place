import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/record")({
  component: () => <DevPlaceholderPage number="11" title="Record Audio" description="Simulação de gravação de áudio." />,
});
