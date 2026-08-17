import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/record")({
  component: () => <DevModuleLayout title="Record Audio" description="Simulação de gravação de áudio." />,
});
