import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/video-stage")({
  component: () => (
    <DevPlaceholderPage 
      number="01" 
      title="Video Stage" 
      description="Módulo isolado para desenvolvimento e testes do player narrativo." 
    />
  ),
});
