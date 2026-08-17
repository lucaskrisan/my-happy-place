import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/audio")({
  component: () => <DevModuleLayout title="Audio Test" description="Tela para testar arquivos de áudio e efeitos sonoros." />,
});
