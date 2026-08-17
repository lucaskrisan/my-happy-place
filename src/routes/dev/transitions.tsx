import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/transitions")({
  component: () => <DevModuleLayout title="Transitions" description="Testes de fade, blur, blackout e transições cinematográficas." />,
});
