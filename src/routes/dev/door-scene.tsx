import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/door-scene")({
  component: () => <DevPlaceholderPage number="12" title="Door Scene" description="Cena futura: marido chegando + porta + reação." />,
});
