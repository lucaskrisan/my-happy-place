import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/preloader")({
  component: () => <DevPlaceholderPage number="20" title="Preloader" description="Tela futura para testes de pré-carregamento de mídia." />,
});
