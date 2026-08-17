import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/voice-once")({
  component: () => <DevModuleLayout title="Voice Message Once" description="Áudio de visualização única." />,
});
