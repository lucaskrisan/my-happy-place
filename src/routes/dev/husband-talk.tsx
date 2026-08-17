import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/husband-talk")({
  component: () => <DevPlaceholderPage number="16" title="Husband Conversation" description="Conversa de ruptura com o marido." />,
});
