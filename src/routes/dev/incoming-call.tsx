import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { DevBackButton } from "@/components/dev-tools";
import { IncomingCallOverlay, CallState } from "@/components/dev/IncomingCallOverlay";
import { Play, Square, RefreshCcw, FileAudio, Info, Clock, Terminal, Activity, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dev/incoming-call")({
  component: IncomingCallPage,
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

function IncomingCallPage() {
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [debugState, setDebugState] = useState<CallState>("idle");
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [showSceneMode, setShowSceneMode] = useState(false);

  // Media files
  const [ringtone, setRingtone] = useState<MediaFile>({ file: null, url: "", name: "" });
  const [connectSfx, setConnectSfx] = useState<MediaFile>({ file: null, url: "", name: "" });
  const [voiceAudio, setVoiceAudio] = useState<MediaFile>({ file: null, url: "", name: "" });
  const [endSfx, setEndSfx] = useState<MediaFile>({ file: null, url: "", name: "" });

  // Volumes (scaled to 0-1 for the component)
  const [ringtoneVol, setRingtoneVol] = useState(70);
  const [voiceVol, setVoiceVol] = useState(100);
  const [sfxVol, setSfxVol] = useState(75);

  // Browser capabilities
  const [capabilities, setCapabilities] = useState({
    audioContext: "unknown",
    vibration: false,
    viewport: "0 x 0",
  });

  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  const addLog = useCallback((event: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [{ timestamp, event }, ...prev].slice(0, 30));
  }, []);

  useEffect(() => {
    // Initial capabilities check
    const checkCaps = () => {
      const audioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      setCapabilities({
        audioContext: audioCtx ? "ready" : "unsupported",
        vibration: typeof navigator !== 'undefined' && !!navigator.vibrate,
        viewport: `${window.innerWidth} × ${window.innerHeight}`,
      });
    };
    checkCaps();
    window.addEventListener('resize', checkCaps);
    return () => window.removeEventListener('resize', checkCaps);
  }, []);

  const handleFileChange = (type: 'ringtone' | 'connect' | 'voice' | 'end', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setter = {
      ringtone: setRingtone,
      connect: setConnectSfx,
      voice: setVoiceAudio,
      end: setEndSfx
    }[type];

    const oldVal = { ringtone, connect: connectSfx, voice: voiceAudio, end: endSfx }[type];
    if (oldVal?.url) URL.revokeObjectURL(oldVal.url);

    const url = URL.createObjectURL(file);
    setter({ file, url, name: file.name });
    addLog(`file_loaded: ${type} (${file.name})`);
  };

  const testMedia = (url: string) => {
    if (!url) return;
    if (testAudioRef.current) {
      testAudioRef.current.pause();
    }
    testAudioRef.current = new Audio(url);
    testAudioRef.current.play();
  };

  const stopTestMedia = () => {
    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current = null;
    }
  };

  const handleStart = () => {
    setIsCallOpen(true);
    addLog("call_started_external");
  };

  const handleReset = () => {
    setIsCallOpen(false);
    setDebugState("idle");
    addLog("reset_pressed");
    stopTestMedia();
  };

  const handleStateChange = (state: CallState) => {
    setDebugState(state);
    addLog(`state_change: ${state}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <DevBackButton />
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSceneMode(!showSceneMode)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium",
                showSceneMode ? "bg-blue-600/20 border-blue-500/50 text-blue-400" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
              )}
            >
              <Eye className="w-4 h-4" />
              Testar sobre conteúdo
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg border border-zinc-800 transition-all text-sm font-medium"
            >
              <RefreshCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Lab Panel */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Call Media Lab</h1>
                  <p className="text-zinc-400 text-sm">
                    Configure arquivos reais e teste a sequência de áudio.
                  </p>
                </div>
                <button
                  onClick={handleStart}
                  disabled={isCallOpen}
                  className="px-8 py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-green-900/20 active:scale-95"
                >
                  Iniciar Ligação
                </button>
              </div>

              {/* Media Inputs */}
              <div className="space-y-4">
                {[
                  { label: "Ringtone (loop)", key: 'ringtone', data: ringtone },
                  { label: "Connect SFX (once)", key: 'connect', data: connectSfx },
                  { label: "Voice Audio (dynamic)", key: 'voice', data: voiceAudio },
                  { label: "End Call SFX (once)", key: 'end', data: endSfx },
                ].map((item) => (
                  <div key={item.key} className="bg-black/20 border border-zinc-800/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <FileAudio className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{item.label}</p>
                        <p className="text-sm font-medium truncate text-zinc-300">
                          {item.data.name || "Nenhum arquivo selecionado"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="cursor-pointer px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs font-bold border border-zinc-700 transition-colors">
                        ESCOLHER
                        <input 
                          type="file" 
                          accept="audio/*" 
                          className="hidden" 
                          onChange={(e) => handleFileChange(item.key as any, e)} 
                        />
                      </label>
                      
                      {item.data.url && (
                        <div className="flex gap-1">
                          <button 
                            onClick={() => testMedia(item.data.url)}
                            className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-md transition-colors"
                            title="Testar áudio"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={stopTestMedia}
                            className="p-1.5 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded-md transition-colors"
                            title="Parar"
                          >
                            <Square className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Volume Controls */}
              <div className="mt-8 pt-8 border-t border-zinc-800/50">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Volumes de Desenvolvimento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: "Ringtone", val: ringtoneVol, set: setRingtoneVol },
                    { label: "Voice", val: voiceVol, set: setVoiceVol },
                    { label: "SFX (All)", val: sfxVol, set: setSfxVol },
                  ].map((vol) => (
                    <div key={vol.label} className="space-y-3">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-zinc-400">{vol.label}</span>
                        <span className="text-zinc-100 font-mono">{vol.val}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={vol.val} 
                        onChange={(e) => vol.set(parseInt(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Debug Info */}
          <div className="lg:col-span-4 space-y-6">
            {/* Event Log */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 overflow-hidden flex flex-col h-[400px]">
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

            {/* Browser Capabilities */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Browser
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">AudioContext</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    capabilities.audioContext === 'ready' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {capabilities.audioContext}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Vibration</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    capabilities.vibration ? "bg-green-500/10 text-green-500" : "bg-zinc-800 text-zinc-500"
                  )}>
                    {capabilities.vibration ? "supported" : "unsupported"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Viewport</span>
                  <span className="text-zinc-300 font-mono text-xs">{capabilities.viewport}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Safe Area</span>
                  <span className="text-green-500 text-[10px] font-bold uppercase">active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Background Scene */}
      {showSceneMode && (
        <div className="fixed inset-0 z-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black pointer-events-none">
          <div className="text-center opacity-10">
            <h2 className="text-6xl font-black mb-4 tracking-tighter">BACKGROUND SCENE TEST</h2>
            <p className="text-xl font-medium tracking-[0.3em]">NURTURING NARRATIVE EXPERIENCE</p>
          </div>
        </div>
      )}

      <IncomingCallOverlay
        open={isCallOpen}
        callerName="Mamãe"
        callerSubtitle="Ligação recebida"
        ringtoneSrc={ringtone.url}
        connectSfxSrc={connectSfx.url}
        voiceAudioSrc={voiceAudio.url}
        endSfxSrc={endSfx.url}
        ringtoneVolume={ringtoneVol / 100}
        voiceVolume={voiceVol / 100}
        sfxVolume={sfxVol / 100}
        autoEndAfterAudio={true}
        onStateChange={handleStateChange}
        onVoiceStart={() => addLog("voice_started")}
        onVoiceEnd={() => addLog("voice_ended")}
        onAccept={() => addLog("call_accepted")}
        onDecline={() => {
          addLog("call_declined");
          setIsCallOpen(false);
        }}
        onEnd={() => {
          addLog("call_ended_manually");
          setIsCallOpen(false);
        }}
      />
    </div>
  );
}
