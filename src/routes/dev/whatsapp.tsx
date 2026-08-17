import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/whatsapp")({
  component: () => <DevModuleLayout title="WhatsApp" description="Interface simulada de conversa por mensagens." />,
});
