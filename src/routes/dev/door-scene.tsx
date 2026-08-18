import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DevBackButton } from "@/components/dev-tools";
import { IncomingCallOverlay } from "@/components/dev/IncomingCallOverlay";
import { PhoneCall } from "lucide-react";

export const Route = createFileRoute("/dev/door-scene")({
  component: DoorScenePreview,
});

function DoorScenePreview() {
  const [isCallOpen, setIsCallOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 left-4 z-10">
        <DevBackButton />
      </div>
      
      <div className="w-full max-w-[400px] flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4 w-full">
          <h1 className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">
            Scene 01 — Live Preview
          </h1>
          
          <div className="relative w-full aspect-[9/16] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/50">
            <video 
              src="/assets/scene-01/video/scene-01-door.mp4"
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <button
          onClick={() => setIsCallOpen(true)}
          className="flex items-center gap-3 px-6 py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl border border-zinc-800 transition-all active:scale-95 group"
        >
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
            <PhoneCall className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">Testar Ligação (Mãe)</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Cena 01 Integration</span>
          </div>
        </button>
      </div>

      <IncomingCallOverlay
        open={isCallOpen}
        callerName="Mãe"
        callerSubtitle="Celular"
        ringtoneSrc="/assets/scene-01/audio/ringtone.mp3"
        vibrationSrc="/assets/scene-01/audio/phone-vibration.mp3"
        connectSfxSrc="/assets/scene-01/audio/call-connect.mp3"
        voiceAudioSrc="/assets/scene-01/audio/mother-call-01.mp3"
        onDecline={() => setIsCallOpen(false)}
        onEnd={() => setIsCallOpen(false)}
      />
    </div>
  );
}
