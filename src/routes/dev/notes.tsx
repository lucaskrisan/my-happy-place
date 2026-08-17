import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/notes")({
  component: () => <DevPlaceholderPage number="08" title="Locked Notes" description="Tela de notas bloqueadas/desbloqueáveis." />,
});
