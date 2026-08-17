import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/14-days")({
  component: () => <DevPlaceholderPage number="17" title="14 Days" description="Entrada futura para a experiência de 14 dias." />,
});
