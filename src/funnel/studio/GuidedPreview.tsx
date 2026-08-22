import { useEffect, useRef, useState } from "react";
import { VideoStage } from "@/components/dev/VideoStage";
import { FunnelRuntime, type RuntimeSnapshot } from "../runtime/funnelRuntime";
import type { FunnelDefinition, SceneDefinition } from "../schema/v1";
import { RuntimeOverlays, assetUrl } from "./RuntimeOverlays";

export function GuidedPreview({ funnel, scene, urls, onTested, onMoment, testEventId }: { funnel: FunnelDefinition; scene: SceneDefinition; urls: Record<string, string>; onTested?: () => void; onMoment?: (seconds: number) => void; testEventId?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const runtimeRef = useRef<FunnelRuntime | null>(null);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  // `scene` is the prop this component mounted with (the scene the caller wants to test, or the entry
  // scene for a full-funnel run) — it never changes on its own. Once the runtime advances past it via a
  // NEXT_SCENE/GO_TO_SCENE action, snapshot.sceneId is the only thing that reflects reality; without
  // re-deriving the working scene from it, the video and overlays kept showing the ORIGINAL scene's data
  // forever after a transition (confirmed: this is exactly why a multi-scene "Prévia completa" run played
  // the first scene's video/interactions on every subsequent scene). /dev/funnel-runtime-proof.tsx already
  // does this correctly — this brings GuidedPreview in line with it.
  const currentScene = (snapshot?.sceneId && funnel.scenes.find((item) => item.id === snapshot.sceneId)) || scene;
  const src = assetUrl(funnel, urls, currentScene.videoAssetId) || "";
  const activeEvent = snapshot?.activeInteraction
    ? currentScene.events.find((event) => event.id === snapshot.activeInteraction?.sourceEventId)
    : testEventId ? currentScene.events.find((event) => event.id === testEventId) : undefined;
  const run = () => {
    const definition = testEventId ? { ...funnel, entrySceneId: scene.id, scenes: funnel.scenes.map((item) => item.id === scene.id ? { ...item, events: item.events.map((event) => event.id === testEventId ? { ...event, trigger: { kind: "MANUAL" as const } } : event) } : item) } : { ...funnel, entrySceneId: scene.id };
    const runtime = new FunnelRuntime(definition);
    runtimeRef.current = runtime;
    runtime.subscribe(setSnapshot);
    runtime.start();
    if (testEventId) runtime.fireManual(testEventId);
    setRunning(true);
    void videoRef.current?.play().catch(() => runtime.reportMediaError("scene-video", "autoplay_blocked", scene.videoAssetId));
  };
  useEffect(() => {
    return () => { runtimeRef.current?.reset(); };
  }, []);
  useEffect(() => {
    if (!running) return;
    if (snapshot?.mediaState === "paused") videoRef.current?.pause();
    if (snapshot?.mediaState === "playing") void videoRef.current?.play().catch(() => undefined);
  }, [snapshot?.mediaState, running]);
  useEffect(() => {
    if (!running || !snapshot || snapshot.mediaErrors.length || snapshot.activeBlockingEventId) return;
    if (snapshot.mediaState === "ended" || snapshot.mediaState === "stopped") {
      onTested?.();
      setRunning(false);
    }
  }, [onTested, running, snapshot]);
  const end = () => {
    runtimeRef.current?.mediaEnded();
  };
  return <div className="grid gap-2">
    <div className="relative w-[min(360px,100%)] aspect-[9/16] bg-black">
      <VideoStage ref={videoRef} src={src} onReady={(video) => runtimeRef.current?.setDuration(video.duration)} onTimeUpdate={(value) => { setTime(value); runtimeRef.current?.updateTime(value); }} onEnded={end} />
      {activeEvent && <RuntimeOverlays funnel={funnel} urls={urls} runtime={runtimeRef.current} snapshot={snapshot} event={activeEvent} />}
    </div>
    <div className="text-xs font-mono">{formatTime(time)} / {snapshot?.duration?.toFixed(2) || "--"}s</div>
    <div className="flex flex-wrap gap-2">
      <button onClick={run}>▶ TESTAR ESTA CENA</button><button onClick={() => void videoRef.current?.play()}>PLAY</button><button onClick={() => videoRef.current?.pause()}>PAUSE</button>
      <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = 0; runtimeRef.current?.reset(); setRunning(false); }}>REINICIAR</button>
      <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5); }}>-5s</button>
      <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 5; }}>+5s</button>
      {onMoment && <button onClick={() => onMoment(time)}>USAR ESTE MOMENTO</button>}
    </div>
    <details><summary>VER DETALHES TÉCNICOS</summary><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(snapshot, null, 2)}</pre></details>
  </div>;
}
export const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
