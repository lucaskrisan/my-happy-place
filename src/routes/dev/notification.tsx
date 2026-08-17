import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createFileRoute } from "@tanstack/react-router";
import { 
  DevBackButton, 
  DevSection, 
  DevCard, 
  DevModuleLayout 
} from "@/components/dev-tools";
import { 
  Bell, 
  Play, 
  Square, 
  Trash2, 
  RefreshCcw, 
  Settings2, 
  Activity, 
  Monitor, 
  ArrowLeft,
  Smartphone,
  Info,
  Clock,
  MessageCircle,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationOverlay, NotificationState, NotificationInteractionEvent } from "@/components/dev/NotificationOverlay";

export const Route = createFileRoute("/dev/notification")({
  component: NotificationLab,
});

interface LogEntry {
  id: string;
  timestamp: string;
  event: string;
}

function NotificationLab() {
  // Notification Props State
  const [isOpen, setIsOpen] = useState(false);
  const [appName, setAppName] = useState('Mensagens');
  const [senderName, setSenderName] = useState('Mamãe');
  const [message, setMessage] = useState('Preciso te mandar uma coisa.');
  const [timestamp, setTimestamp] = useState('agora');
  const [autoDismiss, setAutoDismiss] = useState(true);
  const [autoDismissMs, setAutoDismissMs] = useState(5000);
  
  // Media State
  const [avatarFile, setAvatarFile] = useState<{ file: File | null; url: string }>({ file: null, url: '' });
  const [sfxFile, setSfxFile] = useState<{ file: File | null; url: string }>({ file: null, url: '' });
  
  // Lab State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentState, setCurrentState] = useState<NotificationState>('hidden');
  const [tapResult, setTapResult] = useState<'none' | 'notification_tapped'>('none');
  const [showBackground, setShowBackground] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  
  // Debug State
  const [debugInfo, setDebugInfo] = useState({
    lastInteraction: 'none',
    swipeOffset: 0
  });

  const addLog = useCallback((event: string) => {
    const newLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
      event
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  }, []);

  // Media Handlers
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (avatarFile.url) URL.revokeObjectURL(avatarFile.url);
      setAvatarFile({
        file,
        url: URL.createObjectURL(file)
      });
      addLog('avatar_updated');
    }
  };

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (sfxFile.url) URL.revokeObjectURL(sfxFile.url);
      setSfxFile({
        file,
        url: URL.createObjectURL(file)
      });
      addLog('sfx_updated');
    }
  };

  const removeSfx = () => {
    if (sfxFile.url) URL.revokeObjectURL(sfxFile.url);
    setSfxFile({ file: null, url: '' });
    addLog('sfx_removed');
  };

  const testSfx = () => {
    if (sfxFile.url) {
      const audio = new Audio(sfxFile.url);
      audio.play().catch(e => console.warn('Audio test blocked:', e));
      addLog('sfx_test_played');
    }
  };

  // Cleanup Object URLs
  useEffect(() => {
    return () => {
      if (avatarFile.url) URL.revokeObjectURL(avatarFile.url);
      if (sfxFile.url) URL.revokeObjectURL(sfxFile.url);
    };
  }, []);

  const handleTrigger = () => {
    setTapResult('none');
    setIsOpen(true);
    addLog('notification_triggered');
  };

  const handleDismiss = () => {
    setIsOpen(false);
    addLog('notification_manual_dismiss');
  };

  const handleReset = () => {
    setIsOpen(false);
    setCurrentState('hidden');
    setTapResult('none');
    setLogs([]);
    addLog('lab_reset');
  };

  const handleInteraction = (event: NotificationInteractionEvent) => {
    addLog(event.type);
    if (event.type === 'notification_tapped') {
      setTapResult('notification_tapped');
    }
    setDebugInfo(prev => ({
      ...prev,
      lastInteraction: event.type
    }));
  };

  return (
    <div className={cn(
      "min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-24 transition-all duration-500",
      isPreview ? "p-0" : "p-4 md:p-8"
    )}>
      {/* Background Test Scene */}
      {showBackground && (
        <div className="fixed inset-0 z-0 bg-gradient-to-br from-indigo-950 via-zinc-950 to-emerald-950 flex items-center justify-center pointer-events-none">
          <div className="text-zinc-800 font-black text-6xl md:text-9xl opacity-20 tracking-tighter select-none">
            BACKGROUND SCENE
          </div>
        </div>
      )}

      {/* Preview Exit Button */}
      {isPreview && (
        <button 
          onClick={() => setIsPreview(false)}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10000] px-6 py-3 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-full text-xs font-bold text-zinc-400 hover:text-white transition-all shadow-2xl"
        >
          EXIT PREVIEW
        </button>
      )}

      {!isPreview && (
        <div className="max-w-6xl mx-auto space-y-8 relative z-10">
          <div className="flex items-center justify-between">
            <DevBackButton />
            <h1 className="text-2xl font-black tracking-tighter text-white">NOTIFICATION LAB</h1>
            <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm hover:bg-zinc-800 transition-all">
              <RefreshCcw className="w-4 h-4" />
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Controls */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Trigger Section */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6 text-zinc-400">
                  <Smartphone className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Controles</h3>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={handleTrigger}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                  >
                    Disparar notificação
                  </button>
                  <button 
                    onClick={handleDismiss}
                    className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-all active:scale-95"
                  >
                    Dismiss
                  </button>
                  <button 
                    onClick={() => setIsPreview(true)}
                    className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-all flex items-center gap-2 active:scale-95"
                  >
                    <Monitor className="w-4 h-4" />
                    Preview Fullscreen
                  </button>
                </div>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    <Settings2 className="w-4 h-4" />
                    <h3 className="text-xs font-bold uppercase tracking-widest">Configurações</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-zinc-400">Auto dismiss</label>
                      <button 
                        onClick={() => setAutoDismiss(!autoDismiss)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          autoDismiss ? "bg-blue-600" : "bg-zinc-700"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                          autoDismiss ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-sm text-zinc-400">Auto dismiss ms</label>
                        <span className="text-xs font-mono text-blue-400">{autoDismissMs}ms</span>
                      </div>
                      <input 
                        type="range" min="1000" max="10000" step="500"
                        value={autoDismissMs}
                        onChange={(e) => setAutoDismissMs(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm text-zinc-400">Testar sobre conteúdo</label>
                      <button 
                        onClick={() => setShowBackground(!showBackground)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          showBackground ? "bg-emerald-600" : "bg-zinc-700"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                          showBackground ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    <Activity className="w-4 h-4" />
                    <h3 className="text-xs font-bold uppercase tracking-widest">Campos Editáveis</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold">App Name</label>
                      <input 
                        value={appName} onChange={e => setAppName(e.target.value)}
                        className="w-full bg-black/40 border border-zinc-800 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold">Timestamp</label>
                      <input 
                        value={timestamp} onChange={e => setTimestamp(e.target.value)}
                        className="w-full bg-black/40 border border-zinc-800 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Sender</label>
                    <input 
                      value={senderName} onChange={e => setSenderName(e.target.value)}
                      className="w-full bg-black/40 border border-zinc-800 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Message</label>
                    <textarea 
                      value={message} onChange={e => setMessage(e.target.value)}
                      className="w-full h-16 bg-black/40 border border-zinc-800 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Media Lab */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Bell className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Media Lab</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Avatar Select */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Avatar</label>
                    <div className="flex items-center gap-4">
                      {avatarFile.url ? (
                        <div className="relative group">
                          <img src={avatarFile.url} className="w-16 h-16 rounded-full object-cover border-2 border-blue-600 shadow-xl" alt="Preview" />
                          <button 
                            onClick={() => {
                              URL.revokeObjectURL(avatarFile.url);
                              setAvatarFile({ file: null, url: '' });
                            }}
                            className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-dashed border-zinc-700">
                          <Bell className="w-6 h-6 text-zinc-600" />
                        </div>
                      )}
                      <input 
                        type="file" accept="image/*"
                        onChange={handleAvatarChange}
                        className="text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-zinc-400 hover:file:bg-zinc-700 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* SFX Select */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">Notification SFX</label>
                    <div className="space-y-3">
                      <input 
                        type="file" accept="audio/*"
                        onChange={handleSfxChange}
                        className="text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-zinc-400 hover:file:bg-zinc-700 cursor-pointer w-full"
                      />
                      {sfxFile.url && (
                        <div className="flex items-center gap-2 p-3 bg-black/40 border border-zinc-800 rounded-xl">
                          <button onClick={testSfx} className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-all">
                            <Play className="w-4 h-4" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-zinc-300 truncate">{sfxFile.file?.name}</p>
                            <p className="text-[9px] text-zinc-500 uppercase">Sound Ready</p>
                          </div>
                          <button onClick={removeSfx} className="p-2 text-zinc-600 hover:text-red-400 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Log & Debug */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Debug Panel */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6 text-zinc-400">
                  <Activity className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Notification Debug</h3>
                </div>
                
                <div className="space-y-2 font-mono text-[10px]">
                  <div className="flex justify-between py-1 border-b border-zinc-800/50">
                    <span className="text-zinc-500 uppercase">State:</span>
                    <span className={cn(
                      "font-bold",
                      currentState === 'visible' ? "text-emerald-400" : "text-zinc-300"
                    )}>{currentState}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/50">
                    <span className="text-zinc-500 uppercase">Open:</span>
                    <span className="text-zinc-300">{isOpen.toString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/50">
                    <span className="text-zinc-500 uppercase">Auto Dismiss:</span>
                    <span className="text-zinc-300">{autoDismiss ? 'armed' : 'off'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/50">
                    <span className="text-zinc-500 uppercase">Last Interaction:</span>
                    <span className="text-blue-400 font-bold">{debugInfo.lastInteraction}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/50">
                    <span className="text-zinc-500 uppercase">Tap Result:</span>
                    <span className={cn(
                      "font-bold",
                      tapResult === 'notification_tapped' ? "text-blue-400" : "text-zinc-500"
                    )}>{tapResult}</span>
                  </div>
                </div>
              </div>

              {/* Event Log */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col h-[400px]">
                <div className="flex items-center gap-2 mb-6 text-zinc-400 shrink-0">
                  <Clock className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Event Log</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-3 text-[10px] font-mono group">
                      <span className="text-zinc-600 group-hover:text-zinc-500 shrink-0">{log.timestamp}</span>
                      <span className="text-zinc-500 group-hover:text-zinc-400 shrink-0">—</span>
                      <span className={cn(
                        "break-all",
                        log.event.includes('tap') || log.event.includes('triggered') ? "text-blue-400" :
                        log.event.includes('dismissed') ? "text-zinc-400" : "text-zinc-500"
                      )}>{log.event}</span>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="h-full flex items-center justify-center text-zinc-600 text-[10px] uppercase tracking-widest italic">
                      No events registered
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* The Overlay Component */}
      <NotificationOverlay 
        open={isOpen}
        appName={appName}
        senderName={senderName}
        message={message}
        avatar={avatarFile.url}
        timestamp={timestamp}
        soundSrc={sfxFile.url}
        autoDismiss={autoDismiss}
        autoDismissMs={autoDismissMs}
        onStateChange={(state) => {
          setCurrentState(state);
          if (state === 'dismissed') setIsOpen(false);
        }}
        onInteraction={handleInteraction}
        onDismiss={() => setIsOpen(false)}
      />
    </div>
  );
}

// Helper for addLog inside the component
const useCallback = (fn: any, deps: any) => {
  return React.useCallback(fn, deps);
};
