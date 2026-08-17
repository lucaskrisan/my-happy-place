import React, { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { 
  DevModuleLayout, 
  DevSection 
} from '@/components/dev-tools';
import { ChoiceOverlay } from '@/components/dev/ChoiceOverlay';
import { 
  ChoiceDefinition, 
  ChoiceResult, 
  ChoiceState, 
  ChoiceInteractionEvent,
  ChoiceOption
} from '@/types/choice';
import { 
  Play, 
  RotateCcw, 
  Settings2, 
  History, 
  Timer,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dev/choice')({
  component: ChoiceExperienceLab,
});

function ChoiceExperienceLab() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'instant' | 'confirm'>('instant');
  const [allowChange, setAllowChange] = useState(true);
  const [events, setEvents] = useState<(ChoiceInteractionEvent & { timestamp: number })[]>([]);
  const [results, setResults] = useState<ChoiceResult | null>(null);
  const [currentState, setCurrentState] = useState<ChoiceState>('hidden');
  const [decisionTime, setDecisionTime] = useState<number | null>(null);
  
  const startTimeRef = React.useRef<number | null>(null);

  const testChoice: ChoiceDefinition = {
    id: 'test-choice-01',
    title: 'O que ela faz?',
    subtitle: 'Uma decisão que pode mudar o rumo da conversa com o marido.',
    mode,
    allowChange,
    options: [
      {
        id: 'please',
        label: 'Tenta agradar',
        description: 'Diz que sentiu falta dele e pergunta se ele quer jantar.',
        value: 'conciliatory',
        action: { type: 'open_interaction', interactionId: 'husband-dinner-scene' }
      },
      {
        id: 'confront',
        label: 'Questiona a demora',
        description: 'Pergunta por que ele não atendeu as ligações o dia todo.',
        value: 'confrontational',
        action: { type: 'go_to_scene', sceneId: 'scene-argument-01' }
      },
      {
        id: 'ignore',
        label: 'Fica em silêncio',
        description: 'Não diz nada e espera ele começar a falar.',
        value: 'passive',
        action: { type: 'complete' }
      }
    ]
  };

  const handleInteraction = (event: ChoiceInteractionEvent) => {
    setEvents(prev => [{ ...event, timestamp: Date.now() }, ...prev]);
    
    if (event.type === 'choice_opened') {
      startTimeRef.current = Date.now();
      setDecisionTime(null);
    }
    
    if (event.type === 'choice_completed') {
      if (startTimeRef.current) {
        setDecisionTime(Date.now() - startTimeRef.current);
      }
    }
  };

  const handleComplete = (result: ChoiceResult) => {
    setResults(result);
  };

  const reset = () => {
    setIsOpen(false);
    setResults(null);
    setEvents([]);
    setDecisionTime(null);
    startTimeRef.current = null;
  };

  return (
    <DevModuleLayout
      number="09"
      title="Choice Experience"
      description="Laboratório de escolhas narrativas ramificadas."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Controls Section */}
        <div className="space-y-8">
          <DevSection title="Configuração do Teste">
            <div className="space-y-6">
              <div className="flex flex-col gap-4">
                <label className="text-sm font-medium text-zinc-400">Modo de Seleção</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => setMode('instant')}
                    className={cn(
                      "py-2 px-4 rounded-lg text-sm font-medium transition-all",
                      mode === 'instant' ? "bg-zinc-100 text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Instantâneo
                  </button>
                  <button
                    onClick={() => setMode('confirm')}
                    className={cn(
                      "py-2 px-4 rounded-lg text-sm font-medium transition-all",
                      mode === 'confirm' ? "bg-zinc-100 text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Confirmação
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-zinc-800">
                <div>
                  <div className="text-sm font-medium text-zinc-200">Permitir Troca</div>
                  <div className="text-xs text-zinc-500">Permite mudar a opção antes de confirmar</div>
                </div>
                <button
                  onClick={() => setAllowChange(!allowChange)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    allowChange ? "bg-green-600" : "bg-zinc-700"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                    allowChange ? "left-7" : "left-1"
                  )} />
                </button>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setIsOpen(true)}
                  disabled={isOpen}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-white text-zinc-950 rounded-xl font-bold hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Abrir Escolha
                </button>
                
                <button
                  onClick={reset}
                  className="px-6 py-4 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 active:scale-95 transition-all"
                  title="Reset"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </DevSection>

          <DevSection title="Status da Engine">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-black/40 border border-zinc-800">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
                  <Settings2 className="w-3 h-3" /> Estado Atual
                </div>
                <div className="text-xl font-mono text-zinc-200">{currentState}</div>
              </div>
              
              <div className="p-4 rounded-xl bg-black/40 border border-zinc-800">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
                  <Timer className="w-3 h-3" /> Decisão
                </div>
                <div className="text-xl font-mono text-zinc-200">
                  {decisionTime ? `${(decisionTime / 1000).toFixed(2)}s` : '--'}
                </div>
              </div>
            </div>
          </DevSection>

          {results && (
            <DevSection title="Resultado da Escolha">
              <div className="p-6 rounded-2xl bg-zinc-100 text-zinc-900 shadow-xl border-t-4 border-zinc-900">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Option ID</div>
                    <div className="text-2xl font-black">{results.optionId}</div>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-zinc-900" />
                </div>
                
                <div className="space-y-3">
                  <div className="p-3 bg-zinc-200/50 rounded-lg">
                    <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Value</div>
                    <code className="text-sm font-mono font-bold">{results.value}</code>
                  </div>
                  
                  <div className="p-3 bg-zinc-200/50 rounded-lg">
                    <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Action Payload</div>
                    <pre className="text-xs font-mono overflow-auto max-h-20">
                      {JSON.stringify(results.action, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </DevSection>
          )}
        </div>

        {/* Debug Logs Section */}
        <div className="space-y-8">
          <DevSection title="Event History">
            <div className="bg-black/40 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto divide-y divide-zinc-800">
                {events.length === 0 ? (
                  <div className="p-8 text-center text-zinc-600 italic">
                    Nenhum evento registrado ainda.
                  </div>
                ) : (
                  events.map((event, idx) => (
                    <div key={idx} className="p-4 flex items-start gap-3 hover:bg-white/5 transition-colors">
                      <div className={cn(
                        "mt-1 w-2 h-2 rounded-full shrink-0",
                        event.type === 'choice_opened' && "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]",
                        event.type === 'option_selected' && "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]",
                        event.type === 'choice_completed' && "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-tight">
                            {event.type}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-600">
                            {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 truncate">
                          {'optionId' in event ? `Option: ${event.optionId}` : `Choice: ${event.choiceId}`}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DevSection>

          <DevSection title="Preview Visual">
            <div className="relative aspect-[9/16] max-w-[280px] mx-auto bg-zinc-900 rounded-[2.5rem] border-[8px] border-zinc-800 shadow-2xl overflow-hidden ring-1 ring-white/5">
              {/* Fake UI Background */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
              </div>

              {/* Status Bar */}
              <div className="absolute top-0 inset-x-0 h-10 px-6 flex items-center justify-between z-10">
                <span className="text-[10px] font-bold text-white">9:41</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center text-center p-6">
                <div className="space-y-2">
                  <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Preview Mode</div>
                  <div className="text-white/60 text-xs italic">
                    A escolha aparecerá sobreposta a este frame.
                  </div>
                </div>
              </div>
            </div>
          </DevSection>
        </div>
      </div>

      {/* Choice Component Instance */}
      <ChoiceOverlay
        open={isOpen}
        definition={testChoice}
        onStateChange={setCurrentState}
        onInteraction={handleInteraction}
        onComplete={handleComplete}
        onClose={() => setIsOpen(false)}
        closeBehavior="allow"
      />
    </DevModuleLayout>
  );
}
