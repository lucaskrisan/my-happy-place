import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/scene")({
  component: () => (
    <DevPlaceholderPage 
      number="03" 
      title="Scene Test" 
      description="Ambiente isolado para testar uma cena completa." 
    />
  ),
});
