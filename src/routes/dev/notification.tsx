import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/notification")({
  component: () => <DevPlaceholderPage number="07" title="Notification" description="Notificação sobreposta à experiência." />,
});
