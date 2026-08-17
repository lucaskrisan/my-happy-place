import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/husband-talk")({
  component: () => <DevModuleLayout title="Husband Conversation" description="Conversa de ruptura com o marido." />,
});
