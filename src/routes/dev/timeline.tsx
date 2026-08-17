import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/timeline")({
  component: () => <DevModuleLayout title="Timeline Engine" description="Área futura para eventos sincronizados com o vídeo." />,
});
