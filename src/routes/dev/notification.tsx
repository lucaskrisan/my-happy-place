import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/notification")({
  component: () => <DevModuleLayout title="Notification" description="Notificação sobreposta à experiência." />,
});
