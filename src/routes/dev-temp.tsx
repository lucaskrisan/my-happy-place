import { createFileRoute } from "@tanstack/react-router";
import { DevModuleLayout } from "@/components/dev-tools";

const modules = [
  { path: "/dev/video-stage", title: "Video Stage", description: "Player principal onde futuramente vídeos narrativos serão exibidos." },
  { path: "/dev/timeline", title: "Timeline Engine", description: "Área futura para eventos sincronizados com o vídeo." },
  { path: "/dev/scene", title: "Scene Test", description: "Ambiente isolado para testar uma cena completa." },
  { path: "/dev/incoming-call", title: "Incoming Call", description: "Simulação de ligação recebida estilo smartphone." },
  { path: "/dev/whatsapp", title: "WhatsApp", description: "Interface simulada de conversa por mensagens." },
  { path: "/dev/voice-once", title: "Voice Message Once", description: "Áudio de visualização única." },
  { path: "/dev/notification", title: "Notification", description: "Notificação sobreposta à experiência." },
  { path: "/dev/notes", title: "Locked Notes", description: "Tela de notas bloqueadas/desbloqueáveis." },
  { path: "/dev/choice", title: "Choice", description: "Escolhas interativas e respostas da personagem." },
  { path: "/dev/quiz", title: "Quiz", description: "Perguntas rápidas dentro da narrativa." },
  { path: "/dev/record", title: "Record Audio", description: "Simulação de gravação de áudio." },
  { path: "/dev/door-scene", title: "Door Scene", description: "Cena futura: marido chegando + porta + reação." },
  { path: "/dev/mother-call", title: "Mother Call", description: "Ligação da mãe com áudio da infância." },
  { path: "/dev/secret-whatsapp", title: "Secret WhatsApp", description: "Conversa secreta com áudio íntimo." },
  { path: "/dev/milk-scene", title: "Milk Scene", description: "Cena do filho derrubando o copo e repetição do padrão." },
  { path: "/dev/husband-talk", title: "Husband Conversation", description: "Conversa de ruptura com o marido." },
  { path: "/dev/14-days", title: "14 Days", description: "Entrada futura para a experiência de 14 dias." },
  { path: "/dev/audio", title: "Audio Test", description: "Tela para testar arquivos de áudio e efeitos sonoros." },
  { path: "/dev/transitions", title: "Transitions", description: "Testes de fade, blur, blackout e transições cinematográficas." },
  { path: "/dev/preloader", title: "Preloader", description: "Tela futura para testes de pré-carregamento de mídia." },
  { path: "/dev/debug", title: "Debug State", description: "Área futura para visualizar estado da experiência." },
];

export const Route = createFileRoute("/dev/")({}); // Dummy to avoid error, actual routes below will be individual files

// Batch creating all routes as files. Since I can't create 21 files at once in one go, I will create the main ones first or just loop the creation if I had shell access for it.
// Actually I should just create these routes one by one or grouping them in batches.
