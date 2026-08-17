import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";
import { DevBackButton, DevSection, DevCard, DevModuleLayout } from "@/components/dev-tools";
import { QuizOverlay } from "@/components/dev/QuizOverlay";
import { QuizDefinition, QuizResult, QuizAnswer, QuizInteractionType } from "@/types/quiz";
import { cn } from "@/lib/utils";
import { 
  Play, 
  RotateCcw, 
  X, 
  Maximize2, 
  CheckCircle2, 
  Clock, 
  Tag, 
  Activity,
  ClipboardList
} from "lucide-react";

// TEMPORARY DEVELOPMENT QUIZ DEFINITION
const DEV_QUIZ: QuizDefinition = {
  id: "pattern-recognition-01",
  title: "Você reconhece esse padrão?",
  description: "Responda pelo que acontece primeiro, antes de você conseguir racionalizar.",
  questions: [
    {
      id: "silence",
      title: "Quando alguém importante fica em silêncio, qual reação aparece primeiro?",
      options: [
        {
          id: "pressure",
          label: "Preciso resolver isso agora",
          score: 1,
          tags: ["urgency"],
          feedback: "O silêncio pode ser interpretado como um problema que precisa ser resolvido imediatamente."
        },
        {
          id: "withdraw",
          label: "Eu me fecho também",
          score: 1,
          tags: ["withdrawal"],
          feedback: "Se afastar pode funcionar como proteção antes que exista risco de rejeição."
        },
        {
          id: "please",
          label: "Tento melhorar o clima",
          score: 1,
          tags: ["appeasement"],
          feedback: "A tentativa de aliviar a tensão pode surgir antes mesmo de saber se existe um conflito."
        },
        {
          id: "neutral",
          label: "Espero e pergunto depois",
          score: 0,
          tags: ["pause"],
          feedback: "Criar espaço antes de reagir muda a relação entre sensação e resposta."
        }
      ]
    },
    {
      id: "conflict",
      title: "Quando percebe tensão numa conversa, o que tende a acontecer?",
      options: [
        {
          id: "rush",
          label: "Falo rápido para explicar tudo",
          score: 1,
          tags: ["urgency"],
          feedback: "A pressa em explicar pode ser uma forma de tentar controlar a percepção alheia."
        },
        {
          id: "freeze",
          label: "Travo e não sei o que dizer",
          score: 1,
          tags: ["withdrawal"],
          feedback: "O congelamento é uma resposta instintiva quando o sistema detecta perigo emocional."
        },
        {
          id: "smooth",
          label: "Mudo de assunto suavemente",
          score: 1,
          tags: ["appeasement"],
          feedback: "Evitar o desconforto direto preserva a harmonia imediata, mas posterga a clareza."
        },
        {
          id: "defend",
          label: "Já preparo meus argumentos",
          score: 1,
          tags: ["defense"],
          feedback: "A autodefesa antecipada consome energia que poderia ser usada para a escuta."
        }
      ]
    },
    {
      id: "mistake",
      title: "Quando alguém próximo comete um erro pequeno, qual impulso aparece primeiro?",
      options: [
        {
          id: "fix",
          label: "Corrijo na hora",
          score: 1,
          tags: ["urgency"],
          feedback: "A correção imediata pode vir de uma intolerância ao 'erro' no ambiente compartilhado."
        },
        {
          id: "ignore",
          label: "Finjo que não vi",
          score: 1,
          tags: ["withdrawal"],
          feedback: "Ignorar o erro evita o risco de gerar um conflito indesejado por algo pequeno."
        },
        {
          id: "excuse",
          label: "Justifico por eles",
          score: 1,
          tags: ["appeasement"],
          feedback: "Proteger o outro da falha pode ser uma forma de se proteger do desconforto de vê-lo falhar."
        },
        {
          id: "space",
          label: "Observo se eles percebem",
          score: 0,
          tags: ["pause"],
          feedback: "Dar espaço permite que a outra pessoa mantenha sua autonomia no próprio aprendizado."
        }
      ]
    }
  ],
  showProgress: true,
  feedbackMode: 'after_each',
  completionLabel: "Quiz Concluído"
};

