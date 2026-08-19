import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dev/")({
  component: DevMenu,
});

function DevMenu() {
  const sections = [
    {
      title: "CORE",
      items: [
        { path: "/dev/video-stage", label: "01 — Video Stage", description: "Player principal onde futuramente vídeos narrativos serão exibidos." },
        { path: "/dev/timeline", label: "02 — Timeline Engine", description: "Área futura para eventos sincronizados com o vídeo." },
        { path: "/dev/scene", label: "03 — Scene Test", description: "Ambiente isolado para testar uma cena completa." },
      ],
    },
    {
      title: "INTERAÇÕES",
      items: [
        { path: "/dev/incoming-call", label: "04 — Incoming Call", description: "Simulação de ligação recebida estilo smartphone." },
        { path: "/dev/whatsapp", label: "05 — WhatsApp", description: "Interface simulada de conversa por mensagens." },
        { path: "/dev/voice-once", label: "06 — Voice Message Once", description: "Áudio de visualização única." },
        { path: "/dev/notification", label: "07 — Notification", description: "Notificação sobreposta à experiência." },
        { path: "/dev/notes", label: "08 — Locked Notes", description: "Tela de notas bloqueadas/desbloqueáveis." },
        { path: "/dev/choice", label: "09 — Choice", description: "Escolhas interativas e respostas da personagem." },
        { path: "/dev/quiz", label: "10 — Quiz", description: "Perguntas rápidas dentro da narrativa." },
        { path: "/dev/record", label: "11 — Record Audio", description: "Simulação de gravação de áudio." },
      ],
    },
    {
      title: "EXPERIÊNCIAS",
      items: [
        { path: "/dev/door-scene", label: "12 — Door Scene", description: "Cena futura: marido chegando + porta + reação." },
        { path: "/dev/mother-call", label: "13 — Mother Call", description: "Ligação da mãe com áudio da infância." },
        { path: "/dev/secret-whatsapp", label: "14 — Secret WhatsApp", description: "Conversa secreta com áudio íntimo." },
        { path: "/dev/milk-scene", label: "15 — Milk Scene", description: "Cena do filho derrubando o copo e repetição do padrão." },
        { path: "/dev/husband-talk", label: "16 — Husband Conversation", description: "Conversa de ruptura com o marido." },
        { path: "/dev/14-days", label: "17 — 14 Days", description: "Entrada futura para a experiência de 14 dias." },
      ],
    },
    {
      title: "SISTEMA",
      items: [
        { path: "/dev/audio", label: "18 — Audio Test", description: "Tela para testar arquivos de áudio e efeitos sonoros." },
        { path: "/dev/transitions", label: "19 — Transitions", description: "Testes de fade, blur, blackout e transições cinematográficas." },
        { path: "/dev/preloader", label: "20 — Preloader", description: "Tela futura para testes de pré-carregamento de mídia." },
        { path: "/dev/debug", label: "21 — Debug State", description: "Área futura para visualizar estado da experiência." },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <header className="mb-12 border-b border-zinc-800 pb-8 flex flex-col items-start gap-4">
          <img src="https://res.cloudinary.com/duht4tq1f/image/upload/v1787165489/AR_VENT_CLEAN_d9cmil.png" alt="Logo" className="h-8 w-auto mb-2" />
          <h1 className="text-3xl font-bold tracking-tight text-white">Narrative Experience — Dev Menu</h1>
          <p className="mt-2 text-zinc-400">Escolha um módulo para desenvolver ou testar isoladamente.</p>
        </header>

        {sections.map((section) => (
          <DevSection key={section.title} title={section.title}>
            {section.items.map((item) => (
              <DevCard key={item.path} {...item} />
            ))}
          </DevSection>
        ))}
      </div>
    </div>
  );
}

function DevSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">{title}</h2>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function DevCard({ path, label, description }: { path: string; label: string; description: string }) {
  return (
    <Link
      to={path}
      className="block bg-zinc-900 hover:bg-zinc-800 p-5 rounded-xl border border-zinc-800 transition-colors"
    >
      <h3 className="font-semibold text-zinc-100">{label}</h3>
      <p className="text-sm text-zinc-400 mt-1">{description}</p>
    </Link>
  );
}
