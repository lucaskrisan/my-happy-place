import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { DevBackButton } from "@/components/dev-tools";
import { IncomingCallOverlay, type CallState } from "@/components/dev/IncomingCallOverlay";
import { 
  PhoneCall, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Video,
  Music,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dev/door-scene")({
  component: DoorScenePreview,
});

type AssetStatus = 'loading' | 'ready' | 'missing';

interface Asset {
  path: string;
  label: string;
  type: 'video' | 'audio';
}

const SCENE_ASSETS: Asset[] = [
  { path: "/assets/scene-01/video/scene-01-door.mp4", label: "scene-01-door.mp4", type: 'video' },
  { path: "/assets/scene-01/video/scene-01-memory.mp4", label: "scene-01-memory.mp4", type: 'video' },
  { path: "/assets/scene-01/audio/ringtone.mp3", label: "ringtone.mp3", type: 'audio' },
  { path: "/assets/scene-01/audio/phone-vibration.mp3", label: "phone-vibration.mp3", type: 'audio' },
  { path: "/assets/scene-01/audio/call-connect.mp3", label: "call-connect.mp3", type: 'audio' },
  { path: "/assets/scene-01/audio/mother-call-01.mp3", label: "mother-call-01.mp3", type: 'audio' },
  { path: "/assets/scene-01/audio/mother-voice-once-01.mp3", label: "mother-voice-once-01.mp3", type: 'audio' },
  { path: "/assets/scene-01/audio/call-end.mp3", label: "call-end.mp3", type: 'audio' },
  { path: "/assets/scene-01/audio/notification.mp3", label: "notification.mp3", type: 'audio' },
];

