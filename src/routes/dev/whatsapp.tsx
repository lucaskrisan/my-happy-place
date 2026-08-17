import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/whatsapp")({
  component: () => (
    <DevPlaceholderPage 
      number="05" 
      title="WhatsApp" 
      description="Interface simulada de conversa por mensagens." 
    />
  ),
});
