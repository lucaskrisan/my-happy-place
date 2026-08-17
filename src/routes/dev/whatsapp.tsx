import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";
import { DevBackButton } from "@/components/dev-tools";
import { MessagingOverlay } from "@/components/dev/MessagingOverlay";
import { ChatMessage } from "@/types/messaging";
import { 
  Play, 
  RotateCcw, 
  MessageSquare, 
  X, 
  Activity, 
  FileAudio,
  Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dev/whatsapp")({
  component: WhatsappLab,
});

function WhatsappLab() {
  const [isOpen, setIsOpen] = useState(false);
  const [progressiveReveal, setProgressiveReveal] = useState(true);
  const [preserveState, setPreserveState] = useState(true);
  const [voiceOnceAudio, setVoiceOnceAudio] = useState<string | null>(null);
  const [voiceOnceName, setVoiceOnceName] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<{ id: string; time: string; text: string }[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  
  // Debug states
  const [debugInfo, setDebugInfo] = useState({
    state: 'closed',
    visibleMessages: 0,
    typing: false,
    lastInteraction: 'none'
  });

  const addLog = useCallback((text: string) => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    setEventLog(prev => [{ id: Math.random().toString(36).substr(2, 9), time, text }, ...prev].slice(0, 50));
  }, []);

  const handleInteraction = useCallback((event: { type: string; messageId?: string; data?: any }) => {
    addLog(`${event.type}${event.messageId ? `: ${event.messageId}` : ''}`);
    
    setDebugInfo(prev => ({
      ...prev,
      lastInteraction: event.type,
      state: event.type === 'conversation_opened' ? 'active' : 
             event.type === 'conversation_closed' ? 'closed' : 
             event.type === 'conversation_completed' ? 'completed' : prev.state,
      typing: event.type === 'typing_started' ? true : 
              event.type === 'typing_ended' ? false : prev.typing
    }));
  }, [addLog]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (voiceOnceAudio) URL.revokeObjectURL(voiceOnceAudio);
      const url = URL.createObjectURL(file);
      setVoiceOnceAudio(url);
      setVoiceOnceName(file.name);
      addLog(`Audio loaded: ${file.name}`);
    }
  };

  const removeAudio = () => {
    if (voiceOnceAudio) URL.revokeObjectURL(voiceOnceAudio);
    setVoiceOnceAudio(null);
    setVoiceOnceName(null);
    addLog(`Audio removed`);
  };

  useEffect(() => {
    return () => {
      if (voiceOnceAudio) URL.revokeObjectURL(voiceOnceAudio);
    };
  }, [voiceOnceAudio]);

  const messages: ChatMessage[] = [
    {
      id: "msg-1",
      sender: "contact",
      type: "text",
      text: "Você está sozinha?",
      timestamp: "22:14",
      delay: 400
    },
    {
      id: "msg-2",
      sender: "user",
      type: "text",
      text: "Sim.",
      timestamp: "22:14",
      delay: 900
    },
    {
      id: "msg-3",
      sender: "contact",
      type: "text",
      text: "Preciso te mandar uma coisa.",
      timestamp: "22:15",
      delay: 700
    },
    {
      id: "msg-4",
      sender: "contact",
      type: "voice_once",
      timestamp: "22:15",
      audioSrc: voiceOnceAudio || undefined,
      duration: 8,
      delay: 600
    }
  ];

  return (
    <div className={cn(
      "min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans",
      isPreview && "p-0 overflow-hidden h-screen"
    )}>
      {!isPreview && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                <span className="text-zinc-600">05</span>
                Messaging Experience Lab
              </h1>
              <p className="text-zinc-400">Laboratório para simulação de conversas interativas.</p>
            </div>
            <DevBackButton />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Controls */}
            <div className="space-y-6">
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Play size={14} /> Controles
                </h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => setIsOpen(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={18} /> Abrir Conversa
                  </button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <X size={18} /> Fechar Conversa
                  </button>
                  <button 
                    onClick={() => {
                      setIsOpen(false);
                      setTimeout(() => {
                        setEventLog([]);
                        addLog("Experience reset");
                      }, 100);
                    }}
                    className="w-full border border-zinc-700 hover:bg-zinc-800 text-zinc-400 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={18} /> Resetar Conversa
                  </button>
                  
                  <button 
                    onClick={() => setIsPreview(true)}
                    className="w-full bg-zinc-100 hover:bg-white text-black py-2 px-4 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 mt-4"
                  >
                    <Maximize2 size={18} /> Preview Fullscreen
                  </button>
                </div>
              </section>

              <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  Configurações
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={progressiveReveal}
                      onChange={(e) => setProgressiveReveal(e.target.checked)}
                      className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-600"
                    />
                    <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Progressive Reveal</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={preserveState}
                      onChange={(e) => setPreserveState(e.target.checked)}
                      className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-emerald-600"
                    />
                    <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">Preserve state on close</span>
                  </label>
                </div>
              </section>
            </div>

            {/* Media & Debug */}
            <div className="space-y-6">
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileAudio size={14} /> Voice Once Audio
                </h3>
                <div className="space-y-4">
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleFileChange}
                    className="hidden"
                    id="audio-upload"
                  />
                  <label 
                    htmlFor="audio-upload"
                    className="block w-full border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-lg p-4 text-center cursor-pointer transition-colors"
                  >
                    <p className="text-xs text-zinc-500 mb-1">Selecione o arquivo para a mensagem de voz</p>
                    <p className="text-sm text-zinc-300 font-mono truncate">{voiceOnceName || "nenhum arquivo"}</p>
                  </label>
                  {voiceOnceAudio && (
                    <button 
                      onClick={removeAudio}
                      className="text-xs text-red-500 hover:text-red-400 font-medium"
                    >
                      Remover arquivo
                    </button>
                  )}
                </div>
              </section>

              <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity size={14} /> Debug Info
                </h3>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">State:</span>
                    <span className={cn(
                      debugInfo.state === 'active' ? 'text-emerald-500' : 
                      debugInfo.state === 'completed' ? 'text-blue-500' : 'text-zinc-400'
                    )}>{debugInfo.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Typing:</span>
                    <span className={debugInfo.typing ? 'text-amber-500' : 'text-zinc-400'}>
                      {debugInfo.typing ? 'true' : 'false'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Last event:</span>
                    <span className="text-zinc-300">{debugInfo.lastInteraction}</span>
                  </div>
                </div>
              </section>
            </div>

            {/* Event Log */}
            <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col h-[500px]">
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Event Log</h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {eventLog.map(log => (
                  <div key={log.id} className="text-[10px] font-mono border-l border-zinc-800 pl-2 py-1">
                    <span className="text-zinc-600">[{log.time}]</span>{" "}
                    <span className="text-zinc-300">{log.text}</span>
                  </div>
                ))}
                {eventLog.length === 0 && (
                  <p className="text-zinc-600 text-[10px] italic">Aguardando interações...</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Exit Preview Button (Dev environment only) */}
      {isPreview && (
        <button 
          onClick={() => setIsPreview(false)}
          className="fixed top-4 right-4 z-[110] bg-black/50 hover:bg-black/80 text-white/50 hover:text-white px-3 py-1 rounded-full text-xs font-mono border border-white/10 transition-all backdrop-blur-md"
        >
          Exit Preview
        </button>
      )}

      {/* The Component Under Test */}
      <MessagingOverlay 
        open={isOpen}
        contactName="Mamãe"
        contactSubtitle="online"
        messages={messages}
        progressiveReveal={progressiveReveal}
        preserveStateOnClose={preserveState}
        onClose={() => setIsOpen(false)}
        onInteraction={handleInteraction}
        onComplete={() => addLog("ON_COMPLETE reached")}
      />
    </div>
  );
}

