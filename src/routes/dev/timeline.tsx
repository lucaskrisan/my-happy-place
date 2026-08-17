import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/timeline")({
  component: () => (
    <DevPlaceholderPage 
      number="02" 
      title="Timeline Engine" 
      description="Área futura para eventos sincronizados com o vídeo." 
    />
  ),
});
