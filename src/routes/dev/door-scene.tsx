import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/door-scene")({
  component: () => <DevModuleLayout title="Door Scene" description="Cena futura: marido chegando + porta + reação." />,
});