function DoorScenePreview() {
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callState, setCallState] = useState<CallState>("idle");
  const [assetStatuses, setAssetStatuses] = useState<Record<string, AssetStatus>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // New Scene Logic States
  const [sceneStep, setSceneStep] = useState<"idle" | "present" | "memory" | "transition" | "call">("idle");
  const [showCopy, setShowCopy] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const memoryVideoRef = useRef<HTMLVideoElement>(null);

  // Real detection of assets
  useEffect(() => {
    SCENE_ASSETS.forEach((asset) => {
      setAssetStatuses((prev) => ({ ...prev, [asset.path]: "loading" }));

      const checkAsset = async () => {
        try {
          const response = await fetch(asset.path, { method: "HEAD" });
          if (response.ok) {
            setAssetStatuses((prev) => ({ ...prev, [asset.path]: "ready" }));
          } else {
            setAssetStatuses((prev) => ({ ...prev, [asset.path]: "missing" }));
          }
        } catch (error) {
          setAssetStatuses((prev) => ({ ...prev, [asset.path]: "missing" }));
        }
      };

      checkAsset();
    });
  }, []);

  const playFullScene = () => {
    setSceneStep("present");
    setShowCopy(false);
    setIsCallOpen(false);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
    }
    if (memoryVideoRef.current) {
      memoryVideoRef.current.currentTime = 0;
      memoryVideoRef.current.load();
    }
  };

  const handleVideoEnded = () => {
    if (sceneStep === "present") {
      // Step A ended -> Step B: Memory (CORTE SECO)
      setSceneStep("memory");
      if (memoryVideoRef.current) {
        memoryVideoRef.current.play().catch(console.error);
      }
    } else if (sceneStep === "memory") {
      // Step B ended -> Step C: Transition Copy (IMEDIATO)
      setSceneStep("transition");
      setShowCopy(true);
      setIsPlaying(false);
    }
  };

  const handleContinue = () => {
    setShowCopy(false);
    setSceneStep("call");
    setIsCallOpen(true);
  };

  const togglePlay = () => {
    const activeVideo = sceneStep === "memory" ? memoryVideoRef.current : videoRef.current;
    if (activeVideo) {
      if (isPlaying) {
        activeVideo.pause();
      } else {
        activeVideo.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const resetScene = () => {
    setSceneStep("idle");
    setShowCopy(false);
    setIsPlaying(false);
    setIsCallOpen(false);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
    if (memoryVideoRef.current) {
      memoryVideoRef.current.currentTime = 0;
      memoryVideoRef.current.pause();
    }
  };

  const handleTimeUpdate = () => {
    const activeVideo = sceneStep === "memory" ? memoryVideoRef.current : videoRef.current;
    if (activeVideo) {
      setCurrentTime(activeVideo.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && sceneStep !== "memory") {
      setDuration(videoRef.current.duration);
    } else if (memoryVideoRef.current && sceneStep === "memory") {
      setDuration(memoryVideoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const activeVideo = sceneStep === "memory" ? memoryVideoRef.current : videoRef.current;
    if (activeVideo) {
      activeVideo.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row font-sans text-zinc-300">
      {/* Sidebar Debug / Assets */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950 p-6 flex flex-col gap-8 overflow-y-auto">
        <div className="flex items-center gap-3">
          <DevBackButton />
          <h1 className="text-sm font-bold text-white uppercase tracking-widest">Scene 01 Lab</h1>
        </div>

        {/* Debug Visual */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <Info className="w-3 h-3" /> Debug Visual
          </h2>
          <div className="grid gap-2 text-xs">
            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Scene State</span>
              <span className={cn(
                "font-mono font-bold",
                isPlaying ? "text-green-500" : "text-yellow-500"
              )}>
                {isPlaying ? "VIDEO PLAYING" : "VIDEO PAUSED"}
              </span>
            </div>
            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Interaction</span>
              <span className={cn(
                "font-mono font-bold",
                callState === 'idle' ? "text-zinc-400" : 
                callState === 'incoming' ? "text-blue-500 animate-pulse" : "text-green-500"
              )}>
                {callState === 'idle' ? "NONE" : 
                 callState === 'incoming' ? "INCOMING_CALL" : "ACTIVE_CALL"}
              </span>
            </div>
            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Current Time</span>
              <span className="font-mono font-bold text-white">
                {formatTime(currentTime)}
              </span>
            </div>
          </div>
        </section>

        {/* Assets Checklist */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Assets da Cena</h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-[9px] font-bold text-zinc-600 uppercase flex items-center gap-2">
                <Video className="w-3 h-3" /> Video
              </h3>
              {SCENE_ASSETS.filter(a => a.type === 'video').map(asset => (
                <AssetRow key={asset.path} asset={asset} status={assetStatuses[asset.path] || 'loading'} />
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="text-[9px] font-bold text-zinc-600 uppercase flex items-center gap-2">
                <Music className="w-3 h-3" /> Audio
              </h3>
              {SCENE_ASSETS.filter(a => a.type === 'audio').map(asset => (
                <AssetRow key={asset.path} asset={asset} status={assetStatuses[asset.path] || 'loading'} />
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Main Preview Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 bg-black relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/20 to-transparent pointer-events-none" />
        
        <div className="w-full max-w-[400px] flex flex-col items-center gap-6 relative z-10">
          {/* Video Stage */}
          <div className="relative w-full aspect-[9/16] bg-zinc-950 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-zinc-800/50 group">
            <video 
              ref={videoRef}
              src="/assets/scene-01/video/scene-01-door.mp4"
              playsInline
              className="w-full h-full object-cover"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleVideoEnded}
            />

            {/* Transition Copy Overlay */}
            {showCopy && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-8 z-20 animate-in fade-in duration-700">
                <div className="text-center space-y-2">
                  <p className="text-white text-lg font-light leading-relaxed animate-in slide-in-from-bottom-4 duration-1000">
                    "Antes de entender o que sentiu...
                  </p>
                  <p className="text-white text-lg font-light leading-relaxed animate-in slide-in-from-bottom-4 duration-1000 delay-300">
                    o corpo dela já tinha lembrado."
                  </p>
                </div>
              </div>
            )}

            {/* Call prompt hint */}
            {isCallOpen && callState === 'incoming' && (
              <div className="absolute bottom-12 left-0 right-0 text-center z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-1000">
                <span className="text-[10px] text-white/50 uppercase tracking-widest font-medium">
                  Atenda para continuar
                </span>
              </div>
            )}

            {/* In-Video Controls (Overlay on Hover) */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
               {!isPlaying && <Play className="w-16 h-16 text-white/50" />}
            </div>

            {/* Interaction Overlay */}
            <IncomingCallOverlay
              open={isCallOpen}
              callerName="Mamãe"
              callerSubtitle="Celular"
              ringtoneSrc={undefined} // No ringtone for Scene 01 as per requirement
              vibrationSrc={assetStatuses["/assets/scene-01/audio/phone-vibration.mp3"] === 'ready' ? "/assets/scene-01/audio/phone-vibration.mp3" : undefined}
              connectSfxSrc={assetStatuses["/assets/scene-01/audio/call-connect.mp3"] === 'ready' ? "/assets/scene-01/audio/call-connect.mp3" : undefined}
              voiceAudioSrc={assetStatuses["/assets/scene-01/audio/mother-call-01.mp3"] === 'ready' ? "/assets/scene-01/audio/mother-call-01.mp3" : undefined}
              endSfxSrc={assetStatuses["/assets/scene-01/audio/call-end.mp3"] === 'ready' ? "/assets/scene-01/audio/call-end.mp3" : undefined}
              onStateChange={setCallState}
              onDecline={() => setIsCallOpen(false)}
              onEnd={() => setIsCallOpen(false)}
            />
          </div>

          {/* Player Controls */}
          <div className="w-full bg-zinc-900/80 backdrop-blur-md p-4 rounded-3xl border border-zinc-800 flex flex-col gap-4 shadow-xl">
            {/* Progress Bar */}
            <div className="flex flex-col gap-1">
              <input 
                type="range" 
                min={0} 
                max={duration || 0} 
                step={0.01}
                value={currentTime} 
                onChange={handleSeek}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>
                <button
                  onClick={resetScene}
                  className="w-10 h-10 rounded-full bg-zinc-800 text-white flex items-center justify-center hover:bg-zinc-700 transition-colors active:scale-95"
                  title="Reset Scene"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 flex gap-2">
                <button
                  onClick={playFullScene}
                  className="flex-1 flex items-center justify-center gap-2 px-4 h-10 bg-white text-black hover:bg-zinc-200 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Reproduzir Cena 01
                </button>
                <button
                  onClick={() => setIsCallOpen(true)}
                  className="w-12 h-10 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-all active:scale-95 shadow-lg"
                  title="Testar Ligação (Debug)"
                >
                  <PhoneCall className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function AssetRow({ asset, status }: { asset: Asset, status: AssetStatus }) {
  return (
    <div className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/5 transition-colors">
      <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[180px]">
        {asset.label}
      </span>
      <div className="flex items-center gap-1.5 min-w-[70px] justify-end">
        {status === 'loading' && <Loader2 className="w-3 h-3 text-zinc-600 animate-spin" />}
        {status === 'ready' && (
          <>
            <span className="text-[9px] font-bold text-green-500/80 uppercase">Ready</span>
            <CheckCircle2 className="w-3 h-3 text-green-500" />
          </>
        )}
        {status === 'missing' && (
          <>
            <span className="text-[9px] font-bold text-red-500/80 uppercase">Missing</span>
            <XCircle className="w-3 h-3 text-red-500" />
          </>
        )}
      </div>
    </div>
  );
}
