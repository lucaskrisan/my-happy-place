import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/secret-whatsapp")({
  component: () => <DevPlaceholderPage number="14" title="Secret WhatsApp" description="Conversa secreta com áudio íntimo." />,
});
