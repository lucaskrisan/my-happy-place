import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/voice-once")({
  component: () => <DevPlaceholderPage number="06" title="Voice Message Once" description="Áudio de visualização única." />,
});
