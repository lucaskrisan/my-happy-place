import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/debug")({
  component: () => <DevModuleLayout title="Debug State" description="Área futura para visualizar estado da experiência." />,
});
