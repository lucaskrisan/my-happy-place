import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/notes")({
  component: () => <DevModuleLayout title="Locked Notes" description="Tela de notas bloqueadas/desbloqueáveis." />,
});
