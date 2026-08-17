import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/preloader")({
  component: () => <DevModuleLayout title="Preloader" description="Tela futura para testes de pré-carregamento de mídia." />,
});
