import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/choice")({
  component: () => <DevPlaceholderPage number="09" title="Choice" description="Escolhas interativas e respostas da personagem." />,
});
