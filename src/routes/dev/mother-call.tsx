import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/mother-call")({
  component: () => <DevPlaceholderPage number="13" title="Mother Call" description="Ligação da mãe com áudio da infância." />,
});
