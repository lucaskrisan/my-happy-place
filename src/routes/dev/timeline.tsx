import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { DevBackButton } from "@/components/dev-tools";
import { VideoStage } from "@/components/dev/VideoStage";
import { IncomingCallOverlay, CallState } from "@/components/dev/IncomingCallOverlay";
import { MessagingOverlay } from "@/components/dev/MessagingOverlay";
import { NotificationOverlay, NotificationInteractionEvent } from "@/components/dev/NotificationOverlay";
import { ChatMessage } from "@/types/messaging";

import { TimelineEngine } from "@/engine/timeline/timelineEngine";
import { TimelineEvent } from "@/engine/timeline/timelineTypes";
import { 
  Play, 
  Pause, 
  RefreshCcw, 
  FileVideo, 
  Terminal, 
  Activity, 
  Type, 
  Volume2, 
  PhoneIncoming,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/dev/timeline")({
  component: TimelineLab,
});

type EventLog = {
  timestamp: string;
  event: string;
};

const INITIAL_EVENTS: TimelineEvent[] = [
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
    id: 'mother-call',
    type: 'incoming_call',
    at: 10.4,
    blocking: true,
    payload: { 
      callerName: 'Mamãe', 
      callerSubtitle: 'Ligação recebida' 
    }
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
      timestamp: "agora",
      autoDismiss: true,
      autoDismissMs: 5000,
      tapAction: {
        type: "open_messaging",
        id: "mother-chat-from-notification"
      }
    }
  }
];

const INTERACTION_LIBRARY: Record<string, any> = {
  "mother-chat-from-notification": {
    id: "mother-chat-from-notification",
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
  }
};

type InteractionAction = 
  | { type: 'open_messaging'; id: string };


