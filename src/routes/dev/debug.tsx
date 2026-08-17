import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/debug")({
  component: () => <DevPlaceholderPage number="21" title="Debug State" description="Área futura para visualizar estado da experiência." />,
});
