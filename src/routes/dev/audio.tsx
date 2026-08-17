import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/audio")({
  component: () => <DevPlaceholderPage number="18" title="Audio Test" description="Tela para testar arquivos de áudio e efeitos sonoros." />,
});
