import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/scene")({
  component: () => <DevModuleLayout title="Scene Test" description="Ambiente isolado para testar uma cena completa." />,
});
