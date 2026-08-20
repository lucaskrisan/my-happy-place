import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DevBackButton } from "@/components/dev-tools";
import { IncomingCallOverlay, type CallState } from "@/components/dev/IncomingCallOverlay";
import { NotificationOverlay } from "@/components/dev/NotificationOverlay";
import { MessagingOverlay } from "@/components/dev/MessagingOverlay";
import scene02DinnerAsset from "@/assets/scene-02/video/scene-02-dinner.mp4.asset.json";
import scene03Asset from "@/assets/scene-03/video/scene-03.mp4.asset.json";
import scene03ConsequenceAsset from "@/assets/scene-03/video/scene-03-consequence-reaction.mp4.asset.json";
import { QuizOverlay } from "@/components/dev/QuizOverlay";
import { QuizDefinition, QuizResult } from "@/types/quiz";
import { STORY_MAP } from "@/dev/story-checkpoints";
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
  Info,
  Bell,
  MessageSquare,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

 
const LUCIA_AVATAR_URL =
  "https://res.cloudinary.com/duht4tq1f/image/upload/v1787083754/Woman_smiling_at_camera_2K_202608181701_y39jad.jpg";
const FUTURE_MARINA_AVATAR_URL = 
  "https://res.cloudinary.com/duht4tq1f/image/upload/v1787185689/marina_empres%C3%A1ria_kbotns.png";
 

 
import { z } from "zod";

const sceneSearchSchema = z.object({
  autostart: z.string().optional(),
  checkpoint: z.string().optional(),
});

export const Route = createFileRoute("/dev/door-scene")({
  validateSearch: (search) => sceneSearchSchema.parse(search),
  component: DoorScenePreview,
});


type AssetStatus = 'loading' | 'ready' | 'missing';

interface Asset {
  path: string;
  label: string;
  type: 'video' | 'audio' | 'image';
}

const SCENE_ASSETS: Asset[] = [
  { path: "/assets/scene-01/video/scene-01-door.mp4", label: "scene-01-door.mp4", type: 'video' },
  { path: "/assets/scene-01/video/scene-01-memory.mp4", label: "scene-01-memory.mp4", type: 'video' },
  { path: "/assets/scene-01/video/scene-01-memory-door.mp4", label: "scene-01-memory-door.mp4", type: 'video' },
  { path: "/assets/scene-01/video/scene-01-mother-precall.mp4", label: "scene-01-mother-precall.mp4", type: 'video' },
  { path: scene02DinnerAsset.url, label: "scene-02-dinner.mp4", type: 'video' },
  { path: "/assets/scene-02/video/scene-02-lucia-send-audio.mp4", label: "scene-02-lucia-send-audio.mp4", type: 'video' },
  { path: scene03Asset.url, label: "scene-03-time-passage-first-pattern.mp4", type: 'video' },
  { path: scene03ConsequenceAsset.url, label: "scene-03-consequence-reaction.mp4", type: 'video' },
  { path: "/assets/scene-04/video/scene-04-marina-future-call-intro-01.mp4", label: "scene-04-marina-future-call-intro-01.mp4", type: 'video' },
  { path: "/assets/scene-01/audio/ringtone.mp3", label: "ringtone.mp3", type: 'audio' },
  { path: "/assets/scene-01/audio/phone-vibration.mp3", label: "phone-vibration.mp3", type: 'audio' },
  { path: "/assets/scene-01/audio/call-connect.mp3", label: "call-connect.mp3", type: 'audio' },
  { path: "/assets/scene-01/audio/mother-call-01.mp3", label: "mother-call-01.mp3", type: 'audio' },
  { path: "/assets/scene-02/audio/mother-voice-once-01.mp3", label: "mother-voice-once-01.mp3", type: 'audio' },
  { path: "/assets/scene-04/audio/marina-future-call-01.mp3", label: "marina-future-call-01.mp3", type: 'audio' },
  { path: "/assets/scene-01/audio/call-end.mp3", label: "call-end.mp3", type: 'audio' },
  { path: "/assets/scene-02/audio/notification.mp3", label: "notification.mp3", type: 'audio' },
  { path: "/assets/characters/lucia.webp", label: "lucia.webp", type: 'image' },
];

