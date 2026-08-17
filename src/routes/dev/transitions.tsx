import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/transitions")({
  component: () => <DevPlaceholderPage number="19" title="Transitions" description="Testes de fade, blur, blackout e transições cinematográficas." />,
});
