import { createFileRoute } from "@tanstack/react-router";
import { DevBackButton } from "@/components/dev-tools";

export const Route = createFileRoute("/dev/door-scene")({
  component: DoorScenePreview,
});

function DoorScenePreview() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 left-4 z-10">
        <DevBackButton />
      </div>
      
      <div className="w-full max-w-[400px] flex flex-col items-center gap-4">
        <h1 className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
          Scene 01 — Live Preview
        </h1>
        
        <div className="relative w-full aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden shadow-2xl border border-zinc-800">
          <video 
            src="/assets/scene-01/video/scene-01-door.mp4"
            controls
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
