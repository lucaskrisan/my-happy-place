import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/video-stage")({
  component: () => <DevModuleLayout title="Video Stage" description="Player principal onde futuramente vídeos narrativos serão exibidos." />,
});
