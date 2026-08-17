import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/secret-whatsapp")({
  component: () => <DevModuleLayout title="Secret WhatsApp" description="Conversa secreta com áudio íntimo." />,
});
