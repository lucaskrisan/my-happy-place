import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/mother-call")({
  component: () => <DevModuleLayout title="Mother Call" description="Ligação da mãe com áudio da infância." />,
});
