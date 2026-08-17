import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/14-days")({
  component: () => <DevModuleLayout title="14 Days" description="Entrada futura para a experiência de 14 dias." />,
});
