import { createFileRoute } from "@tanstack/react-router";
import { DevPlaceholderPage } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/milk-scene")({
  component: () => <DevPlaceholderPage number="15" title="Milk Scene" description="Cena do filho derrubando o copo e repetição do padrão." />,
});
