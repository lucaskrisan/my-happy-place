import { createFileRoute, Link } from "@tanstack/react-router";
import { STORY_MAP } from "@/dev/story-checkpoints";
import { 
  Play, 
  ChevronRight, 
  Layers, 
  Settings2, 
  History, 
  CheckCircle2, 
  Clock,
  ArrowRightCircle,
  MapIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dev/")({
  component: DevCentral,
});

function DevCentral() {
  const isolatedComponents = [
    { path: "/dev/incoming-call", label: "Ligação" },
    { path: "/dev/whatsapp", label: "WhatsApp" },
    { path: "/dev/notification", label: "Notificação" },
    { path: "/dev/quiz", label: "Quiz" },
    { path: "/dev/choice", label: "Escolha" },
    { path: "/dev/video-stage", label: "Player de Vídeo" },
  ];

  const technicalTools = [
    { path: "/notas", label: "Bloco de Notas 📝" },
    { path: "/dev/timeline", label: "Timeline Engine" },
    { path: "/dev/scene", label: "Scene Engine" },
    { path: "/dev/debug", label: "Debug Visual" },
    { path: "/dev/audio", label: "Áudio" },
    { path: "/dev/preloader", label: "Preload" },
  ];


  const oldLabs = [
    { path: "/dev/notes", label: "Notas Bloqueadas" },
    { path: "/dev/record", label: "Gravação de Áudio" },
    { path: "/dev/transitions", label: "Transições" },
    { path: "/dev/mother-call", label: "Chamada da Mãe (Experimental)" },
    { path: "/dev/secret-whatsapp", label: "WhatsApp Secreto (Experimental)" },
    { path: "/dev/milk-scene", label: "Cena do Leite (Legacy)" },
    { path: "/dev/husband-talk", label: "Conversa com Marido (Legacy)" },
    { path: "/dev/14-days", label: "14 Dias (Início)" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-20 selection:bg-blue-500/30">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase">Central de Produção</h1>
            <p className="text-xs text-zinc-500 font-medium">Construa, revise e teste cada etapa da experiência.</p>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[10px] font-bold tracking-widest text-zinc-600 uppercase">
            <span>v3.0.0</span>
            <div className="w-1 h-1 rounded-full bg-zinc-800" />
            <span>Narrativa Imersiva</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-12 space-y-16">
        {/* EXPERIÊNCIA OFICIAL */}
        <section>
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
            <Play className="w-4 h-4 text-blue-500" />
            Experiência Oficial
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link 
              to="/intro"
              className="group relative overflow-hidden bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl p-8 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Play className="w-24 h-24" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                ▶ Assistir Experiência Completa
              </h3>
              <p className="text-zinc-400 text-sm mb-6 max-w-sm">
                Introdução + narrativa completa desde o início.
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-widest group-hover:gap-3 transition-all">
                Abrir /intro <ChevronRight className="w-4 h-4" />
              </div>
            </Link>

            <Link 
              to="/dev/door-scene"
              search={{ checkpoint: 'scene01-start' }}
              className="group relative overflow-hidden bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl p-8 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock className="w-24 h-24" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                ▶ Começar pela Cena 01
              </h3>
              <p className="text-zinc-400 text-sm mb-6 max-w-sm">
                Pular a introdução e iniciar diretamente a história.
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-widest group-hover:gap-3 transition-all">
                Ver Cena 01 <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </section>

        {/* MAPA DA HISTÓRIA */}
        <section>
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
            <History className="w-4 h-4 text-emerald-500" />
            Mapa da História
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STORY_MAP.map((step) => (
              <div 
                key={step.id}
                className="bg-zinc-900 border border-zinc-800/50 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-zinc-700 tracking-tighter group-hover:text-zinc-600 transition-colors">
                      {step.number}
                    </span>
                    <div className="flex gap-2">
                      {step.badges?.map(badge => (
                        <span key={badge} className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase tracking-widest border border-zinc-700">
                          {badge}
                        </span>
                      ))}
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-tighter",
                        step.status === 'PRONTO' ? "bg-emerald-500/10 text-emerald-500" : "bg-yellow-500/10 text-yellow-500"
                      )}>
                        {step.status === 'PRONTO' && <CheckCircle2 className="w-3 h-3" />}
                        {step.status}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-zinc-100 text-sm mb-2 group-hover:text-white transition-colors">{step.title}</h3>
                  <p className="text-[11px] leading-relaxed text-zinc-500 mb-6">{step.description}</p>
                </div>
                
                <Link
                  to="/dev/door-scene"
                  search={{ checkpoint: step.id }}
                  className="flex items-center justify-between text-[10px] font-bold text-white uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 rounded-lg transition-all group-hover:bg-blue-600"
                >
                  Ver Daqui <ArrowRightCircle className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* COMPONENTES ISOLADOS */}
        <section>
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
            <Layers className="w-4 h-4 text-zinc-500" />
            Componentes Isolados
          </h2>
          <div className="flex flex-wrap gap-2">
            {isolatedComponents.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2 rounded-full text-xs font-medium text-zinc-400 hover:text-white transition-all"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        {/* FERRAMENTAS TÉCNICAS */}
        <section>
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
            <Settings2 className="w-4 h-4 text-zinc-500" />
            Ferramentas Técnicas
          </h2>
          <div className="flex flex-wrap gap-2">
            {technicalTools.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2 rounded-full text-xs font-medium text-zinc-400 hover:text-white transition-all"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        {/* LABORATÓRIOS ANTIGOS (Accordion style simulated) */}
        <details className="group border-t border-zinc-900 pt-8">
          <summary className="list-none cursor-pointer flex items-center gap-3 text-sm font-bold text-zinc-700 uppercase tracking-[0.2em] hover:text-zinc-500 transition-colors">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 group-open:bg-zinc-700" />
            Laboratórios Antigos
          </summary>
          <div className="mt-6 flex flex-wrap gap-2">
            {oldLabs.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 px-4 py-2 rounded-full text-[10px] font-bold text-zinc-600 hover:text-zinc-400 transition-all uppercase tracking-widest"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </details>

        <footer className="mt-20 pt-10 border-t border-zinc-900 text-center">
          <p className="text-[10px] font-bold text-zinc-800 uppercase tracking-[0.3em]">
            Métricas — Planejado para a fase final
          </p>
        </footer>
      </main>
    </div>
  );
}
