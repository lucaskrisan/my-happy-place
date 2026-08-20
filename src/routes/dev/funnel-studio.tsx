import { createFileRoute } from '@tanstack/react-router';
import { FunnelStudio } from '@/funnel/studio/FunnelStudio';
export const Route = createFileRoute('/dev/funnel-studio')({ component: FunnelStudio });
