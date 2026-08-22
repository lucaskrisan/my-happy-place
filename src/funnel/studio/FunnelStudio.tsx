import { useEffect, useRef, useState } from "react";
import { FunnelRuntime, type RuntimeSnapshot } from "../runtime/funnelRuntime";
import type { FunnelDefinition, SceneDefinition, SceneEventDefinition } from "../schema/v1";
import { funnelBlockRegistry } from "../registry/blockRegistry";
import {
  defaultEvent,
  duplicateFunnel,
  emptyFunnel,
  exportStudioFunnel,
  importFunnel,
  loadFunnel,
  loadProjects,
  reorderScenes,
  saveFunnel,
  seedDemo,
  type StudioProject,
  uid,
} from "./studioState";
import { VideoStage } from "@/components/dev/VideoStage";
import { QuizOverlay } from "@/components/dev/QuizOverlay";
import { ChoiceOverlay } from "@/components/dev/ChoiceOverlay";
import { NotificationOverlay } from "@/components/dev/NotificationOverlay";
import { MessagingOverlay } from "@/components/dev/MessagingOverlay";
import { IncomingCallOverlay } from "@/components/dev/IncomingCallOverlay";
import { StudioInspector } from "./inspectors/StudioInspector";
import { FunnelStudioHome, GuidedBuilder } from "./GuidedBuilder";
import { invalidateStructuralTests, loadGuidedUi, saveGuidedUi, type GuidedUiState } from "./guidedState";
import { AssetManager } from "./AssetManager";
import { useSupabaseSession } from "@/lib/supabase/useSession";
import { pushFunnelToSupabase } from "@/lib/supabase/sync";
const RuntimeQuiz = QuizOverlay as any,
  RuntimeChoice = ChoiceOverlay as any,
  RuntimeMessaging = MessagingOverlay as any,
  RuntimeCall = IncomingCallOverlay as any,
  RuntimeNotification = NotificationOverlay as any,
  RuntimeVideo = VideoStage as any;