// AUDIT QUIZ DEFINITION
const AUDIT_QUIZ: QuizDefinition = {
  id: "audit-deterministic-01",
  title: "Teste de Auditoria Determinística",
  questions: [
    {
      id: "Q1",
      title: "Pergunta 1 (score 1, urgency)",
      options: [
        { id: "Q1_O1", label: "Opção A", score: 1, tags: ["urgency"] },
        { id: "Q1_O2", label: "Opção B", score: 0, tags: ["none"] }
      ]
    },
    {
      id: "Q2",
      title: "Pergunta 2 (score 2, defense)",
      options: [
        { id: "Q2_O1", label: "Opção A", score: 2, tags: ["defense"] },
        { id: "Q2_O2", label: "Opção B", score: 0, tags: ["none"] }
      ]
    },
    {
      id: "Q3",
      title: "Pergunta 3 (score 3, urgency)",
      options: [
        { id: "Q3_O1", label: "Opção A", score: 3, tags: ["urgency"] },
        { id: "Q3_O2", label: "Opção B", score: 0, tags: ["none"] }
      ]
    }
  ],
  showProgress: true,
  feedbackMode: 'none',
  completionLabel: "Auditoria Concluída"
};

export const Route = createFileRoute("/dev/quiz")({
  component: QuizLab,
});

