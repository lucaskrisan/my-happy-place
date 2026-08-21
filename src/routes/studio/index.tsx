import { createFileRoute } from "@tanstack/react-router";
import { ProductStudio } from "@/funnel/studio/ProductStudio";

export const Route = createFileRoute("/studio/")({ component: ProductStudio });