type PreviewUrls = Record<string, string>;
const urlFor = (f: FunnelDefinition, u: PreviewUrls, id?: string) => {
  const a = f.assets.find((x) => x.id === id);
  return a?.source === "permanent" ? a.url : a?.source === "preview" ? u[a.id] : undefined;
};
const download = (name: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
function Timeline({
  scene,
  duration,
  playhead,
  onSeek,
  onSelect,
  onMove,
  onAdd,
}: {
  scene: SceneDefinition;
  duration: number;
  playhead: number;
  onSeek: (n: number) => void;
  onSelect: (id: string) => void;
  onMove: (e: SceneEventDefinition, n: number) => void;
  onAdd: (b: SceneEventDefinition["block"]) => void;
}) {
  const blocks = [
    "audio",
    "incoming_call",
    "notification",
    "messaging",
    "quiz",
    "choice",
    "scene_transition",
  ] as const;
  return (
    <footer className="border-t border-zinc-800 p-3 overflow-auto">
      <div className="flex gap-2 items-center flex-wrap">
        <b>LINHA DO TEMPO</b>
        {blocks
          .filter((b) => funnelBlockRegistry.get(b))
          .map((b) => (
            <button key={b} onClick={() => onAdd(b)}>
              + {b}
            </button>
          ))}
      </div>
      <div
        className="relative mt-3 h-32 bg-zinc-900"
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onSeek(Math.max(0, Math.min(duration, ((e.clientX - r.left) / r.width) * duration)));
        }}
      >
        <i
          className="absolute top-0 bottom-0 w-px bg-red-500"
          style={{ left: `${Math.min(100, (playhead / duration) * 100)}%` }}
        />
        {scene.events.map((e, i) => {
          const pos =
            e.trigger.kind === "TIME"
              ? (e.trigger.seconds / duration) * 100
              : e.trigger.kind === "BEFORE_END"
                ? ((duration - e.trigger.seconds) / duration) * 100
                : e.trigger.kind === "VIDEO_END"
                  ? 100
                  : 0;
          return (
            <button
              key={e.id}
              className="absolute text-[10px] bg-blue-600 px-1"
              style={{ left: `${Math.min(95, Math.max(0, pos))}%`, top: `${28 + (i % 4) * 24}px` }}
              onClick={(x) => {
                x.stopPropagation();
                onSelect(e.id);
              }}
              onPointerDown={(x) => {
                if (e.trigger.kind !== "TIME") return;
                x.stopPropagation();
                const move = (m: PointerEvent) => {
                  const r = (x.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                  onMove(
                    e,
                    Math.max(0, Math.min(duration, ((m.clientX - r.left) / r.width) * duration)),
                  );
                };
                const end = () => {
                  window.removeEventListener("pointermove", move);
                  window.removeEventListener("pointerup", end);
                };
                window.addEventListener("pointermove", move);
                window.addEventListener("pointerup", end);
              }}
            >
              {e.block} ·{" "}
              {e.trigger.kind === "INTERACTION_COMPLETE" ? "↳ interação" : e.trigger.kind}
            </button>
          );
        })}
      </div>
      <small className="text-zinc-500">
        TIME é arrastável; BEFORE_END, VIDEO_END, SCENE_START, INTERACTION_COMPLETE e MANUAL mantêm
        âncora sem tempo falso.
      </small>
    </footer>
  );
}
function Overlays({
  funnel,
  urls,
  event,
  runtime,
  snapshot,
  forced,
  clear,
}: {
  funnel: FunnelDefinition;
  urls: PreviewUrls;
  event?: SceneEventDefinition | undefined;
  runtime: FunnelRuntime | null;
  snapshot: RuntimeSnapshot | null;
  forced: boolean;
  clear: () => void;
}) {
  if (!event || !runtime || !snapshot) return null;
  const done = () => {
    if (forced) {
      runtime.execute(event.actions, event.id, snapshot.runId);
      clear();
    } else runtime.completeInteraction(event.id, snapshot.runId);
  };
  if (event.block === "quiz")
    return (
      <RuntimeQuiz
        open
        definition={{ id: event.id, title: event.title, questions: event.questions }}
        variant={event.variant}
        closeBehavior={event.closeBehavior}
        onComplete={done}
        onClose={done}
      />
    );
  if (event.block === "choice")
    return (
      <RuntimeChoice
        open
        definition={{
          id: event.id,
          title: event.title,
          subtitle: event.subtitle,
          options: event.options,
          mode: event.mode,
          required: event.required,
          allowChange: event.allowChange,
        }}
        onComplete={done}
        onClose={done}
      />
    );
  if (event.block === "messaging")
    return (
      <RuntimeMessaging
        open
        contactName={event.contactName}
        contactSubtitle={event.contactSubtitle}
        contactAvatar={urlFor(funnel, urls, event.avatarAssetId)}
        messages={event.messages.map((m) => ({
          id: m.id,
          type: m.type,
          sender: "contact",
          text: m.text,
          audioSrc: urlFor(funnel, urls, m.audioAssetId),
        }))}
        onComplete={done}
        onClose={done}
      />
    );
  if (event.block === "incoming_call")
    return (
      <RuntimeCall
        open
        callerName={event.callerName}
        callerSubtitle={event.callerSubtitle}
        callerAvatar={urlFor(funnel, urls, event.avatarAssetId)}
        ringtoneSrc={urlFor(funnel, urls, event.ringtoneAssetId)}
        vibrationSrc={urlFor(funnel, urls, event.vibrationAssetId)}
        voiceAudioSrc={urlFor(funnel, urls, event.voiceAssetId)}
        connectSfxSrc={urlFor(funnel, urls, event.connectSfxAssetId)}
        endSfxSrc={urlFor(funnel, urls, event.endSfxAssetId)}
        onDecline={() => {
          runtime.execute(event.onDecline, event.id, snapshot.runId);
          done();
        }}
        onEnd={() => {
          runtime.execute(event.onEnd, event.id, snapshot.runId);
          done();
        }}
      />
    );
  if (event.block === "notification")
    return (
      <RuntimeNotification
        open
        appName={event.appName}
        senderName={event.senderName}
        message={event.message}
        avatar={urlFor(funnel, urls, event.avatarAssetId)}
        soundSrc={urlFor(funnel, urls, event.soundAssetId)}
        autoDismiss={event.autoDismiss}
        onTap={() => {
          runtime.execute(event.onTap, event.id, snapshot.runId);
          clear();
        }}
        onDismiss={() => {
          runtime.execute(event.onDismiss, event.id, snapshot.runId);
          clear();
        }}
      />
    );
  return null;
}
export function FunnelStudio({
  productName,
  initialFunnelId,
  forceGuided = false,
  onBackToProduct,
}: {
  productName?: string;
  initialFunnelId?: string;
  forceGuided?: boolean;
  onBackToProduct?: () => void;
} = {}) {
  const session = useSupabaseSession();
  const userId = session.status === "signed-in" ? session.session.user.id : undefined;
  const [projects, setProjects] = useState<StudioProject[]>([]),
    [funnel, setFunnel] = useState<FunnelDefinition | null>(null),
    [selectedSceneId, setSelectedSceneId] = useState(""),
    [selectedEventId, setSelectedEventId] = useState<string | null>(null),
    [playhead, setPlayhead] = useState(0),
    [saveState, setSaveState] = useState<"CARREGANDO" | "SALVANDO..." | "SALVO" | "ERRO AO SALVAR">("CARREGANDO"),
    [history, setHistory] = useState<FunnelDefinition[]>([]),
    [future, setFuture] = useState<FunnelDefinition[]>([]),
    [urls, setUrls] = useState<PreviewUrls>({}),
    [forced, setForced] = useState<SceneEventDefinition>(),
    [testingForced, setTestingForced] = useState(false),
    [assetsOpen, setAssetsOpen] = useState(false);
  const runtimeRef = useRef<FunnelRuntime | null>(null),
    videoRef = useRef<HTMLVideoElement>(null);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [guidedUi, setGuidedUi] = useState<GuidedUiState>({ mode: "home" });
  useEffect(() => {
    const demo = seedDemo(localStorage),
      list = loadProjects(localStorage),
      initial = initialFunnelId ? loadFunnel(localStorage, initialFunnelId) : list[0] ? loadFunnel(localStorage, list[0].id) : demo;
    setProjects(loadProjects(localStorage));
    setFunnel(initial || demo);
    setSelectedSceneId((initial || demo).entrySceneId);
    const storedUi = loadGuidedUi();
    setGuidedUi(forceGuided ? {
      mode: "guided",
      funnelId: (initial || demo).id,
      sceneId: (initial || demo).entrySceneId,
      step: storedUi.funnelId === (initial || demo).id ? storedUi.step || "script" : "script",
    } : storedUi);
  }, [forceGuided, initialFunnelId]);
  useEffect(() => () => Object.values(urls).forEach(URL.revokeObjectURL), [urls]);
  useEffect(() => {
    if (!funnel) return;
    setSaveState("SALVANDO...");
    const t = setTimeout(() => {
      try {
        saveFunnel(localStorage, funnel);
        setProjects(loadProjects(localStorage));
        setSaveState("SALVO");
        if (userId) void pushFunnelToSupabase(userId, funnel);
      } catch {
        setSaveState("ERRO AO SALVAR");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [funnel, userId]);
  const setMode = (next: GuidedUiState) => {
    setGuidedUi(next);
    saveGuidedUi(next);
  };
  const change = (next: FunnelDefinition) => {
      if (!funnel) return;
      setHistory((h) => [...h.slice(-49), funnel]);
      setFuture([]);
      setFunnel(invalidateStructuralTests(funnel, next));
    },
    undo = () => {
      const p = history.at(-1);
      if (!p || !funnel) return;
      setFuture((x) => [funnel, ...x]);
      setHistory((x) => x.slice(0, -1));
      setFunnel(p);
    },
    redo = () => {
      const n = future[0];
      if (!n || !funnel) return;
      setHistory((x) => [...x, funnel]);
      setFuture((x) => x.slice(1));
      setFunnel(n);
    };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  const addPreviewFile = (file: File, assetId?: string, sceneId?: string) => {
    if (!funnel) return;
    const mediaType: "video" | "audio" | "image" = file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image";
    const id = assetId || uid(mediaType);
    const objectUrl = URL.createObjectURL(file);
    setUrls((old) => {
      if (old[id]) URL.revokeObjectURL(old[id]);
      return { ...old, [id]: objectUrl };
    });
    const asset = { id, mediaType, source: "preview" as const, objectUrl, fileName: file.name, status: "ready" as const };
    change({
      ...funnel,
      assets: assetId ? funnel.assets.map((item) => item.id === id ? asset : item) : [...funnel.assets, asset],
      scenes: sceneId ? funnel.scenes.map((item) => item.id === sceneId ? { ...item, videoAssetId: id } : item) : funnel.scenes,
    });
  };
  const revokePreviewUrl = (assetId: string) => {
    setUrls((old) => {
      if (!old[assetId]) return old;
      URL.revokeObjectURL(old[assetId]);
      const next = { ...old };
      delete next[assetId];
      return next;
    });
  };
  const attachPreview = (assetId?: string, sceneId?: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*,audio/*,image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file || !funnel) return;
      addPreviewFile(file, assetId, sceneId);
    };
    input.click();
  };
  if (!funnel)
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">Carregando Funnel Studio…</main>
    );
  if (guidedUi.mode === "home")
    return (
      <FunnelStudioHome
        projects={projects}
        funnel={funnel}
        onGuided={() =>
          setMode({
            mode: "guided",
            funnelId: funnel.id,
            sceneId: (funnel.scenes.some((scene) => scene.id === guidedUi.sceneId) ? guidedUi.sceneId : funnel.entrySceneId) || "",
            step: guidedUi.funnelId === funnel.id && guidedUi.step ? guidedUi.step : "script",
          })
        }
        onAdvanced={() => setMode({ mode: "advanced", funnelId: funnel.id })}
        onNew={(created) => {
          const next = created;
          change(next);
          setMode({
            mode: "guided",
            funnelId: next.id,
            sceneId: next.entrySceneId,
            step: "script",
          });
        }}
      />
    );
  if (guidedUi.mode === "guided")
    return (
      <>
      <GuidedBuilder
        funnel={funnel}
        onChange={change}
        onAdvanced={() => setMode({ mode: "advanced", funnelId: funnel.id })}
        ui={guidedUi}
        onUi={setMode}
        saveState={saveState}
        canUndo={!!history.length}
        canRedo={!!future.length}
        onUndo={undo}
        onRedo={redo}
        urls={urls}
        onAttachPreview={attachPreview}
        onAttachPreviewFile={addPreviewFile}
        {...(productName ? { productName } : {})}
        {...(onBackToProduct ? { onBackToProduct } : {})}
        onAssets={() => setAssetsOpen(true)}
        onExportDraft={() => download(`${funnel.id}-draft.json`, exportStudioFunnel(funnel, "draft").json)}
        onExportValid={() => {
          const result = exportStudioFunnel(funnel, "valid");
          if (!result.ok) {
            alert(`Corrija ${result.issues.length} problema(s) antes de exportar o projeto válido.`);
            setMode({ mode: "guided", funnelId: funnel.id, sceneId: guidedUi.sceneId || funnel.entrySceneId, step: "review" });
            return;
          }
          download(`${funnel.id}-valid.json`, result.json);
        }}
      />
      {/* The guided flow's "Arquivos" tab sets this same assetsOpen state (onAssets above), but this
          early return used to end here — so the modal it opens only ever mounted in the advanced editor's
          own render tree below, and clicking "Arquivos" in the guided flow silently did nothing. */}
      {assetsOpen && (
        <AssetManager
          funnel={funnel}
          urls={urls}
          onChange={change}
          onAttachPreview={addPreviewFile}
          onRevoke={revokePreviewUrl}
          onClose={() => setAssetsOpen(false)}
          onOpenUsage={(path) => {
            const targetScene = funnel.scenes.find((item) => path.includes(item.id));
            if (targetScene) setSelectedSceneId(targetScene.id);
            const targetEvent = funnel.scenes.flatMap((item) => item.events).find((item) => path.includes(item.id));
            if (targetEvent) setSelectedEventId(targetEvent.id);
            setAssetsOpen(false);
          }}
        />
      )}
      </>
    );
  const scene = (funnel.scenes.find((s) => s.id === selectedSceneId) || funnel.scenes[0])!;
  const event = scene.events.find((e) => e.id === selectedEventId),
    duration = snapshot?.duration || scene.duration || 60;
  const updateScene = (p: Partial<SceneDefinition>) =>
      change({
        ...funnel,
        scenes: funnel.scenes.map((s) => (s.id === scene.id ? { ...s, ...p } : s)),
      }),
    updateEvent = (e: SceneEventDefinition) =>
      change({
        ...funnel,
        scenes: funnel.scenes.map((s) =>
          s.id === scene.id ? { ...s, events: s.events.map((x) => (x.id === e.id ? e : x)) } : s,
        ),
      });
  const run = (at = 0, manual?: SceneEventDefinition) => {
    const definition = {
      ...funnel,
      entrySceneId: scene.id,
      scenes: manual
        ? funnel.scenes.map((s) =>
            s.id === scene.id
              ? {
                  ...s,
                  events: s.events.map((e) =>
                    e.id === manual.id ? { ...manual, trigger: { kind: "MANUAL" as const } } : e,
                  ),
                }
              : s,
          )
        : funnel.scenes,
    };
    const runtime = new FunnelRuntime(definition);
    runtimeRef.current = runtime;
    runtime.subscribe(setSnapshot);
    runtime.start();
    setForced(undefined);
    setTestingForced(false);
    if (at > 0) {
      runtime.seek(at);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = at;
          void videoRef.current.play().catch(() => undefined);
        }
      }, 0);
    }
    if (manual) {
      if (manual.block === "audio") {
        const src = urlFor(funnel, urls, manual.assetId);
        if (!src) runtime.reportMediaError(manual.id, "asset_unresolved", manual.assetId);
        else {
          const a = new Audio(src);
          a.volume = manual.volume ?? 1;
          a.loop = manual.loop ?? false;
          a.onerror = () => runtime.reportMediaError(manual.id, "audio_error", manual.assetId);
          void a
            .play()
            .catch(() => runtime.reportMediaError(manual.id, "autoplay_blocked", manual.assetId));
        }
      } else {
        runtime.fireManual(manual.id);
        setForced(manual);
        setTestingForced(true);
      }
    }
  };
  const add = (b: SceneEventDefinition["block"]) => {
      const e = defaultEvent(b, playhead);
      change({
        ...funnel,
        scenes: funnel.scenes.map((s) =>
          s.id === scene.id ? { ...s, events: [...s.events, e] } : s,
        ),
      });
      setSelectedEventId(e.id);
    },
    attach = (assetId?: string) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "video/*,audio/*,image/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const mediaType: "video" | "audio" | "image" = file.type.startsWith("video")
            ? "video"
            : file.type.startsWith("audio")
              ? "audio"
              : "image",
          id = assetId || uid(mediaType),
          objectUrl = URL.createObjectURL(file);
        setUrls((old) => {
          if (old[id]) URL.revokeObjectURL(old[id]);
          return { ...old, [id]: objectUrl };
        });
        const asset = {
          id,
          mediaType,
          source: "preview" as const,
          objectUrl,
          fileName: file.name,
          status: "ready" as const,
        };
        change({
          ...funnel,
          assets: assetId
            ? funnel.assets.map((a) => (a.id === id ? asset : a))
            : [...funnel.assets, asset],
        });
      };
      input.click();
    };
  const deleteScene = () => {
    const refs = [
      ...(funnel.entrySceneId === scene.id ? ["entrySceneId"] : []),
      ...funnel.scenes.filter((s) => s.nextSceneId === scene.id).map((s) => s.title),
    ];
    if (refs.length && !confirm(`Referências: ${refs.join(", ")}. Excluir e corrigir?`)) return;
    const rest = funnel.scenes.filter((s) => s.id !== scene.id);
    if (!rest.length) return alert("Um funil precisa de ao menos uma cena.");
    change({
      ...funnel,
      entrySceneId: funnel.entrySceneId === scene.id ? rest[0]!.id : funnel.entrySceneId,
      scenes: rest.map((s) => ({
        ...s,
        nextSceneId: s.nextSceneId === scene.id ? undefined : s.nextSceneId,
        events: s.events
          .filter((e) => e.block !== "scene_transition" || e.targetSceneId !== scene.id)
          .map((e) => ({
            ...e,
            actions: e.actions.filter((a) => a.type !== "GO_TO_SCENE" || a.sceneId !== scene.id),
          })),
      })),
    });
    setSelectedSceneId(rest[0]!.id);
    setSelectedEventId(null);
  };
  return (
    <main className="h-screen min-h-[700px] bg-zinc-950 text-zinc-100 grid grid-rows-[52px_1fr_210px] overflow-hidden">
      <header className="flex items-center gap-2 px-3 border-b border-zinc-800 text-sm">
        {productName && <button onClick={onBackToProduct} className="text-zinc-400 hover:text-white">{productName} /</button>}
        <b>FUNNEL STUDIO</b>
        <button
          onClick={() =>
            setMode({
              mode: "guided",
              funnelId: funnel.id,
              sceneId: selectedSceneId,
              step: "script",
            })
          }
        >
          VOLTAR PARA CRIAÇÃO GUIADA
        </button>
        <select
          value={funnel.id}
          onChange={(e) => {
            const n = loadFunnel(localStorage, e.target.value);
            if (n) {
              setFunnel(n);
              setSelectedSceneId(n.entrySceneId);
              setHistory([]);
              setFuture([]);
            }
          }}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <input
          value={funnel.title}
          onChange={(e) => change({ ...funnel, title: e.target.value })}
        />
        <span className="text-[10px] text-emerald-400">{saveState}</span>
        <button onClick={() => setAssetsOpen(true)}>ARQUIVOS</button>
        <button
          onClick={() => {
            const n = emptyFunnel();
            change(n);
            setSelectedSceneId(n.entrySceneId);
          }}
        >
          + NOVO
        </button>
        <button
          onClick={() => {
            const n = duplicateFunnel(funnel);
            change(n);
            setSelectedSceneId(n.entrySceneId);
          }}
        >
          DUPLICAR
        </button>
        <button disabled={!history.length} onClick={undo}>
          UNDO
        </button>
        <button disabled={!future.length} onClick={redo}>
          REDO
        </button>
        <button
          onClick={() =>
            download(`${funnel.id}-draft.json`, exportStudioFunnel(funnel, "draft").json)
          }
        >
          EXPORTAR RASCUNHO
        </button>
        <button
          onClick={() => {
            const r = exportStudioFunnel(funnel, "valid");
            if (!r.ok) return alert(r.issues.map((i) => i.message).join("\n"));
            download(`${funnel.id}.json`, r.json);
          }}
        >
          EXPORTAR VÁLIDO
        </button>
        <label>
          IMPORTAR
          <input
            className="hidden"
            type="file"
            accept="application/json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = importFunnel(await f.text());
              if (!r.funnel || r.errors.length) return alert(r.errors.join("\n"));
              change(r.funnel);
              setSelectedSceneId(r.funnel.entrySceneId);
            }}
          />
        </label>
      </header>
      <div className="min-h-0 grid grid-cols-[240px_minmax(360px,1fr)_330px]">
        <aside className="border-r border-zinc-800 overflow-auto p-2">
          <div className="flex justify-between">
            <b>CENAS</b>
            <button
              onClick={() => {
                const n = {
                  id: uid("scene"),
                  title: `Cena ${funnel.scenes.length + 1}`,
                  events: [],
                };
                change({ ...funnel, scenes: [...funnel.scenes, n] });
                setSelectedSceneId(n.id);
              }}
            >
              + NOVA
            </button>
          </div>
          {funnel.scenes.map((s, i) => (
            <div
              key={s.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("scene", String(i))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) =>
                change(reorderScenes(funnel, Number(e.dataTransfer.getData("scene")), i))
              }
              onClick={() => {
                setSelectedSceneId(s.id);
                setSelectedEventId(null);
              }}
              className={`mt-2 p-2 cursor-pointer border ${s.id === scene.id ? "border-blue-500 bg-zinc-900" : "border-zinc-800"}`}
            >
              <b>
                {String(i + 1).padStart(2, "0")} {s.title}
              </b>
              <small className="block text-zinc-500">
                {s.id} · {s.events.length} eventos
              </small>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const t = prompt("Novo nome", s.title);
                  if (t)
                    change({
                      ...funnel,
                      scenes: funnel.scenes.map((x) => (x.id === s.id ? { ...x, title: t } : x)),
                    });
                }}
              >
                renomear
              </button>
              {s.id === scene.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteScene();
                  }}
                >
                  excluir
                </button>
              )}
            </div>
          ))}
        </aside>
        <section className="overflow-auto p-3 flex flex-col items-center gap-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => run()}>TESTAR CENA</button>
            <button onClick={() => run(playhead)}>TESTAR DO PLAYHEAD</button>
            <button onClick={() => event && run(0, event)}>TESTAR EVENTO</button>
            <button onClick={() => runtimeRef.current?.reset()}>RESETAR EXECUÇÃO</button>
            <button
              onClick={() =>
                videoRef.current &&
                (videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5))
              }
            >
              -5s
            </button>
            <button
              onClick={() =>
                videoRef.current &&
                (videoRef.current.currentTime = Math.min(
                  duration,
                  videoRef.current.currentTime + 5,
                ))
              }
            >
              +5s
            </button>
            <button onClick={() => void videoRef.current?.play()}>PLAY</button>
            <button onClick={() => videoRef.current?.pause()}>PAUSE</button>
          </div>
          <div className="relative w-[min(360px,100%)] aspect-[9/16] bg-black">
            <RuntimeVideo
              ref={videoRef}
              src={urlFor(funnel, urls, scene.videoAssetId) || ""}
              poster={urlFor(funnel, urls, scene.posterAssetId)}
              onReady={(v: HTMLVideoElement) => runtimeRef.current?.setDuration(v.duration)}
              onTimeUpdate={(t: number) => {
                setPlayhead(t);
                runtimeRef.current?.updateTime(t);
              }}
              onEnded={() => runtimeRef.current?.mediaEnded()}
            />
          </div>
          <div className="text-xs font-mono">
            {playhead.toFixed(2)} / {duration.toFixed(2)}s
          </div>
          <details className="w-full bg-zinc-900 p-2">
            <summary>DEBUG — runtime snapshot</summary>
            <pre className="text-[10px] whitespace-pre-wrap">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          </details>
        </section>
        <StudioInspector
          funnel={funnel}
          scene={scene}
          event={event as any}
          onScene={updateScene}
          onEvent={updateEvent}
          onTest={() => event && run(0, event)}
          onDuplicate={() => {
            if (!event) return;
            const copy = { ...event, id: uid("event") };
            change({
              ...funnel,
              scenes: funnel.scenes.map((s) =>
                s.id === scene.id ? { ...s, events: [...s.events, copy] } : s,
              ),
            });
            setSelectedEventId(copy.id);
          }}
          onDelete={() => {
            if (!event) return;
            change({
              ...funnel,
              scenes: funnel.scenes.map((s) =>
                s.id === scene.id ? { ...s, events: s.events.filter((x) => x.id !== event.id) } : s,
              ),
            });
            setSelectedEventId(null);
          }}
          onIssue={(i) => {
            const s = funnel.scenes.find((x) => i.path.includes(x.id));
            if (s) setSelectedSceneId(s.id);
            const e = funnel.scenes.flatMap((x) => x.events).find((x) => i.path.includes(x.id));
            if (e) setSelectedEventId(e.id);
          }}
        />
      </div>
      <Timeline
        scene={scene}
        duration={duration}
        playhead={playhead}
        onSeek={(n) => {
          setPlayhead(n);
          if (videoRef.current) videoRef.current.currentTime = n;
          runtimeRef.current?.seek(n);
        }}
        onSelect={setSelectedEventId}
        onMove={(e, n) =>
          updateEvent({
            ...e,
            trigger: { kind: "TIME", seconds: Math.round(n * 10) / 10 },
          } as SceneEventDefinition)
        }
        onAdd={add}
      />
      {assetsOpen && (
        <AssetManager
          funnel={funnel}
          urls={urls}
          onChange={change}
          onAttachPreview={addPreviewFile}
          onRevoke={revokePreviewUrl}
          onClose={() => setAssetsOpen(false)}
          onOpenUsage={(path) => {
            const targetScene = funnel.scenes.find((item) => path.includes(item.id));
            if (targetScene) setSelectedSceneId(targetScene.id);
            const targetEvent = funnel.scenes.flatMap((item) => item.events).find((item) => path.includes(item.id));
            if (targetEvent) setSelectedEventId(targetEvent.id);
            setAssetsOpen(false);
          }}
        />
      )}
      <Overlays
        funnel={funnel}
        urls={urls}
        event={
          forced ||
          ((snapshot?.activeInteraction
            ? scene.events.find((e) => e.id === snapshot.activeInteraction?.sourceEventId)
            : undefined) as any)
        }
        runtime={runtimeRef.current}
        snapshot={snapshot}
        forced={testingForced}
        clear={() => {
          setForced(undefined);
          setTestingForced(false);
        }}
      />
    </main>
  );
}
