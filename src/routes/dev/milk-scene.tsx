import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/milk-scene")({
  component: () => <DevModuleLayout title="Milk Scene" description="Cena do filho derrubando o copo e repetição do padrão." />,
});
