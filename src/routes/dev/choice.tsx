import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/choice")({
  component: () => <DevModuleLayout title="Choice" description="Escolhas interativas e respostas da personagem." />,
});