function QuizLab() {
  const [isOpen, setIsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showProgress, setShowProgress] = useState(true);
  const [feedbackMode, setFeedbackMode] = useState<'none' | 'after_each'>('after_each');
  const [allowPrevious, setAllowPrevious] = useState(false);
  const [closeBehavior, setCloseBehavior] = useState<'allow' | 'prevent'>('allow');
  const [activeDefinition, setActiveDefinition] = useState<QuizDefinition>(DEV_QUIZ);
  
  const [result, setResult] = useState<QuizResult | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentQuestionTime, setCurrentQuestionTime] = useState(0);
  const questionStartTimeRef = useRef<number>(Date.now());

  const addEvent = useCallback((event: string) => {
    setEventLog(prev => [event, ...prev].slice(0, 100));
  }, []);

  const handleOpen = (def: QuizDefinition = DEV_QUIZ) => {
    setActiveDefinition({
      ...def,
      showProgress,
      feedbackMode
    });
    setIsOpen(true);
    setResult(null);
    setStartTime(Date.now());
    questionStartTimeRef.current = Date.now();
    addEvent(`quiz_opened: ${def.id}`);
  };

  const handleReset = () => {
    setIsOpen(false);
    setTimeout(() => {
      setResult(null);
      setEventLog([]);
      setStartTime(null);
      setCurrentQuestionTime(0);
    }, 100);
  };

  const handleComplete = (res: QuizResult) => {
    setResult(res);
    addEvent("quiz_completed");
  };

  const handleAnswer = (answer: QuizAnswer) => {
    addEvent(`answer_recorded: ${answer.questionId}/${answer.optionId}`);
  };

  const handleQuestionChange = (index: number) => {
    const q = activeDefinition.questions[index];
    addEvent(`question_viewed: ${q?.id || 'unknown'}`);
    questionStartTimeRef.current = Date.now();
  };

  const handleInteraction = (event: { type: QuizInteractionType; quizId: string; questionId?: string; optionId?: string }) => {
    if (event.type === 'option_selected') {
      addEvent(`option_selected: ${event.optionId}`);
    } else if (event.type === 'feedback_viewed') {
      addEvent("feedback_viewed");
    }
  };

  // Timers
  useEffect(() => {
    if (!isOpen || result) return;
    const interval = setInterval(() => {
      setCurrentQuestionTime(Math.floor((Date.now() - questionStartTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, result]);

  const quizDuration = startTime && result?.completedAt 
    ? Math.floor((result.completedAt - startTime) / 1000)
    : startTime 
      ? Math.floor((Date.now() - startTime) / 1000) 
      : 0;

  return (
    <DevModuleLayout
      title="Quiz Experience Lab"
      subtitle="Interactive sequence of narrative questions with score and tag aggregation."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <DevSection title="Controles">
            <div className="grid grid-cols-2 gap-3">
              <DevCard
                icon={<Play className="w-5 h-5 text-green-500" />}
                title="Open Quiz"
                onClick={() => handleOpen(DEV_QUIZ)}
              />
              <DevCard
                icon={<ClipboardList className="w-5 h-5 text-purple-500" />}
                title="Audit Test"
                onClick={() => handleOpen(AUDIT_QUIZ)}
                data-testid="audit-test-btn"
              />
              <DevCard
                icon={<RotateCcw className="w-5 h-5 text-amber-500" />}
                title="Reset"
                onClick={handleReset}
              />
              <DevCard
                icon={<X className="w-5 h-5 text-red-500" />}
                title="Force Close"
                onClick={() => setIsOpen(false)}
              />
            </div>
          </DevSection>

          <DevSection title="Configurações">
            <div className="space-y-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">Show Progress</span>
                <button
                  onClick={() => setShowProgress(!showProgress)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold transition-colors",
                    showProgress ? "bg-zinc-100 text-zinc-950" : "bg-zinc-800 text-zinc-500"
                  )}
                >
                  {showProgress ? "ON" : "OFF"}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">Feedback Mode</span>
                <select
                  value={feedbackMode}
                  onChange={(e) => setFeedbackMode(e.target.value as 'none' | 'after_each')}
                  className="bg-zinc-800 text-zinc-200 text-xs rounded-lg px-2 py-1 outline-none border border-zinc-700"
                >
                  <option value="none">none</option>
                  <option value="after_each">after_each</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">Allow Previous</span>
                <button
                  onClick={() => setAllowPrevious(!allowPrevious)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold transition-colors",
                    allowPrevious ? "bg-zinc-100 text-zinc-950" : "bg-zinc-800 text-zinc-500"
                  )}
                >
                  {allowPrevious ? "ON" : "OFF"}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">Close behavior</span>
                <button
                  onClick={() => setCloseBehavior(closeBehavior === 'allow' ? 'prevent' : 'allow')}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold transition-colors",
                    closeBehavior === 'allow' ? "bg-zinc-100 text-zinc-950" : "bg-zinc-800 text-zinc-500"
                  )}
                >
                  {closeBehavior === 'allow' ? "ALLOW" : "PREVENT"}
                </button>
              </div>
            </div>
          </DevSection>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <DevSection title="QUIZ RESULT">
            {result ? (
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 space-y-6" id="quiz-result-data">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Total Score</div>
                    <div className="text-xl font-bold text-white" id="result-total-score">{result.totalScore}</div>
                  </div>
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Answers</div>
                    <div className="text-xl font-bold text-white" id="result-answers-length">{result.answers.length}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Tag Counts</div>
                  <div className="flex flex-wrap gap-2" id="result-tag-counts">
                    {Object.entries(result.tagCounts).map(([tag, count]) => (
                      <div key={tag} className="px-3 py-1.5 bg-zinc-950 rounded-full border border-zinc-800 flex items-center gap-2">
                        <span className="text-zinc-300 text-xs font-medium">{tag}</span>
                        <span className="bg-zinc-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full tag-count-value" data-tag={tag}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Raw Answers</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2" id="result-raw-answers">
                    {result.answers.map((ans, idx) => (
                      <div key={idx} className="p-2 bg-zinc-950 rounded border border-zinc-800 text-[10px] font-mono text-zinc-400 raw-answer-item" data-question-id={ans.questionId}>
                        {ans.questionId}: {ans.optionId} (Score: {ans.score})
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-600">
                <Activity className="w-8 h-8 mb-4 opacity-20" />
                <p className="text-sm">Nenhum resultado disponível. Inicie o quiz para gerar dados.</p>
              </div>
            )}
          </DevSection>

          <DevSection title="EVENT LOG">
            <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="h-60 overflow-y-auto p-4 font-mono text-[10px] space-y-1">
                {eventLog.map((log, i) => (
                  <div key={i} className={cn("flex gap-3", i === 0 ? "text-zinc-100" : "text-zinc-600")}>
                    <span className="text-zinc-800">[{eventLog.length - i}]</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          </DevSection>
        </div>
      </div>

      <QuizOverlay
        open={isOpen}
        definition={activeDefinition}
        onClose={() => setIsOpen(false)}
        onComplete={handleComplete}
        onAnswer={handleAnswer}
        onQuestionChange={handleQuestionChange}
        onInteraction={handleInteraction}
        allowPrevious={allowPrevious}
        closeBehavior={closeBehavior}
      />
    </DevModuleLayout>
  );
}