function TimelineLab() {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [sfxFile, setSfxFile] = useState<{ url: string, name: string }>({ url: "", name: "" });
  const [chatAudioFile, setChatAudioFile] = useState<{ url: string, name: string }>({ url: "", name: "" });
  const [notificationSfxFile, setNotificationSfxFile] = useState<{ url: string, name: string }>({ url: "", name: "" });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [logs, setLogs] = useState<EventLog[]>([]);
  
  // Overlay Control
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'incoming_call' | 'messaging'>('none');
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(null);
  const [actionExecuted, setActionExecuted] = useState(false);
  const [videoPausedAt, setVideoPausedAt] = useState<number | null>(null);
  const [triggeredBy, setTriggeredBy] = useState<string | null>(null);
  const [messagingCloseBehavior, setMessagingCloseBehavior] = useState<'prevent' | 'skip'>('prevent');
  
  // Timeline State
  const [events, setEvents] = useState<TimelineEvent[]>(INITIAL_EVENTS);
  const engine = useMemo(() => new TimelineEngine(events), []);
  
  // UI States for events
  const [activeText, setActiveText] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const addLog = useCallback((event: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR', { 
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
    setLogs(prev => [{ timestamp, event }, ...prev].slice(0, 150));
  }, []);


  // Update engine if events change (e.g. from editor)
  useEffect(() => {
    engine.setEvents(events);
  }, [events, engine]);

  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(URL.createObjectURL(file));
      addLog(`video_loaded: ${file.name}`);
    }
  };

  const handleSfxFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (sfxFile.url) URL.revokeObjectURL(sfxFile.url);
      setSfxFile({ url: URL.createObjectURL(file), name: file.name });
      addLog(`sfx_loaded: ${file.name}`);
    }
  };

  const handleNotificationSfxFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (notificationSfxFile.url) URL.revokeObjectURL(notificationSfxFile.url);
      setNotificationSfxFile({ url: URL.createObjectURL(file), name: file.name });
      addLog(`notification_sfx_loaded: ${file.name}`);
    }
  };

  const handleChatAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (chatAudioFile.url) URL.revokeObjectURL(chatAudioFile.url);
      setChatAudioFile({ url: URL.createObjectURL(file), name: file.name });
      addLog(`chat_audio_loaded: ${file.name}`);
    }
  };



  const processEvents = useCallback((time: number) => {
    const { triggered, pauseRequired } = engine.process(time, isPlaying);
    
    triggered.forEach(event => {
      addLog(`event_triggered: ${event.id} (${event.type})`);
      
      if (event.type === 'text_reveal') {
        setActiveText(event.payload?.['text'] as string);
        setTimeout(() => setActiveText(null), 2000);
        addLog(`event_completed: ${event.id}`);
      }
      
      if (event.type === 'play_sfx') {
        if (sfxFile.url) {
          const audio = new Audio(sfxFile.url);
          audio.play();
        } else {
          addLog(`play_sfx_missing_source: ${event.id}`);
        }
        addLog(`event_completed: ${event.id}`);
      }
      
      if (event.type === 'incoming_call') {
        setActiveOverlay('incoming_call');
        addLog(`blocking_started: ${event.id}`);
        addLog(`call_opened`);
      }

      if (event.type === 'notification') {
        // Only show if no blocking overlay is active
        if (activeOverlay === 'none') {
          setActiveNotificationId(event.id);
        } else {
          // If blocking is active, we should keep it armed so it fires after blocking
          // The current engine completes non-blocking immediately.
          // To follow instruction 23, we should have the engine re-process later or handle it here.
          // For now, let's just log that it was suppressed.
          addLog(`notification_suppressed_by_blocking: ${event.id}`);
          // Force engine to re-arm this so it can try again when no blocking is active
          engine.rearmEvent(event.id);
        }
      }

      if (event.type === 'whatsapp_open') {
        setActiveOverlay('messaging');
        addLog(`blocking_started: ${event.id}`);
        addLog(`messaging_opened`);
      }
    });


    if (pauseRequired && videoRef.current) {
      videoRef.current.pause();
      addLog(`pause_required_by_engine`);
    }
  }, [engine, isPlaying, addLog, sfxFile.url]);

  const handleCallStateChange = (state: CallState) => {
    addLog(`call_state: ${state}`);
    if (state === 'ended' || state === 'declined') {
      const activeId = engine.getActiveBlockingEventId();
      if (activeId) {
        engine.completeEvent(activeId);
        addLog(`call_completed`);
        addLog(`blocking_completed: ${activeId}`);
      }
      
      setTimeout(() => {
        setActiveOverlay('none');
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play();
            addLog(`video_resumed`);
          }
        }, 400);
      }, 500);
    }
  };

  const handleMessagingComplete = () => {
    addLog(`messaging_completed`);
    const activeId = engine.getActiveBlockingEventId();
    if (activeId) {
      engine.completeEvent(activeId);
      addLog(`blocking_completed: ${activeId}`);
    }

    setTimeout(() => {
      setActiveOverlay('none');
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play();
          addLog(`video_resumed`);
        }
      }, 400);
    }, 500);
  };

  const handleMessagingClose = () => {
    if (messagingCloseBehavior === 'prevent') {
      addLog(`messaging_close_prevented`);
      return;
    }

    addLog(`messaging_skipped`);
    const activeId = engine.getActiveBlockingEventId();
    if (activeId) {
      engine.skipEvent(activeId);
      addLog(`blocking_skipped: ${activeId}`);
    }

    setActiveOverlay('none');
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play();
        addLog(`video_resumed`);
      }
    }, 400);
  };

  const forceSkipMessaging = () => {
    addLog(`messaging_force_skipped`);
    const activeId = engine.getActiveBlockingEventId();
    if (activeId) {
      engine.skipEvent(activeId);
    }
    setActiveOverlay('none');
    setTimeout(() => {
      videoRef.current?.play();
    }, 400);
  };


  const handleReset = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    engine.reset();
    setActiveOverlay('none');
    setActiveNotificationId(null);
    setActionExecuted(false);
    setVideoPausedAt(null);
    setTriggeredBy(null);
    setActiveText(null);
    setCurrentTime(0);
    addLog("video_play");
    addLog("experience_reset");
  };

  const resolveInteractionAction = (action: InteractionAction, sourceId: string) => {
    if (actionExecuted) return;
    
    if (action.type === 'open_messaging') {
      setActionExecuted(true);
      setTriggeredBy(sourceId);
      
      if (videoRef.current) {
        const timeAtTap = videoRef.current.currentTime;
        setVideoPausedAt(timeAtTap);
        videoRef.current.pause();
        addLog(`video_current_time: ${timeAtTap.toFixed(3)}`);
        addLog(`video_paused_for_interaction`);
      }
      
      setActiveOverlay('messaging');
      addLog(`interaction_action: open_messaging`);
      addLog(`messaging_opened`);
    }
  };

  const handleNotificationInteraction = (e: NotificationInteractionEvent) => {
    addLog(e.type);
    
    if (e.type === 'notification_auto_dismissed' || e.type === 'notification_swiped') {
      setActiveNotificationId(null);
      if (activeNotificationId) {
        engine.completeEvent(activeNotificationId);
        addLog(`event_completed: ${activeNotificationId}`);
      }
    }
    
    if (e.type === 'notification_tapped') {
      if (activeNotificationId) {
        const event = events.find(ev => ev.id === activeNotificationId);
        const tapAction = event?.payload?.['tapAction'] as InteractionAction | undefined;
        
        engine.completeEvent(activeNotificationId);
        addLog(`event_completed: ${activeNotificationId}`);
        
        if (tapAction) {
          resolveInteractionAction(tapAction, activeNotificationId);
        }
        
        setActiveNotificationId(null);
      }
    }
  };


  const activeNotificationPayload = useMemo(() => {
    if (!activeNotificationId) return null;
    const event = events.find(e => e.id === activeNotificationId);
    if (!event || !event.payload) return null;
    return {
      appName: event.payload['appName'],
      senderName: event.payload['senderName'],
      message: event.payload['message'],
      timestamp: event.payload['timestamp'],
      autoDismiss: event.payload['autoDismiss'],
      autoDismissMs: event.payload['autoDismissMs'],
      soundSrc: notificationSfxFile.url || event.payload['soundSrc']
    };
  }, [activeNotificationId, events, notificationSfxFile.url]);


  const chatPayload = useMemo(() => {
    // If we have a triggered interaction, use that config
    if (triggeredBy && INTERACTION_LIBRARY[triggeredBy]) {
      const config = INTERACTION_LIBRARY[triggeredBy];
      const payload = config.payload;
      
      const messages = payload.messages.map((m: any) => {
        if (m.type === 'voice_once') {
          return { ...m, audioSrc: chatAudioFile.url || m.audioSrc };
        }
        return m;
      });

      return {
        contactName: payload.contactName,
        contactSubtitle: payload.contactSubtitle,
        messages
      };
    }

    // Fallback to legacy behavior if needed
    const event = events.find(e => e.type === 'whatsapp_open');
    if (!event || !event.payload) return null;
    
    const payload = event.payload as { 
      contactName: string; 
      contactSubtitle: string; 
      messages: ChatMessage[] 
    };

    const messages = payload.messages.map(m => {
      if (m.type === 'voice_once') {
        return { ...m, audioSrc: chatAudioFile.url || m.audioSrc };
      }
      return m;
    });

    return {
      contactName: payload.contactName,
      contactSubtitle: payload.contactSubtitle,
      messages
    };
  }, [triggeredBy, events, chatAudioFile.url]);




  const updateEventTime = (id: string, newTime: number) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, at: newTime } : e));
    addLog(`event_time_updated: ${id} -> ${newTime}s`);
  };



  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <DevBackButton />
          <h1 className="text-2xl font-black tracking-tighter text-white">TIMELINE ENGINE LAB</h1>
          <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm hover:bg-zinc-800 transition-all">
            <RefreshCcw className="w-4 h-4" />
            Reset Experience
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Visualizer */}
          <div className="lg:col-span-8 space-y-6">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
              {videoUrl ? (
                <VideoStage 
                  ref={videoRef}
                  src={videoUrl}
                  onTimeUpdate={(t) => {
                    setCurrentTime(t);
                    processEvents(t);
                  }}
                  onReady={(v) => setDuration(v.duration)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700">
                  <FileVideo className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-sm">Carregar vídeo para iniciar</p>
                </div>
              )}

              {/* Text Reveal Layer */}
              {activeText && (
                <div className="absolute inset-0 flex items-end justify-center pb-20 pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <p className="text-xl font-medium tracking-tight italic text-white/90">{activeText}</p>
                  </div>
                </div>
              )}

              {/* Blocking Call Overlay */}
              <IncomingCallOverlay 
                open={activeOverlay === 'incoming_call'}
                callerName="Mamãe"
                onStateChange={handleCallStateChange}
              />

              {chatPayload && (
                <MessagingOverlay 
                  open={activeOverlay === 'messaging'}
                  contactName={chatPayload.contactName}
                  contactSubtitle={chatPayload.contactSubtitle}
                  messages={chatPayload.messages as ChatMessage[]}
                  onComplete={handleMessagingComplete}
                  onClose={handleMessagingClose}
                  onInteraction={(e) => addLog(`${e.type}${e.messageId ? `: ${e.messageId}` : ''}`)}
                />
              )}
            </div>


            {/* Video Controls & Timeline Visual */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => isPlaying ? videoRef.current?.pause() : videoRef.current?.play()}
                  className="p-4 bg-blue-600 rounded-2xl hover:bg-blue-500 transition-all"
                >
                  {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
                </button>
                <div className="flex-1 space-y-2">
                  <div className="h-2 w-full bg-zinc-800 rounded-full relative overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-blue-500 transition-all duration-100" 
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                    {/* Event Markers */}
                    {events.map(event => (
                      <div 
                        key={event.id}
                        className={cn(
                          "absolute top-0 w-1 h-full -ml-0.5 z-10",
                          event.status === 'completed' ? "bg-green-500" : "bg-white/50"
                        )}
                        style={{ left: `${(event.at / duration) * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>{currentTime.toFixed(3)}s</span>
                    <span>{duration.toFixed(3)}s</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Vídeo</label>
                  <input type="file" accept="video/*" onChange={handleVideoFile} className="w-full text-xs bg-black/20 border border-zinc-800 p-2 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">SFX Event Source</label>
                  <input type="file" accept="audio/*" onChange={handleSfxFile} className="w-full text-xs bg-black/20 border border-zinc-800 p-2 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">mother-chat / voice_once</label>
                  <input type="file" accept="audio/*" onChange={handleChatAudioFile} className="w-full text-xs bg-black/20 border border-zinc-800 p-2 rounded-lg" />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Messaging close behavior</label>
                    <div className="flex gap-2">
                      {['prevent', 'skip'].map((b) => (
                        <button
                          key={b}
                          onClick={() => setMessagingCloseBehavior(b as any)}
                          className={cn(
                            "px-3 py-1 text-[10px] rounded border transition-all",
                            messagingCloseBehavior === b 
                              ? "bg-blue-600 border-blue-500 text-white" 
                              : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                          )}
                        >
                          {b.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  {activeOverlay === 'messaging' && (
                    <button 
                      onClick={forceSkipMessaging}
                      className="px-4 py-2 bg-red-900/30 border border-red-800 text-red-500 text-[10px] font-bold rounded-lg hover:bg-red-900/50 transition-all"
                    >
                      FORCE CLOSE / SKIP
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Event Editor & Logs */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Events Configuration
                </h3>
                <button onClick={() => { engine.rearmAll(); setEvents([...events]); addLog("rearm_all_events"); }} className="text-[10px] text-blue-400 hover:underline">Rearm All</button>
              </div>
              
              <div className="space-y-3">
                {events.map(event => (
                  <div key={event.id} className="bg-black/40 border border-zinc-800/50 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {event.type === 'text_reveal' && <Type className="w-3 h-3 text-blue-400" />}
                        {event.type === 'play_sfx' && <Volume2 className="w-3 h-3 text-purple-400" />}
                        {event.type === 'incoming_call' && <PhoneIncoming className="w-3 h-3 text-green-400" />}
                        {event.type === 'whatsapp_open' && <MessageSquare className="w-3 h-3 text-emerald-400" />}
                        <span className="text-xs font-bold truncate max-w-[100px]">{event.id}</span>

                      </div>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded uppercase font-bold",
                        event.status === 'completed' ? "bg-green-500/10 text-green-500" : 
                        event.status === 'active' ? "bg-orange-500/10 text-orange-500" :
                        "bg-zinc-800 text-zinc-500"
                      )}>
                        {event.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 bg-black/20 rounded px-2 py-1">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        <input 
                          type="number" 
                          value={event.at} 
                          step="0.1"
                          onChange={(e) => updateEventTime(event.id, parseFloat(e.target.value))}
                          className="bg-transparent text-[10px] w-full focus:outline-none" 
                        />
                      </div>
                      {event.blocking && <span className="text-[9px] text-zinc-600 font-bold border border-zinc-800 px-1 rounded">BLOCKING</span>}
                      <button onClick={() => { engine.rearmEvent(event.id); setEvents([...events]); addLog(`rearm_event: ${event.id}`); }} className="p-1 hover:bg-zinc-800 rounded">
                        <RefreshCcw className="w-3 h-3 text-zinc-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Debug & Logs */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col h-[400px]">
              <div className="mb-4 space-y-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 shrink-0">
                  <Activity className="w-4 h-4" />
                  Timeline Debug
                </h3>
                <div className="bg-black/40 rounded-lg p-3 space-y-1 text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Active blocking:</span>
                    <span className="text-zinc-300">{engine.getActiveBlockingEventId() || 'none'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Overlay:</span>
                    <span className="text-zinc-300">{activeOverlay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Messaging state:</span>
                    <span className="text-zinc-300">
                      {events.find(e => e.id === 'mother-chat')?.status || 'armed'}
                    </span>
                  </div>
                </div>
              </div>

              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0">
                <Terminal className="w-4 h-4" />
                Event Log
              </h3>

              <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[10px] scrollbar-thin scrollbar-thumb-zinc-800">
                {logs.map((log, i) => (
                  <div key={i} className={cn(
                    "flex gap-3 py-1 border-b border-zinc-800/30",
                    i === 0 ? "text-blue-400" : "text-zinc-500"
                  )}>
                    <span className="shrink-0 opacity-40">{log.timestamp}</span>
                    <span className="truncate">{log.event}</span>
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