function DoorScenePreview() {
  const { autostart, checkpoint } = Route.useSearch();
  const isPublicMode = autostart === "1";
  const [showAutoplayFallback, setShowAutoplayFallback] = useState(false);
  const autostartGuardRef = useRef(false);
  const checkpointAppliedRef = useRef(false);

  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callState, setCallState] = useState<CallState>("idle");
  const [assetStatuses, setAssetStatuses] = useState<Record<string, AssetStatus>>({});
  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // New Scene Logic States
  const [sceneStep, setSceneStep] = useState<"idle" | "present" | "memory" | "memory-door" | "pre-call" | "call" | "scene02" | "lucia-send-audio" | "scene03" | "scene03-consequence" | "future-marina-precall" | "future-marina-call" | "pattern-reveal-complete">("idle");
  const [isMessagingClosing, setIsMessagingClosing] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  
  // Quiz States
  const [isPredictionQuizOpen, setIsPredictionQuizOpen] = useState(false);
  const [isScene03QuizOpen, setIsScene03QuizOpen] = useState(false);
  const [quizChoice, setQuizChoice] = useState<QuizResult | null>(null);
  const [scene03QuizResult, setScene03QuizResult] = useState<QuizResult | null>(null);
  
  const scene02NotificationTriggeredRef = useRef(false);
  const scene02QuizTriggeredRef = useRef(false);
  const scene03TriggeredRef = useRef(false);
  const scene03QuizTriggeredRef = useRef(false);
  const narrativeTimersRef = useRef<number[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const memoryVideoRef = useRef<HTMLVideoElement>(null);
  const memoryDoorVideoRef = useRef<HTMLVideoElement>(null);
  const preCallVideoRef = useRef<HTMLVideoElement>(null);
  const scene02VideoRef = useRef<HTMLVideoElement>(null);
  const luciaSendAudioVideoRef = useRef<HTMLVideoElement>(null);
  const scene03VideoRef = useRef<HTMLVideoElement>(null);
  const scene03ConsequenceVideoRef = useRef<HTMLVideoElement>(null);
  const futureMarinaPreCallVideoRef = useRef<HTMLVideoElement>(null);

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

  const playFullScene = useCallback(() => {
    setSceneStep("present");
    setShowCopy(false);
    setIsCallOpen(false);
    setShowAutoplayFallback(false);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch((err) => {
        console.warn("Autoplay blocked in Scene 01", err);
        if (isPublicMode) {
          setShowAutoplayFallback(true);
        }
      });
      setIsPlaying(true);
    }
    [memoryVideoRef, memoryDoorVideoRef, preCallVideoRef, scene02VideoRef, luciaSendAudioVideoRef, scene03VideoRef, scene03ConsequenceVideoRef, futureMarinaPreCallVideoRef].forEach(ref => {
      if (ref.current) {
        ref.current.currentTime = 0;
        ref.current.load();
      }
    });
    scene02NotificationTriggeredRef.current = false;
    scene02QuizTriggeredRef.current = false;
    scene03TriggeredRef.current = false;
    scene03QuizTriggeredRef.current = false;
    setIsPredictionQuizOpen(false);
    setIsScene03QuizOpen(false);
    setQuizChoice(null);
    setScene03QuizResult(null);
    setIsMessagingClosing(false);
    narrativeTimersRef.current.forEach(clearTimeout);
    narrativeTimersRef.current = [];
  }, [isPublicMode]);

  // Autostart Trigger
  useEffect(() => {
    if (isPublicMode && !autostartGuardRef.current) {
      autostartGuardRef.current = true;
      // Wait for refs to be stable
      const timer = window.setTimeout(() => {
        playFullScene();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isPublicMode, playFullScene]);

  // Checkpoint Trigger
  useEffect(() => {
    if (!checkpoint || checkpointAppliedRef.current || isPublicMode) return;

    const applyCheckpoint = async () => {
      checkpointAppliedRef.current = true;
      
      const resetForCheckpoint = () => {
        setIsPlaying(false);
        setIsCallOpen(false);
        setIsNotificationVisible(false);
        setIsMessagingOpen(false);
        setIsPredictionQuizOpen(false);
        setIsScene03QuizOpen(false);
        scene02NotificationTriggeredRef.current = false;
        scene02QuizTriggeredRef.current = false;
        scene03TriggeredRef.current = false;
        scene03QuizTriggeredRef.current = false;
        narrativeTimersRef.current.forEach(clearTimeout);
        narrativeTimersRef.current = [];
      };

      const waitForMetadata = (video: HTMLVideoElement) => {
        if (video.readyState >= 1) return Promise.resolve();
        return new Promise<void>((resolve) => {
          video.addEventListener('loadedmetadata', () => resolve(), { once: true });
        });
      };

      const seekToTime = (video: HTMLVideoElement, time: number) => {
        return new Promise<void>((resolve) => {
          video.currentTime = time;
          video.addEventListener('seeked', () => resolve(), { once: true });
        });
      };

      resetForCheckpoint();

      switch (checkpoint) {
        case 'scene01-start':
          playFullScene();
          break;

        case 'scene01-call':
          setSceneStep("pre-call");
          if (preCallVideoRef.current) {
            await waitForMetadata(preCallVideoRef.current);
            await seekToTime(preCallVideoRef.current, Math.max(0, preCallVideoRef.current.duration - 0.5));
            preCallVideoRef.current.play();
            setIsPlaying(true);
          }
          break;

        case 'scene02-start':
          setSceneStep("scene02");
          if (scene02VideoRef.current) {
            await waitForMetadata(scene02VideoRef.current);
            scene02VideoRef.current.currentTime = 0;
            scene02VideoRef.current.play();
            setIsPlaying(true);
          }
          break;

        case 'scene02-quiz':
          setSceneStep("scene02");
          scene02QuizTriggeredRef.current = true;
          if (scene02VideoRef.current) {
            await waitForMetadata(scene02VideoRef.current);
            await seekToTime(scene02VideoRef.current, 19.0);
            setIsPredictionQuizOpen(true);
          }
          break;

        case 'scene02-notification':
          setSceneStep("scene02");
          if (scene02VideoRef.current) {
            await waitForMetadata(scene02VideoRef.current);
            await seekToTime(scene02VideoRef.current, Math.max(0, scene02VideoRef.current.duration - 2.1));
            scene02VideoRef.current.play();
            setIsPlaying(true);
          }
          break;

        case 'lucia-send-audio':
          setSceneStep("lucia-send-audio");
          if (luciaSendAudioVideoRef.current) {
            await waitForMetadata(luciaSendAudioVideoRef.current);
            luciaSendAudioVideoRef.current.currentTime = 0;
            luciaSendAudioVideoRef.current.play();
            setIsPlaying(true);
          }
          break;

        case 'whatsapp':
          setSceneStep("lucia-send-audio"); // Technical requirement for the transition
          setIsMessagingOpen(true);
          break;

        case 'scene03-start':
          setSceneStep("scene03");
          if (scene03VideoRef.current) {
            await waitForMetadata(scene03VideoRef.current);
            scene03VideoRef.current.currentTime = 0;
            scene03VideoRef.current.play();
            setIsPlaying(true);
          }
          break;

        case 'scene03-consequence':
          setSceneStep("scene03-consequence");
          if (scene03ConsequenceVideoRef.current) {
            await waitForMetadata(scene03ConsequenceVideoRef.current);
            scene03ConsequenceVideoRef.current.currentTime = 0;
            scene03ConsequenceVideoRef.current.play();
            setIsPlaying(true);
          }
          break;

        case 'scene03-quiz':
          setSceneStep("scene03-consequence");
          scene03QuizTriggeredRef.current = true;
          if (scene03ConsequenceVideoRef.current) {
            await waitForMetadata(scene03ConsequenceVideoRef.current);
            await seekToTime(scene03ConsequenceVideoRef.current, Math.max(0, scene03ConsequenceVideoRef.current.duration - 0.1));
            setIsScene03QuizOpen(true);
          }
          break;
        
        case 'future-marina-call-01':
          setSceneStep("future-marina-precall");
          if (futureMarinaPreCallVideoRef.current) {
            await waitForMetadata(futureMarinaPreCallVideoRef.current);
            futureMarinaPreCallVideoRef.current.currentTime = 0;
            futureMarinaPreCallVideoRef.current.play();
            setIsPlaying(true);
          }
          break;
      }
    };

    applyCheckpoint();
  }, [checkpoint, isPublicMode, playFullScene]);


  const handleVideoEnded = () => {
    if (sceneStep === "present") {
      setSceneStep("memory");
      if (memoryVideoRef.current) {
        memoryVideoRef.current.play().catch(console.error);
      }
    } else if (sceneStep === "memory") {
      setSceneStep("memory-door");
      if (memoryDoorVideoRef.current) {
        memoryDoorVideoRef.current.play().catch(console.error);
      }
    } else if (sceneStep === "memory-door") {
      setSceneStep("pre-call");
      if (preCallVideoRef.current) {
        preCallVideoRef.current.play().catch(console.error);
      }
    } else if (sceneStep === "pre-call") {
      // Step Pre-call ended -> Open Call Overlay IMMEDIATELY
      setSceneStep("call");
      setIsCallOpen(true);
    } else if (sceneStep === "scene02") {
      setIsPlaying(false);
    } else if (sceneStep === "lucia-send-audio") {
      setIsPlaying(false);
      setIsMessagingOpen(true);
    } else if (sceneStep === "scene03") {
      setSceneStep("scene03-consequence");
      if (scene03ConsequenceVideoRef.current) {
        scene03ConsequenceVideoRef.current.currentTime = 0;
        scene03ConsequenceVideoRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
    } else if (sceneStep === "scene03-consequence") {
      setIsPlaying(false);
      if (!scene03QuizTriggeredRef.current) {
        scene03QuizTriggeredRef.current = true;
        setIsScene03QuizOpen(true);
      }
    } else if (sceneStep === "future-marina-precall") {
      // Step Pre-call ended -> Open Call Overlay IMMEDIATELY
      setSceneStep("future-marina-call");
      setIsCallOpen(true);
    }
  };

  const handleContinue = () => {
    setShowCopy(false);
    setSceneStep("call");
    setIsCallOpen(true);
  };

  const handleCallEnd = () => {
    setIsCallOpen(false);
    
    if (sceneStep === "future-marina-call") {
      // End of experience for now
      setIsPlaying(false);
      return;
    }

    // Transição IMEDIATA para Cena 02
    setSceneStep("scene02");
    if (scene02VideoRef.current) {
      scene02VideoRef.current.play().catch(console.error);
    }
  };

  const togglePlay = () => {
    const activeVideo = 
      sceneStep === "memory" ? memoryVideoRef.current : 
      sceneStep === "memory-door" ? memoryDoorVideoRef.current :
      sceneStep === "pre-call" ? preCallVideoRef.current :
      sceneStep === "scene02" ? scene02VideoRef.current : 
      sceneStep === "lucia-send-audio" ? luciaSendAudioVideoRef.current :
      sceneStep === "scene03" ? scene03VideoRef.current :
      sceneStep === "scene03-consequence" ? scene03ConsequenceVideoRef.current :
      sceneStep === "future-marina-precall" ? futureMarinaPreCallVideoRef.current :
      videoRef.current;
      
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
    setIsNotificationVisible(false);
    setIsMessagingOpen(false);
    setIsMessagingClosing(false);
    setIsPredictionQuizOpen(false);
    setIsScene03QuizOpen(false);
    setQuizChoice(null);
    setScene03QuizResult(null);
    scene02NotificationTriggeredRef.current = false;
    scene02QuizTriggeredRef.current = false;
    scene03TriggeredRef.current = false;
    scene03QuizTriggeredRef.current = false;

    narrativeTimersRef.current.forEach(clearTimeout);
    narrativeTimersRef.current = [];

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
    if (memoryVideoRef.current) {
      memoryVideoRef.current.currentTime = 0;
      memoryVideoRef.current.pause();
    }
    if (memoryDoorVideoRef.current) {
      memoryDoorVideoRef.current.currentTime = 0;
      memoryDoorVideoRef.current.pause();
    }
    if (preCallVideoRef.current) {
      preCallVideoRef.current.currentTime = 0;
      preCallVideoRef.current.pause();
    }
    if (scene02VideoRef.current) {
      scene02VideoRef.current.currentTime = 0;
      scene02VideoRef.current.pause();
    }
    if (luciaSendAudioVideoRef.current) {
      luciaSendAudioVideoRef.current.currentTime = 0;
      luciaSendAudioVideoRef.current.pause();
    }
    if (scene03VideoRef.current) {
      scene03VideoRef.current.currentTime = 0;
      scene03VideoRef.current.pause();
    }
    if (scene03ConsequenceVideoRef.current) {
      scene03ConsequenceVideoRef.current.currentTime = 0;
      scene03ConsequenceVideoRef.current.pause();
    }
    if (futureMarinaPreCallVideoRef.current) {
      futureMarinaPreCallVideoRef.current.currentTime = 0;
      futureMarinaPreCallVideoRef.current.pause();
    }
  };

  const handleTimeUpdate = () => {
    const activeVideo = 
      sceneStep === "memory" ? memoryVideoRef.current : 
      sceneStep === "memory-door" ? memoryDoorVideoRef.current :
      sceneStep === "pre-call" ? preCallVideoRef.current :
      sceneStep === "scene02" ? scene02VideoRef.current : 
      sceneStep === "lucia-send-audio" ? luciaSendAudioVideoRef.current :
      sceneStep === "scene03" ? scene03VideoRef.current :
      sceneStep === "scene03-consequence" ? scene03ConsequenceVideoRef.current :
      sceneStep === "future-marina-precall" ? futureMarinaPreCallVideoRef.current :
      videoRef.current;
      
    if (activeVideo) {
      setCurrentTime(activeVideo.currentTime);

      // 1. Prediction Quiz Trigger at ~19s
      if (
        sceneStep === "scene02" && 
        !scene02QuizTriggeredRef.current &&
        activeVideo.currentTime >= 19.0
      ) {
        scene02QuizTriggeredRef.current = true;
        activeVideo.pause();
        setIsPlaying(false);
        setIsPredictionQuizOpen(true);
      }

      // 2. Early notification for Scene 02 (2 seconds before end)
      if (
        sceneStep === "scene02" && 
        !scene02NotificationTriggeredRef.current &&
        Number.isFinite(activeVideo.duration) &&
        activeVideo.duration > 0 &&
        activeVideo.duration - activeVideo.currentTime <= 2
      ) {
        scene02NotificationTriggeredRef.current = true;
        setIsNotificationVisible(true);
      }
    }
  };

  const handleLoadedMetadata = () => {
    const activeVideo = 
      sceneStep === "memory" ? memoryVideoRef.current : 
      sceneStep === "memory-door" ? memoryDoorVideoRef.current :
      sceneStep === "pre-call" ? preCallVideoRef.current :
      sceneStep === "scene02" ? scene02VideoRef.current : 
      sceneStep === "lucia-send-audio" ? luciaSendAudioVideoRef.current :
      sceneStep === "scene03" ? scene03VideoRef.current :
      sceneStep === "scene03-consequence" ? scene03ConsequenceVideoRef.current :
      sceneStep === "future-marina-precall" ? futureMarinaPreCallVideoRef.current :
      videoRef.current;
      
    if (activeVideo) {
      setDuration(activeVideo.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const activeVideo = 
      sceneStep === "memory" ? memoryVideoRef.current : 
      sceneStep === "memory-door" ? memoryDoorVideoRef.current :
      sceneStep === "pre-call" ? preCallVideoRef.current :
      sceneStep === "scene02" ? scene02VideoRef.current : 
      sceneStep === "lucia-send-audio" ? luciaSendAudioVideoRef.current :
      sceneStep === "scene03" ? scene03VideoRef.current :
      sceneStep === "scene03-consequence" ? scene03ConsequenceVideoRef.current :
      sceneStep === "future-marina-precall" ? futureMarinaPreCallVideoRef.current :
      videoRef.current;
      
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

  const activeCheckpointData = STORY_MAP.find(s => s.id === checkpoint);

  return (
    <div className={cn(
      "min-h-screen bg-black flex flex-col md:flex-row font-sans text-zinc-300",
      isPublicMode && "md:flex-col" // Reset layout for public mode
    )}>
      {/* Checkpoint Banner */}
      {checkpoint && !isPublicMode && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-blue-600 text-white px-4 py-2 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-3">
            <Link to="/dev" className="text-[10px] font-black hover:underline flex items-center gap-1 uppercase tracking-tighter">
              ← VOLTAR PARA CENTRAL
            </Link>
            <div className="w-px h-4 bg-white/20" />
            <div className="text-[11px] font-bold flex items-center gap-2">
              <span className="opacity-50 uppercase tracking-widest text-[9px]">Produção</span>
              <span>/</span>
              <span className="uppercase tracking-widest text-[10px]">
                {activeCheckpointData ? `${activeCheckpointData.number} — ${activeCheckpointData.title}` : checkpoint}
              </span>
            </div>
          </div>
          <div className="hidden sm:block text-[9px] font-black uppercase tracking-[0.2em] bg-black/20 px-2 py-0.5 rounded">
            Checkpoint Ativo
          </div>
        </div>
      )}

      {/* Sidebar Debug / Assets - Hidden in Public Mode */}
      {!isPublicMode && (
        <div className={cn(
          "w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950 p-6 flex flex-col gap-8 overflow-y-auto transition-all",
          checkpoint && "pt-16" // Adjust for banner
        )}>
        <div className="flex items-center gap-3">
          <DevBackButton />
          <h1 className="text-sm font-bold text-white uppercase tracking-widest">Prévia da História</h1>
        </div>

        {/* Debug Visual */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <Info className="w-3 h-3" /> Estado Atual
          </h2>
          <div className="grid gap-2 text-xs">
            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Cena Atual</span>
              <span className="font-mono font-bold text-blue-400">
                {sceneStep === "scene02" || sceneStep === "lucia-send-audio" ? "SCENE_02" : 
                 sceneStep === "scene03" ? "SCENE_03" : 
                  sceneStep === "scene03-consequence" ? "SCENE_03_CONSEQUENCE" : 
                  sceneStep === "future-marina-precall" || sceneStep === "future-marina-call" ? "FUTURE_MARINA" : "SCENE_01"}

              </span>
            </div>
            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Status do Vídeo</span>
              <span className={cn(
                "font-mono font-bold",
                isPlaying ? "text-green-500" : "text-yellow-500"
              )}>
                {isPlaying ? "REPRODUZINDO" : "PAUSADO"}
              </span>
            </div>
            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Interação</span>
              <span className={cn(
                "font-mono font-bold",
                callState === 'idle' ? "text-zinc-400" : 
                callState === 'incoming' ? "text-blue-500 animate-pulse" : "text-green-500"
              )}>
                {callState === 'idle' ? "NENHUMA" : 
                 callState === 'incoming' ? "LIGAÇÃO_RECEBIDA" : "LIGAÇÃO_ATIVA"}
              </span>
            </div>
            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Quiz de Previsão</span>
              <span className={cn(
                "font-mono font-bold",
                quizChoice ? "text-green-500" : (scene02QuizTriggeredRef.current ? "text-blue-500" : "text-zinc-400")
              )}>
                {quizChoice ? "CONCLUÍDO" : (scene02QuizTriggeredRef.current ? "ATIVO" : "PENDENTE")}
              </span>
            </div>
            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Notificações</span>
              <span className={cn(
                "font-mono font-bold",
                isNotificationVisible ? "text-blue-500 animate-pulse" : "text-zinc-400"
              )}>
                {isNotificationVisible ? "PENDENTE" : "NENHUMA"}
              </span>
            </div>
            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 block mb-1">Tempo Atual</span>
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
                <Video className="w-3 h-3" /> Scene 01 Video
              </h3>
              {SCENE_ASSETS.filter(a => a.type === 'video' && a.path.includes('scene-01')).map(asset => (
                <AssetRow key={asset.path} asset={asset} status={assetStatuses[asset.path] || 'loading'} />
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="text-[9px] font-bold text-zinc-600 uppercase flex items-center gap-2">
                <Video className="w-3 h-3" /> Scene 02 Video
              </h3>
              {SCENE_ASSETS.filter(a => a.type === 'video' && a.path.includes('scene-02')).map(asset => (
                <AssetRow key={asset.path} asset={asset} status={assetStatuses[asset.path] || 'loading'} />
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="text-[9px] font-bold text-zinc-600 uppercase flex items-center gap-2">
                <Video className="w-3 h-3" /> Scene 03 Video
              </h3>
              {SCENE_ASSETS.filter(a => a.type === 'video' && a.path.includes('scene-03')).map(asset => (
                <AssetRow key={asset.path} asset={asset} status={assetStatuses[asset.path] || 'loading'} />
              ))}
            </div>
 
            <div className="space-y-2">
              <h3 className="text-[9px] font-bold text-zinc-600 uppercase flex items-center gap-2">
                <Video className="w-3 h-3" /> Scene 04 Video
              </h3>
              {SCENE_ASSETS.filter(a => a.type === 'video' && a.path.includes('scene-04')).map(asset => (
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
            <div className="space-y-2">
              <h3 className="text-[9px] font-bold text-zinc-600 uppercase flex items-center gap-2">
                <Info className="w-3 h-3" /> Characters
              </h3>
              {SCENE_ASSETS.filter(a => a.type === 'image').map(asset => (
                <AssetRow key={asset.path} asset={asset} status={assetStatuses[asset.path] || 'loading'} />
              ))}
            </div>
          </div>
        </section>
        </div>
      )}

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
              preload="auto"
              className={cn(
                "w-full h-full object-cover absolute inset-0 transition-opacity duration-0",
                sceneStep === "present" || sceneStep === "idle" ? "opacity-100 z-10" : "opacity-0 z-0"
              )}
              onPause={() => setIsPlaying(false)}
              onEnded={handleVideoEnded}
            />
            <video
              ref={scene03VideoRef}
              src={scene03Asset.url}
              playsInline
              preload="auto"
              className={cn(
                "w-full h-full object-cover absolute inset-0 transition-opacity duration-0",
                sceneStep === "scene03" ? "opacity-100 z-10" : "opacity-0 z-0"
              )}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleVideoEnded}
            />
            <video
              ref={memoryVideoRef}
              src="/assets/scene-01/video/scene-01-memory.mp4"
              playsInline
              preload="auto"
              className={cn(
                "w-full h-full object-cover absolute inset-0 transition-opacity duration-0",
                sceneStep === "memory" ? "opacity-100 z-10" : "opacity-0 z-0"
              )}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleVideoEnded}
            />
            <video
              ref={memoryDoorVideoRef}
              src="/assets/scene-01/video/scene-01-memory-door.mp4"
              playsInline
              preload="auto"
              className={cn(
                "w-full h-full object-cover absolute inset-0 transition-opacity duration-0",
                sceneStep === "memory-door" ? "opacity-100 z-10" : "opacity-0 z-0"
              )}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleVideoEnded}
            />
            <video
              ref={preCallVideoRef}
              src="/assets/scene-01/video/scene-01-mother-precall.mp4"
              playsInline
              preload="auto"
              className={cn(
                "w-full h-full object-cover absolute inset-0 transition-opacity duration-0",
                sceneStep === "pre-call" || sceneStep === "call" ? "opacity-100 z-10" : "opacity-0 z-0"
              )}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleVideoEnded}
            />
            <video
              ref={scene02VideoRef}
              src={scene02DinnerAsset.url}
              playsInline
              preload="auto"
               className={cn(
                "w-full h-full object-cover absolute inset-0 transition-opacity duration-0",
                sceneStep === "scene02" ? "opacity-100 z-10" : "opacity-0 z-0"
              )}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleVideoEnded}
            />
            <video
              ref={luciaSendAudioVideoRef}
              src="/assets/scene-02/video/scene-02-lucia-send-audio.mp4"
              playsInline
              preload="auto"
              className={cn(
                "w-full h-full object-cover absolute inset-0 transition-opacity duration-0",
                sceneStep === "lucia-send-audio" ? "opacity-100 z-10" : "opacity-0 z-0"
              )}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleVideoEnded}
            />
            <video
              ref={scene03ConsequenceVideoRef}
              src={scene03ConsequenceAsset.url}
              playsInline
              preload="auto"
              className={cn(
                "w-full h-full object-cover absolute inset-0 transition-opacity duration-0",
                sceneStep === "scene03-consequence" ? "opacity-100 z-10" : "opacity-0 z-0"
              )}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleVideoEnded}
            />
            <video
              ref={futureMarinaPreCallVideoRef}
              src="/assets/scene-04/video/scene-04-marina-future-call-intro-01.mp4"
              playsInline
              preload="auto"
              className={cn(
                "w-full h-full object-cover absolute inset-0 transition-opacity duration-0",
                sceneStep === "future-marina-precall" ? "opacity-100 z-10" : "opacity-0 z-0"
              )}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleVideoEnded}
            />

            {/* Transition Copy Overlay */}
            {showCopy && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-8 z-30 animate-in fade-in duration-300">
                <div className="text-center space-y-6">
                  <div className="space-y-2">
                    <p className="text-white text-lg font-light leading-relaxed animate-in slide-in-from-bottom-4 duration-700">
                      "Antes de entender o que sentiu...
                    </p>
                    <p className="text-white text-lg font-light leading-relaxed animate-in slide-in-from-bottom-4 duration-700 delay-150">
                      o corpo dela já tinha lembrado."
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-700 delay-500">
                    <button
                      onClick={handleContinue}
                      className="px-8 py-3 bg-white text-black rounded-full font-bold text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                      Continuar
                    </button>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest">
                      Toque para continuar
                    </span>
                  </div>
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

            {/* In-Video Controls (Overlay on Hover) - Hidden in Public Mode */}
            {!isPublicMode && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                 {!isPlaying && <Play className="w-16 h-16 text-white/50" />}
              </div>
            )}

            {/* Autoplay Fallback for Public Mode */}
            {showAutoplayFallback && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
                onClick={playFullScene}
              >
                <motion.div 
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-white text-[10px] tracking-[0.3em] font-light uppercase"
                >
                  Toque para continuar
                </motion.div>
              </motion.div>
            )}

            {/* Interaction Overlay */}
            <IncomingCallOverlay
              open={isCallOpen}
              callerName={sceneStep === "future-marina-call" ? "Marina" : "Mamãe"}
              callerAvatar={sceneStep === "future-marina-call" ? FUTURE_MARINA_AVATAR_URL : LUCIA_AVATAR_URL}

              callerSubtitle="Celular"
              ringtoneSrc={undefined} // No ringtone for Scene 01 as per requirement
              vibrationSrc={assetStatuses["/assets/scene-01/audio/phone-vibration.mp3"] === 'ready' ? "/assets/scene-01/audio/phone-vibration.mp3" : undefined}
              connectSfxSrc={assetStatuses["/assets/scene-01/audio/call-connect.mp3"] === 'ready' ? "/assets/scene-01/audio/call-connect.mp3" : undefined}
              voiceAudioSrc={
                sceneStep === "future-marina-call" 
                  ? (assetStatuses["/assets/scene-04/audio/marina-future-call-01.mp3"] === 'ready' ? "/assets/scene-04/audio/marina-future-call-01.mp3" : undefined)
                  : (assetStatuses["/assets/scene-01/audio/mother-call-01.mp3"] === 'ready' ? "/assets/scene-01/audio/mother-call-01.mp3" : undefined)
              }
              endSfxSrc={assetStatuses["/assets/scene-01/audio/call-end.mp3"] === 'ready' ? "/assets/scene-01/audio/call-end.mp3" : undefined}
              onStateChange={setCallState}
              onDecline={() => setIsCallOpen(false)}
              onEnd={handleCallEnd}
            />

            {/* Notification Overlay */}
            <NotificationOverlay
              open={isNotificationVisible}
              appName="Mensagens"
              senderName="Mamãe"
              avatar={LUCIA_AVATAR_URL}
              message="Preciso te mandar uma coisa."
              soundSrc={assetStatuses["/assets/scene-02/audio/notification.mp3"] === 'ready' ? "/assets/scene-02/audio/notification.mp3" : undefined}
              autoDismiss={false}
              onTap={() => {
                setIsNotificationVisible(false);
                setSceneStep("lucia-send-audio");
                if (luciaSendAudioVideoRef.current) {
                  luciaSendAudioVideoRef.current.play().catch(console.error);
                }
              }}
              onDismiss={() => setIsNotificationVisible(false)}
            />

            {/* Messaging Overlay */}
            <MessagingOverlay
              open={isMessagingOpen}
              closing={isMessagingClosing}
              contactName="Mamãe"
              contactAvatar={LUCIA_AVATAR_URL}
              contactSubtitle="online"
              messages={[
                {
                  id: 'msg-01',
                  type: 'text',
                  sender: 'contact',
                  text: 'Preciso te mandar uma coisa.',
                  timestamp: '22:15',
                  delay: 0
                },
                {
                  id: 'msg-voice-01',
                  type: 'voice_once',
                  sender: 'contact',
                  audioSrc: '/assets/scene-02/audio/mother-voice-once-01.mp3',
                  duration: 6,
                  timestamp: '22:15',
                  delay: 1000,
                }
              ]}
              onClose={() => {
                setIsMessagingOpen(false);
                setIsMessagingClosing(false);
              }}
              onComplete={() => {
                if (scene03TriggeredRef.current) return;
                scene03TriggeredRef.current = true;
                
                const timer1 = window.setTimeout(() => {
                  setIsMessagingClosing(true);
                }, 600);
                
                narrativeTimersRef.current.push(timer1);
              }}
              onExitComplete={() => {
                setIsMessagingOpen(false);
                setIsMessagingClosing(false);
                
                setSceneStep("scene03");
                if (scene03VideoRef.current) {
                  scene03VideoRef.current.currentTime = 0;
                  scene03VideoRef.current.play().catch(console.error);
                  setIsPlaying(true);
                }
              }}
            />

          {/* Scene 02 Prediction Quiz */}
          <QuizOverlay
            open={isPredictionQuizOpen}
            variant="immersive"
            definition={{
              id: "scene-02-prediction",
              title: "Antes de continuar...",
              feedbackMode: "none",
              showProgress: false,
              questions: [
                {
                  id: "q-prediction-01",
                  title: "O que você acha que Marina vai fazer agora?",
                  options: [
                    { id: "opt-1", label: "Perguntar de novo se ele está bravo", value: "ask_again" },
                    { id: "opt-2", label: "Pedir desculpa sem saber por quê", value: "apologize" },
                    { id: "opt-3", label: "Confrontar Daniel", value: "confront" },
                    { id: "opt-4", label: "Ficar quieta e se afastar", value: "withdraw" }
                  ]
                }
              ]
            }}
            closeBehavior="prevent"
            onComplete={(result) => {
              setQuizChoice(result);
              setIsPredictionQuizOpen(false);
              // Resume video immediately
              if (scene02VideoRef.current) {
                scene02VideoRef.current.play().catch(console.error);
                setIsPlaying(true);
              }
            }}
          />
          {/* Scene 03 Pattern Quiz */}
          <QuizOverlay
            open={isScene03QuizOpen}
            variant="immersive"
            definition={{
              id: "scene-03-pattern",
              feedbackMode: "none",
              showProgress: false,
              questions: [
                {
                  id: "q-pattern-01",
                  title: "Quando você sente que alguém pode não gostar do que você vai dizer, o que costuma acontecer?",
                  options: [
                    { id: "opt-1", label: "Eu diminuo o que ia dizer.", value: "self_erasure", tags: ["self_erasure"] },
                    { id: "opt-2", label: "Mudo de assunto ou deixo pra depois.", value: "avoidance", tags: ["avoidance"] },
                    { id: "opt-3", label: "Tento perceber primeiro se é seguro falar.", value: "hypervigilance", tags: ["hypervigilance"] },
                    { id: "opt-4", label: "Eu digo o que penso mesmo com desconforto.", value: "assertive", tags: ["assertive"] }
                  ]
                }
              ]
            }}
            closeBehavior="prevent"
            onComplete={(result) => {
              setScene03QuizResult(result);
              // Wait 900ms for microfeedback then close and start next video
              setTimeout(() => {
                setIsScene03QuizOpen(false);
                setSceneStep("future-marina-precall");
                if (futureMarinaPreCallVideoRef.current) {
                  futureMarinaPreCallVideoRef.current.currentTime = 0;
                  futureMarinaPreCallVideoRef.current.play().catch(console.error);
                  setIsPlaying(true);
                }
              }, 900);
            }}
          />
          </div>

          {/* Player Controls - Hidden in Public Mode */}
          {!isPublicMode && (
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
                    title="Reiniciar Cena"
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
          )}
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
            <span className="text-[9px] font-bold text-green-500/80 uppercase">PRONTO</span>
            <CheckCircle2 className="w-3 h-3 text-green-500" />
          </>
        )}
        {status === 'missing' && (
          <>
            <span className="text-[9px] font-bold text-red-500/80 uppercase">AUSENTE</span>
            <XCircle className="w-3 h-3 text-red-500" />
          </>
        )}

      </div>
    </div>
  );
}
