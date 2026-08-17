import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/incoming-call")({
  component: () => (
    <DevPlaceholderPage 
      number="04" 
      title="Incoming Call" 
      description="Simulação de ligação recebida estilo smartphone." 
    />
  ),
});
