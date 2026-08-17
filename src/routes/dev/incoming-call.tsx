import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/incoming-call")({
  component: () => <DevModuleLayout title="Incoming Call" description="Simulação de ligação recebida estilo smartphone." />,
});
