import { createFileRoute } from "@tanstack/react-router";
import { R2UploadProof } from "@/funnel/studio/R2UploadProof";

export const Route = createFileRoute("/dev/r2-upload-proof")({ component: R2UploadProof });
