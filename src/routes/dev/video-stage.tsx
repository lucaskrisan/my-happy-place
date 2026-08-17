import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { DevBackButton } from "@/components/dev-tools";
import { VideoStage } from "@/components/dev/VideoStage";
import { IncomingCallOverlay, CallState } from "@/components/dev/IncomingCallOverlay";
import { 
  Play, 
  Pause, 
  RefreshCcw, 
  FileVideo, 
  FileAudio, 
  Activity, 
  Terminal, 
  Maximize2, 
  Minimize2,
  Lock,
  Unlock
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dev/video-stage")({
  component: VideoStageLab,
});

type MediaFile = {
  file: File | null;
  url: string;
  name: string;
};

type EventLog = {
  timestamp: string;
  event: string;
};

function VideoStageLab() {
  const [videoFile, setVideoFile] = useState<MediaFile>({ file: null, url: "", name: "" });
  const [ringtone, setRingtone] = useState<MediaFile>({ file: null, url: "", name: "" });
  const [connectSfx, setConnectSfx] = useState<MediaFile>({ file: null, url: "", name: "" });
  const [voiceAudio, setVoiceAudio] = useState<MediaFile>({ file: null, url: "", name: "" });
  const [endSfx, setEndSfx] = useState<MediaFile>({ file: null, url: "", name: "" });

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [triggerTime, setTriggerTime] = useState(10.4);
  const [eventFired, setEventFired] = useState(false);
  const [eventCompleted, setEventCompleted] = useState(false);
  
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callState, setCallState] = useState<CallState>("idle");
  const [savedTime, setSavedTime] = useState<number | null>(null);
  
  const [logs, setLogs] = useState<EventLog[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTimeRef = useRef(0);

  const addLog = useCallback((event: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    setLogs(prev => [{ timestamp, event }, ...prev].slice(0, 50));
  }, []);

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoFile.url) URL.revokeObjectURL(videoFile.url);
    const url = URL.createObjectURL(file);
    setVideoFile({ file, url, name: file.name });
    addLog(`video_loaded: ${file.name}`);
    setEventFired(false);
    setEventCompleted(false);
  };

  const handleAudioFileChange = (type: 'ringtone' | 'connect' | 'voice' | 'end', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const setters = { ringtone: setRingtone, connect: setConnectSfx, voice: setVoiceAudio, end: setEndSfx };
    const current = { ringtone, connect: connectSfx, voice: voiceAudio, end: endSfx }[type];
    if (current.url) URL.revokeObjectURL(current.url);
    const url = URL.createObjectURL(file);
    setters[type]({ file, url, name: file.name });
    addLog(`audio_loaded: ${type} (${file.name})`);
  };

  // Trigger detection
  useEffect(() => {
    if (eventFired || !isPlaying || !videoRef.current) return;

    const video = videoRef.current;
    
    const checkTrigger = () => {
      const current = video.currentTime;
      const last = lastTimeRef.current;
      
      // Detection: if we crossed the trigger point
      if (current >= triggerTime && last < triggerTime) {
        setEventFired(true);
        addLog(`trigger_crossed @ ${current.toFixed(3)}`);
        
        // Sequence: Pause -> Delay -> Open Call
        video.pause();
        setSavedTime(current);
        addLog(`video_paused_for_call`);
        
        setTimeout(() => {
          setIsCallOpen(true);
          addLog(`call_opened`);
        }, 150);
      }
      
      lastTimeRef.current = current;
      
      if (isPlaying && !eventFired) {
        if ('requestVideoFrameCallback' in video) {
          (video as any).requestVideoFrameCallback(checkTrigger);
        } else {
          requestAnimationFrame(checkTrigger);
        }
      }
    };

    if ('requestVideoFrameCallback' in video) {
      (video as any).requestVideoFrameCallback(checkTrigger);
    } else {
      requestAnimationFrame(checkTrigger);
    }
  }, [isPlaying, eventFired, triggerTime, addLog]);

  const handleCallStateChange = (state: CallState) => {
    setCallState(state);
    addLog(`call_state: ${state}`);

    if (state === 'ended') {
      addLog(`call_ended_sequencing`);
      setTimeout(() => {
        setIsCallOpen(false);
        setEventCompleted(true);
        
        // Wait a bit more before resuming video
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play();
            addLog(`video_resumed`);
          }
        }, 400);
      }, 500);
    } else if (state === 'declined') {
      addLog(`call_declined_sequencing`);
      setIsCallOpen(false);
      setEventCompleted(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play();
          addLog(`video_resumed_after_decline`);
        }
      }, 300);
    }
  };

  const handleReset = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsCallOpen(false);
    setEventFired(false);
    setEventCompleted(false);
    setCallState("idle");
    setSavedTime(null);
    lastTimeRef.current = 0;
    addLog("experience_reset");
  };

  const handleRearm = () => {
    setEventFired(false);
    setEventCompleted(false);
    addLog("event_rearmed");
  };

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      [videoFile, ringtone, connectSfx, voiceAudio, endSfx].forEach(m => {
        if (m.url) URL.revokeObjectURL(m.url);
      });
    };
  }, []);

  return (
    <div className={cn(
      "min-h-screen text-zinc-100 font-sans",
      isFullscreen ? "bg-black" : "bg-zinc-950 p-4 md:p-8 pb-24"
    )}>
      {!isFullscreen && (
        <div className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
          <DevBackButton />
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg border border-zinc-800 transition-all text-sm font-medium"
            >
              <RefreshCcw className="w-4 h-4" />
              Reset Experience
            </button>
          </div>
        </div>
      )}

      <div className={cn(
        isFullscreen ? "fixed inset-0 z-50 flex items-center justify-center bg-black" : "grid grid-cols-1 lg:grid-cols-12 gap-8"
      )}>
        {/* Video Player Area */}
        <div className={cn(
          isFullscreen ? "w-full h-full relative" : "lg:col-span-7 space-y-4"
        )}>
          {!isFullscreen && (
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileVideo className="w-5 h-5 text-blue-500" />
                VIDEO STAGE LAB
              </h2>
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-2 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
                title="Fullscreen Preview"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className={cn(
            "relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 aspect-video w-full",
            isFullscreen && "rounded-none border-none aspect-auto h-[100dvh]"
          )}>
            {videoFile.url ? (
              <VideoStage
                ref={videoRef}
                src={videoFile.url}
                onTimeUpdate={setCurrentTime}
                onReady={(v) => setDuration(v.duration)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 space-y-4">
                <FileVideo className="w-16 h-16 opacity-20" />
                <p className="text-sm">Nenhum vídeo carregado</p>
              </div>
            )}

            {/* Fullscreen Overlay controls (Dev only) */}
            {isFullscreen && (
              <div className="absolute top-4 right-4 z-[60] flex gap-2">
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="px-4 py-2 bg-black/50 backdrop-blur-md border border-white/20 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-black/70 transition-all"
                >
                  <Minimize2 className="w-4 h-4" />
                  EXIT PREVIEW
                </button>
              </div>
            )}
          </div>

          {!isFullscreen && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => videoRef.current?.play()}
                    disabled={!videoFile.url || isPlaying}
                    className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 rounded-xl transition-all"
                  >
                    <Play className="w-5 h-5 fill-current" />
                  </button>
                  <button
                    onClick={() => videoRef.current?.pause()}
                    disabled={!videoFile.url || !isPlaying}
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded-xl transition-all"
                  >
                    <Pause className="w-5 h-5 fill-current" />
                  </button>
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        videoRef.current.play();
                      }
                    }}
                    disabled={!videoFile.url}
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded-xl transition-all"
                  >
                    <RefreshCcw className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono bg-black/30 px-4 py-2 rounded-lg border border-zinc-800">
                  <span className="text-blue-400">{currentTime.toFixed(3)}s</span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-zinc-500">{duration.toFixed(3)}s</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Vídeo Source</label>
                  <label className="flex items-center gap-3 w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl cursor-pointer transition-all">
                    <FileVideo className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm truncate text-zinc-300">
                      {videoFile.name || "Selecionar vídeo..."}
                    </span>
                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoFileChange} />
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Call Trigger Time (s)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={triggerTime}
                      onChange={(e) => setTriggerTime(parseFloat(e.target.value))}
                      className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <button
                      onClick={handleRearm}
                      className={cn(
                        "px-4 py-3 rounded-xl border text-xs font-bold transition-all",
                        eventFired ? "bg-orange-500/10 border-orange-500/50 text-orange-400" : "bg-zinc-800 border-zinc-700 text-zinc-500 opacity-50"
                      )}
                    >
                      REARM
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Debug Info */}
        {!isFullscreen && (
          <div className="lg:col-span-5 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3">Timeline Debug</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Video State</span>
                    <span className={cn(isPlaying ? "text-green-400" : "text-zinc-500")}>{isPlaying ? "playing" : "paused"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Call Event</span>
                    <span className={cn(
                      eventCompleted ? "text-green-400" : eventFired ? "text-orange-400" : "text-blue-400"
                    )}>
                      {eventCompleted ? "completed" : eventFired ? "fired" : "armed"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Saved Time</span>
                    <span className="text-zinc-300 font-mono">{savedTime ? `${savedTime.toFixed(3)}s` : "-"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3">Assets Ready</h3>
                <div className="space-y-2 text-xs">
                  {[
                    { label: "Video", ready: !!videoFile.url },
                    { label: "Ringtone", ready: !!ringtone.url },
                    { label: "Voice", ready: !!voiceAudio.url },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-zinc-500">{item.label}</span>
                      {item.ready ? <Unlock className="w-3 h-3 text-green-500" /> : <Lock className="w-3 h-3 text-zinc-700" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Event Log */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 overflow-hidden flex flex-col h-[300px]">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0">
                <Terminal className="w-4 h-4" />
                Event Log
              </h3>
              <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[10px] scrollbar-thin scrollbar-thumb-zinc-800">
                {logs.length === 0 ? (
                  <p className="text-zinc-700 italic">Aguardando eventos...</p>
                ) : logs.map((log, i) => (
                  <div key={i} className={cn(
                    "flex gap-3 py-1 border-b border-zinc-800/30",
                    i === 0 ? "text-blue-400" : "text-zinc-500"
                  )}>
                    <span className="shrink-0 opacity-50">{log.timestamp}</span>
                    <span className="truncate">{log.event}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Call Assets Config (Minimal) */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileAudio className="w-4 h-4" />
                Call Assets Lab
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Ringtone", key: 'ringtone', data: ringtone },
                  { label: "Connect", key: 'connect', data: connectSfx },
                  { label: "Voice", key: 'voice', data: voiceAudio },
                  { label: "End SFX", key: 'end', data: endSfx },
                ].map(item => (
                  <label key={item.key} className="group relative cursor-pointer block">
                    <div className={cn(
                      "px-3 py-2 border rounded-lg transition-all text-[10px] font-bold uppercase text-center truncate",
                      item.data.url ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-zinc-800 border-zinc-700 text-zinc-500"
                    )}>
                      {item.label}
                    </div>
                    <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleAudioFileChange(item.key as any, e)} />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <IncomingCallOverlay
        open={isCallOpen}
        callerName="Mamãe"
        callerSubtitle="Ligação recebida"
        ringtoneSrc={ringtone.url}
        connectSfxSrc={connectSfx.url}
        voiceAudioSrc={voiceAudio.url}
        endSfxSrc={endSfx.url}
        autoEndAfterAudio={true}
        onStateChange={handleCallStateChange}
      />
    </div>
  );
}
