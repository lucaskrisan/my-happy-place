import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { DevBackButton } from "@/components/dev-tools";
import { VideoStage } from "@/components/dev/VideoStage";
import { IncomingCallOverlay } from "@/components/dev/IncomingCallOverlay";
import { MessagingOverlay } from "@/components/dev/MessagingOverlay";
import { NotificationOverlay } from "@/components/dev/NotificationOverlay";
import { ChoiceOverlay } from "@/components/dev/ChoiceOverlay";
import { 
  Play, 
  Pause, 
  RefreshCcw, 
  Terminal, 
  Activity, 
  Clock, 
  Settings,
  ArrowRight,
  Database,
  FileVideo,
  LogOut,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

import { SceneEngine } from "@/engine/scene/sceneEngine";
import { SceneDefinition, SceneRuntimeState, InteractionAction } from "@/engine/scene/sceneTypes";
import { ChoiceDefinition, ChoiceResult } from "@/types/choice";

export const Route = createFileRoute("/dev/scene")({
  component: SceneLab,
});

// --- MOCK DATA ---

const SCENE_01: SceneDefinition = {
  id: "scene-01",
  title: "Teste de Cena 01",
  events: [
    {
      id: 'intro-text',
      type: 'text_reveal',
      at: 3,
      blocking: false,
      payload: { text: 'Alguma coisa nela mudou.' }
    },
    {
      id: 'door-sfx',
      type: 'play_sfx',
      at: 6,
      blocking: false
    },
    {
      id: 'mother-call-event',
      type: 'incoming_call',
      at: 10.4,
      blocking: true,
      payload: { interactionId: 'mother-call' }
    },
    {
      id: 'mother-notification',
      type: 'notification',
      at: 15,
      blocking: false,
      payload: {
        appName: "Mensagens",
        senderName: "Mamãe",
        message: "Preciso te mandar uma coisa.",
        tapAction: {
          type: "open_interaction",
          interactionId: "mother-chat"
        }
      }
    },
    {
      id: 'reaction-choice-event',
      type: 'choice',
      at: 18,
      blocking: true,
      payload: { interactionId: 'reaction-choice' }
    }
  ],
  interactions: {
    "mother-call": {
      id: "mother-call",
      type: "incoming_call",
      payload: {
        callerName: "Mamãe",
        callerSubtitle: "Ligação recebida"
      }
    },
    "mother-chat": {
      id: "mother-chat",
      type: "messaging",
      payload: {
        contactName: "Mamãe",
        contactSubtitle: "online",
        messages: [
          {
            id: "msg-01",
            type: "text",
            sender: "contact",
            text: "Você está sozinha?",
            timestamp: "22:14",
            delay: 400
          },
          {
            id: "msg-02",
            type: "text",
            sender: "user",
            text: "Sim.",
            timestamp: "22:14",
            delay: 700
          },
          {
            id: "msg-03",
            type: "text",
            sender: "contact",
            text: "Preciso te mandar uma coisa.",
            timestamp: "22:15",
            delay: 800
          },
          {
            id: "msg-04",
            type: "voice_once",
            sender: "contact",
            timestamp: "22:15",
            delay: 500,
            duration: 8
          }
        ]
      }
    "reaction-choice": {
      id: "reaction-choice",
      type: "choice",
      payload: {
        definition: {
          id: "reaction-01",
          title: "O que ela faz quando percebe que ele ficou em silêncio?",
          subtitle: "Escolha a reação que parece mais automática.",
          mode: "instant",
          required: true,
          options: [
            {
              id: "insist",
              label: "Insiste até ele responder",
              action: { type: "go_to_scene", sceneId: "scene-insist" }
            },
            {
              id: "withdraw",
              label: "Se cala também",
              action: { type: "go_to_scene", sceneId: "scene-withdraw" }
            },
            {
              id: "please",
              label: "Tenta agradar",
              action: { type: "go_to_scene", sceneId: "scene-please" }
            },
            {
              id: "defend",
              label: "Se defende antes de qualquer acusação",
              action: { type: "go_to_scene", sceneId: "scene-defend" }
            }
          ]
        }
      }
    }
  },
  completion: { type: 'video_ended' },
  nextSceneId: "scene-02"
};

const SCENE_INSIST: SceneDefinition = {
  id: "scene-insist",
  title: "Rota — Insistir",
  events: []
};

const SCENE_WITHDRAW: SceneDefinition = {
  id: "scene-withdraw",
  title: "Rota — Se Calar",
  events: []
};

const SCENE_PLEASE: SceneDefinition = {
  id: "scene-please",
  title: "Rota — Agradar",
  events: []
};

const SCENE_DEFEND: SceneDefinition = {
  id: "scene-defend",
  title: "Rota — Se Defender",
  events: []
};

const SCENE_02: SceneDefinition = {
  id: "scene-02",
  title: "Cena 02 - Fim do Teste",
  events: [
    {
      id: 'scene-02-text',
      type: 'text_reveal',
      at: 1,
      payload: { text: 'SCENE 02 READY' }
    }
  ]
};

const SCENES: Record<string, SceneDefinition> = {
  "scene-01": SCENE_01,
  "scene-02": SCENE_02,
  "scene-insist": SCENE_INSIST,
  "scene-withdraw": SCENE_WITHDRAW,
  "scene-please": SCENE_PLEASE,
  "scene-defend": SCENE_DEFEND,
};

function SceneLab() {
  const [activeSceneId, setActiveSceneId] = useState<string>("scene-01");
  const [logs, setLogs] = useState<{timestamp: string, event: string}[]>([]);
  const [runtimeState, setRuntimeState] = useState<SceneRuntimeState | null>(null);
  
  // Media Files (Runtime URLs)
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [sfxUrls, setSfxUrls] = useState<Record<string, string>>({});
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<SceneEngine | null>(null);

  const addLog = useCallback((event: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR', { 
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
    setLogs(prev => [{ timestamp, event }, ...prev].slice(0, 200));
  }, []);

  // Initialize Engine
  useEffect(() => {
    const sceneDef = SCENES[activeSceneId];
    if (!sceneDef) return;

    engineRef.current = new SceneEngine(sceneDef, (state, log) => {
      setRuntimeState(state);
      if (log) addLog(log);
    });

    return () => {
      engineRef.current = null;
    };
  }, [activeSceneId, addLog]);

  // Handle Video Updates
  const handleTimeUpdate = (time: number) => {
    engineRef.current?.updateTime(time, videoRef.current?.paused === false);
  };

  const handleVideoEnded = () => {
    engineRef.current?.handleVideoEnded();
  };

  // Sync state effects
  useEffect(() => {
    if (!runtimeState) return;
    
    // Handle Navigation
    if (runtimeState.state === 'transitioning' && runtimeState.transitionTargetId) {
      const targetId = runtimeState.transitionTargetId;
      if (SCENES[targetId]) {
        // Successful branch
        setTimeout(() => {
          setActiveSceneId(targetId);
          addLog(`scene_loaded: ${targetId}`);
        }, 300);
      } else {
        // Scene not found
        addLog(`scene_not_found: ${targetId}`);
        engineRef.current?.reset(); // Just for safety in lab
      }
      return;
    }

    if (!videoRef.current) return;
    
    if (runtimeState.state === 'blocked' && !videoRef.current.paused) {
      videoRef.current.pause();
      addLog(`video_paused_by_scene_engine`);
    } else if (runtimeState.state === 'playing' && videoRef.current.paused && runtimeState.currentTime > 0) {
      // Small breathe before resume
      setTimeout(() => {
        videoRef.current?.play().catch(console.error);
        addLog(`video_resumed_by_scene_engine`);
      }, 400);
    }
  }, [runtimeState?.state, runtimeState?.transitionTargetId]);

  // UI Handlers
  const handleStart = () => {
    engineRef.current?.start();
    videoRef.current?.play();
  };

  const handleReset = () => {
    engineRef.current?.reset();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    addLog(`scene_reset`);
  };

  const goToNextScene = () => {
    if (runtimeState?.state === 'completed' && SCENES[activeSceneId]?.nextSceneId) {
      const nextId = SCENES[activeSceneId].nextSceneId!;
      setActiveSceneId(nextId);
      addLog(`transitioning_to: ${nextId}`);
    }
  };

  // Resolvers for UI Components
  const activeInteraction = runtimeState?.activeInteraction;
  
  const callPayload = useMemo(() => {
    if (activeInteraction?.type !== 'incoming_call') return null;
    const p = activeInteraction.payload;
    return {
      callerName: (p['callerName'] as string) || "Desconhecido",
      callerSubtitle: (p['callerSubtitle'] as string) || "Ligação",
      ringtoneSrc: sfxUrls['ringtone'] || undefined,
      connectSfxSrc: sfxUrls['connect'] || undefined,
      voiceAudioSrc: sfxUrls['voice'] || undefined,
      endSfxSrc: sfxUrls['end'] || undefined
    };
  }, [activeInteraction, sfxUrls]);

  const messagingPayload = useMemo(() => {
    if (activeInteraction?.type !== 'messaging') return null;
    const p = activeInteraction.payload;
    
    // Inject local audio for voice messages
    const rawMessages = p['messages'] as any[];
    const messages = (rawMessages || []).map(m => {
      if (m.type === 'voice_once') {
        return { ...m, audioSrc: sfxUrls['voice_once'] || m.audioSrc };
      }
      return m;
    });

    return {
      contactName: p['contactName'] as string,
      contactSubtitle: p['contactSubtitle'] as string,
      messages
    };
  }, [activeInteraction, sfxUrls]);

  const notificationPayload = useMemo(() => {
    if (!runtimeState?.activeNotificationId) return null;
    const scene = SCENES[activeSceneId];
    if (!scene) return null;
    const event = scene.events.find(e => e.id === runtimeState.activeNotificationId);
    if (!event || !event.payload) return null;
    
    return {
      appName: (event.payload['appName'] as string) || "Mensagens",
      senderName: (event.payload['senderName'] as string) || "Alguém",
      message: (event.payload['message'] as string) || "...",
      timestamp: "agora",
      autoDismiss: true,
      autoDismissMs: 5000,
      soundSrc: sfxUrls['notification'] || undefined
    };
  }, [runtimeState?.activeNotificationId, activeSceneId, sfxUrls]);

  // Choice Resolver
  const choicePayload = useMemo(() => {
    if (activeInteraction?.type !== 'choice') return null;
    return activeInteraction.payload.definition as ChoiceDefinition;
  }, [activeInteraction]);

  // File Handlers
  const handleFile = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (key === 'video') {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(url);
      } else {
        setSfxUrls(prev => {
          if (prev[key]) URL.revokeObjectURL(prev[key]);
          return { ...prev, [key]: url };
        });
      }
      addLog(`${key}_file_loaded: ${file.name}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <DevBackButton />
          <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">SCENE ENGINE LAB</h1>
          <div className="flex gap-2">
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm hover:bg-zinc-800 transition-all"
            >
              <RefreshCcw className="w-4 h-4" />
              Reset
            </button>
            <button 
              onClick={handleStart}
              disabled={runtimeState?.state !== 'ready'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-bold hover:bg-blue-500 disabled:opacity-50 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              Start Scene
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Visualizer */}
          <div className="lg:col-span-8 space-y-6">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center">
              {SCENES[activeSceneId]?.video?.src || videoUrl ? (
                <VideoStage 
                  ref={videoRef}
                  src={SCENES[activeSceneId]?.video?.src || videoUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnded}
                />
              ) : (
                <div className="text-center space-y-4">
                  <div className="inline-flex p-4 bg-zinc-800/50 rounded-full border border-zinc-700 animate-pulse">
                    <Activity className="w-12 h-12 text-zinc-600" />
                  </div>
                  <div>
                    <div className="text-sm font-black uppercase tracking-widest text-zinc-500">Scene Placeholder</div>
                    <div className="text-2xl font-black text-white">{SCENES[activeSceneId]?.title}</div>
                  </div>
                  {activeSceneId !== 'scene-01' && (
                    <button 
                      onClick={() => setActiveSceneId('scene-01')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 rounded-xl text-sm font-bold hover:bg-zinc-700 transition-all border border-zinc-700"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      Restart Experience
                    </button>
                  )}
                </div>
              )}

              {/* Blocking Overlays */}
              {activeInteraction?.type === 'incoming_call' && callPayload && (
                <div className="absolute inset-0 z-50">
                  <IncomingCallOverlay 
                    open={true}
                    {...callPayload}
                    onStateChange={(state) => {
                      if (state === 'ended' || state === 'declined') {
                        engineRef.current?.completeInteraction(activeInteraction.id);
                      }
                    }}
                  />
                </div>
              )}

              {activeInteraction?.type === 'messaging' && messagingPayload && (
                <div className="absolute inset-0 z-50">
                  <MessagingOverlay 
                    open={true}
                    {...messagingPayload}
                    onComplete={() => engineRef.current?.completeInteraction(activeInteraction.id)}
                  />
                </div>
              )}

              {activeInteraction?.type === 'choice' && choicePayload && (
                <div className="absolute inset-0 z-50">
                  <ChoiceOverlay 
                    open={true}
                    definition={choicePayload}
                    onComplete={(result) => engineRef.current?.handleChoiceComplete(result)}
                    onClose={() => engineRef.current?.completeInteraction(activeInteraction.id)}
                    closeBehavior="prevent"
                  />
                </div>
              )}

              {/* Non-Blocking Overlays */}
              {runtimeState?.activeNotificationId && notificationPayload && (
                <div className="absolute inset-0 z-[60] pointer-events-none">
                  <div className="pointer-events-auto">
                    <NotificationOverlay 
                      open={true}
                      {...notificationPayload}
                      onInteraction={(e) => {
                        if (e.type === 'notification_tapped') {
                          const scene = SCENES[activeSceneId];
                          const event = scene?.events.find(ev => ev.id === runtimeState.activeNotificationId);
                          const action = event?.payload?.['tapAction'] as InteractionAction;
                          if (action) {
                            engineRef.current?.handleInteractionAction(action, runtimeState.activeNotificationId!);
                          }
                        } else if (e.type === 'notification_auto_dismissed' || e.type === 'notification_swiped') {
                          engineRef.current?.handleNotificationDismiss(
                            runtimeState.activeNotificationId!, 
                            e.type === 'notification_swiped' ? 'swiped' : 'auto_dismissed'
                          );
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Media Configuration */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/50">
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                  <FileVideo className="w-3 h-3" /> Scene Video
                </label>
                <input type="file" accept="video/*" onChange={handleFile('video')} className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Notification SFX</label>
                <input type="file" accept="audio/*" onChange={handleFile('notification')} className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Chat Voice</label>
                <input type="file" accept="audio/*" onChange={handleFile('voice_once')} className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Call Ringtone</label>
                <input type="file" accept="audio/*" onChange={handleFile('ringtone')} className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Call Voice</label>
                <input type="file" accept="audio/*" onChange={handleFile('voice')} className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Call Connect</label>
                <input type="file" accept="audio/*" onChange={handleFile('connect')} className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded p-2" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Call End</label>
                <input type="file" accept="audio/*" onChange={handleFile('end')} className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded p-2" />
              </div>
            </div>
          </div>

          {/* Debug Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Branch Indicator */}
            {activeSceneId !== 'scene-01' && (
              <div className="bg-purple-900/30 border border-purple-500/30 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-purple-400 tracking-widest mb-1">Cena Atual</div>
                  <div className="text-white font-bold">{SCENES[activeSceneId]?.title}</div>
                </div>
                <button 
                  onClick={() => setActiveSceneId('scene-01')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 rounded-lg text-xs font-bold hover:bg-purple-500 transition-all"
                >
                  <LogOut className="w-3 h-3" />
                  Voltar para scene-01
                </button>
              </div>
            )}

            {/* Scene Info */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
              <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Settings className="w-3 h-3 text-blue-400" /> SCENE DEBUG
                </h3>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                  runtimeState?.state === 'playing' ? "bg-green-500/20 text-green-400" :
                  runtimeState?.state === 'blocked' ? "bg-amber-500/20 text-amber-400" :
                  runtimeState?.state === 'completed' ? "bg-blue-500/20 text-blue-400" :
                  "bg-zinc-800 text-zinc-400"
                )}>
                  {runtimeState?.state || 'idle'}
                </span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-medium">Scene ID</span>
                  <span className="font-mono text-white">{activeSceneId}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-medium">Video Time</span>
                  <span className="font-mono text-white flex items-center gap-2">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {runtimeState?.currentTime.toFixed(3)}s
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-medium">Active Interaction</span>
                  <span className="font-mono text-blue-400">{activeInteraction?.id || 'none'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-medium">Notification</span>
                  <span className="font-mono text-amber-400">{runtimeState?.activeNotificationId || 'none'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-medium">Selected Option</span>
                  <span className="font-mono text-zinc-300">{runtimeState?.lastChoiceResult?.optionId || '-'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-medium">Transition</span>
                  <span className="font-mono text-purple-400">{runtimeState?.transitionTargetId || 'none'}</span>
                </div>
                
                {runtimeState?.state === 'completed' && SCENES[activeSceneId]?.nextSceneId && (
                  <div className="pt-4 border-t border-zinc-800 mt-2">
                    <button 
                      onClick={goToNextScene}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all group"
                    >
                      <span className="text-xs font-bold uppercase tracking-widest">Go to Next Scene</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Event Log */}
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 h-[400px] flex flex-col">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-3 h-3 text-zinc-500" /> GLOBAL EVENT LOG
                </h3>
                <Activity className="w-3 h-3 text-green-500 animate-pulse" />
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[11px]">
                {logs.length === 0 && <div className="text-zinc-700 italic">No events recorded...</div>}
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                    <span className={cn(
                      "break-all",
                      log.event.includes('error') ? "text-red-400" :
                      log.event.includes('completed') ? "text-green-400" :
                      log.event.includes('scene_') ? "text-blue-400" :
                      log.event.includes('interaction_') ? "text-amber-400" :
                      "text-zinc-400"
                    )}>
                      {log.event}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileVideo(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 10l5-5v14l-5-5" />
      <rect width="14" height="14" x="2" y="5" rx="2" ry="2" />
    </svg>
  );
}
