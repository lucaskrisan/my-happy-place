import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, ChevronLeft, X } from 'lucide-react';
import { 
  QuizDefinition, 
  QuizQuestion, 
  QuizOption, 
  QuizAnswer, 
  QuizResult, 
  QuizState, 
  QuizInteractionType 
} from '@/types/quiz';

interface QuizOverlayProps {
  open: boolean;
  definition: QuizDefinition;
  variant?: 'default' | 'cinematic' | 'immersive';
  onOpen?: () => void;
  onAnswer?: (answer: QuizAnswer) => void;
  onQuestionChange?: (index: number) => void;
  onComplete?: (result: QuizResult) => void;
  onClose?: () => void;
  onStateChange?: (state: QuizState) => void;
  onInteraction?: (event: { type: QuizInteractionType; quizId: string; questionId?: string; optionId?: string }) => void;
  closeBehavior?: 'allow' | 'prevent';
  allowPrevious?: boolean;
}

export const QuizOverlay: React.FC<QuizOverlayProps> = ({
  open,
  definition,
  variant = 'default',
  onOpen,
  onAnswer,
  onQuestionChange,
  onComplete,
  onClose,
  onStateChange,
  onInteraction,
  closeBehavior = 'allow',
  allowPrevious = false
}) => {
  const [state, setState] = useState<QuizState>('hidden');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  const [startTime, setStartTime] = useState<number>(Date.now());
  
  const isProcessing = useRef(false);
  const isCompleted = useRef(false);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const currentQuestion: QuizQuestion | undefined = definition.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === definition.questions.length - 1;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  useEffect(() => {
    if (open && state === 'hidden') {
      // Reset runtime on new session
      setCurrentQuestionIndex(0);
      setAnswers({});
      setStartTime(Date.now());
      isProcessing.current = false;
      isCompleted.current = false;
      
      setState('entering');
    } else if (!open && state !== 'hidden') {
      setState('exiting');
    }
  }, [open, state]);

  useEffect(() => {
    onStateChange?.(state);
    if (state === 'entering') {
      onOpen?.();
      onInteraction?.({ type: 'quiz_opened', quizId: definition.id });
      const timer = setTimeout(() => setState('active'), (variant === 'cinematic' || variant === 'immersive') ? 300 : 500);
      return () => clearTimeout(timer);
    }
    if (state === 'exiting') {
      const timer = setTimeout(() => {
        setState('hidden');
        onClose?.();
      }, (variant === 'cinematic' || variant === 'immersive') ? 300 : 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state, definition.id, onOpen, onInteraction, onClose, onStateChange, variant]);

  const calculateResult = useCallback((finalAnswers: Record<string, QuizAnswer>): QuizResult => {
    const answerList = Object.values(finalAnswers);
    const totalScore = answerList.reduce((sum, ans) => sum + (ans.score || 0), 0);
    const tagCounts: Record<string, number> = {};
    answerList.forEach(ans => {
      ans.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return {
      quizId: definition.id,
      answers: answerList,
      totalScore,
      tagCounts,
      startedAt: startTime,
      completedAt: Date.now()
    };
  }, [definition.id, startTime]);

  const moveToNext = useCallback((finalAnswers: Record<string, QuizAnswer>) => {
    if (!currentQuestion) return;
    
    onInteraction?.({ type: 'question_completed', quizId: definition.id, questionId: currentQuestion.id });
    
    if (isLastQuestion) {
      if (isCompleted.current) return;
      isCompleted.current = true;
      setState('completed');
      onComplete?.(calculateResult(finalAnswers));
      onInteraction?.({ type: 'quiz_completed', quizId: definition.id });
    } else {
      setState('transitioning');
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
        onQuestionChange?.(currentQuestionIndex + 1);
        setState('active');
        isProcessing.current = false; // Release for next question
        const nextQ = definition.questions[currentQuestionIndex + 1];
        if (nextQ) onInteraction?.({ type: 'question_viewed', quizId: definition.id, questionId: nextQ.id });
      }, 400);
    }
  }, [currentQuestion, onInteraction, definition.id, isLastQuestion, onComplete, calculateResult, currentQuestionIndex, onQuestionChange, definition.questions]);

  const handleFeedbackContinue = useCallback(() => {
    if (state !== 'feedback' || isProcessing.current) return;
    isProcessing.current = true;
    moveToNext(answers);
  }, [state, moveToNext, answers]);

  const handleOptionClick = useCallback((option: QuizOption) => {
    if (state !== 'active' || !currentQuestion || isProcessing.current) return;
    
    isProcessing.current = true;
    
    const answer: QuizAnswer = {
      questionId: currentQuestion.id,
      optionId: option.id,
      value: option.value ?? null,
      score: option.score || 0,
      tags: option.tags || []
    };

    const nextAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(nextAnswers);

    onAnswer?.(answer);
    onInteraction?.({ type: 'option_selected', quizId: definition.id, questionId: currentQuestion.id, optionId: option.id });

    if (definition.feedbackMode === 'after_each' && option.feedback) {
      setState('feedback');
      onInteraction?.({ type: 'feedback_viewed', quizId: definition.id, questionId: currentQuestion.id });
      isProcessing.current = false;
    } else {
      moveToNext(nextAnswers);
    }
  }, [state, currentQuestion, answers, onAnswer, onInteraction, definition.id, definition.feedbackMode, moveToNext]);

  const handleBack = useCallback(() => {
    if (!allowPrevious || currentQuestionIndex === 0 || state !== 'active' || isProcessing.current) return;
    
    isProcessing.current = true;
    setState('transitioning');
    
    setTimeout(() => {
      setCurrentQuestionIndex(prev => prev - 1);
      onQuestionChange?.(currentQuestionIndex - 1);
      setState('active');
      isProcessing.current = false;
    }, 400);
  }, [allowPrevious, currentQuestionIndex, state, onQuestionChange]);

  const prefersReducedMotion = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    if (state !== 'active' || !currentQuestion) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        const opt = currentQuestion.options[idx];
        if (opt) handleOptionClick(opt);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        const next = Math.min(currentQuestion.options.length - 1, optionRefs.current.findIndex(r => r === document.activeElement) + 1);
        optionRefs.current[next]?.focus();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        const prev = Math.max(0, optionRefs.current.findIndex(r => r === document.activeElement) - 1);
        optionRefs.current[prev]?.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        const focused = optionRefs.current.find(r => r === document.activeElement);
        if (focused) {
          const idx = optionRefs.current.indexOf(focused);
          const opt = currentQuestion.options[idx];
          if (opt) handleOptionClick(opt);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, currentQuestion, handleOptionClick]);

  const isCinematic = variant === 'cinematic';
  const isImmersive = variant === 'immersive';
  const isVisualLayered = isCinematic || isImmersive;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
          className={cn(
            "fixed inset-0 z-50 flex flex-col overflow-hidden font-sans",
            isVisualLayered
              ? "bg-transparent" 
              : "bg-zinc-950 text-zinc-100"
          )}
        >
          {isVisualLayered && (
            <div 
              className="absolute inset-0 pointer-events-none" 
              style={{
                background: isImmersive 
                  ? 'linear-gradient(to bottom, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.08) 30%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.92) 100%)'
                  : 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.28) 40%, rgba(0,0,0,0.82) 100%)',
                backdropFilter: isImmersive ? 'none' : 'blur(3px)'
              }}
            />
          )}

          {definition.showProgress && state !== 'completed' && !isVisualLayered && (
            <div className="w-full bg-zinc-900 h-1 mt-[env(safe-area-inset-top,0px)]">
              <motion.div 
                className="bg-zinc-100 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestionIndex + 1) / definition.questions.length) * 100}%` }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
              />
            </div>
          )}

          {!isVisualLayered && (
            <header className="flex items-center justify-between p-4 md:p-6 border-b border-zinc-900 shrink-0">
              <div className="flex flex-col">
                {definition.showProgress && state !== 'completed' && (
                  <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-0.5">
                    Pergunta {currentQuestionIndex + 1} de {definition.questions.length}
                  </span>
                )}
                <h1 className="text-sm font-semibold text-zinc-300 truncate max-w-[200px] md:max-w-md">
                  {definition.title || 'Quiz'}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                {allowPrevious && currentQuestionIndex > 0 && state === 'active' && (
                  <button
                    onClick={handleBack}
                    className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
                    aria-label="Voltar"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                {closeBehavior === 'allow' && (
                  <button onClick={onClose} className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white" aria-label="Fechar"><X className="w-5 h-5" /></button>
                )}
              </div>
            </header>
          )}

          <main className="flex-1 relative flex flex-col justify-end">
            <div className={cn(
              "w-full px-6 flex flex-col",
              isVisualLayered
                ? "max-w-[560px] mx-auto pb-12" 
                : "max-w-xl mx-auto py-12 flex-1"
            )}>
              <AnimatePresence mode="wait">
                {state === 'completed' && !isVisualLayered ? (
                  <motion.div 
                    key="completed"
                    initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="text-center my-auto"
                  >
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-900 mb-8">
                      <Check className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">{definition.completionLabel || 'Concluído'}</h2>
                  </motion.div>
                ) : state === 'completed' && isImmersive ? (
                  <motion.div
                    key="completed-immersive"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-white/80 text-[15px] md:text-lg font-medium italic"
                    >
                      "Guarda essa resposta. Ela vai voltar mais tarde."
                    </motion.p>
                  </motion.div>
                ) : currentQuestion ? (
                  <motion.div 
                    key={currentQuestion.id} 
                    initial={isVisualLayered ? { opacity: 0, y: 18 } : { opacity: 0, x: 20 }} 
                    animate={{ opacity: 1, x: 0, y: 0 }} 
                    exit={isVisualLayered ? { opacity: 0, y: 10 } : { opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className={cn(
                      "flex flex-col",
                      isVisualLayered
                        ? isImmersive ? "bg-transparent" : "bg-[rgba(15,15,18,0.84)] backdrop-blur-[18px] border border-white/10 rounded-[24px] p-6 shadow-2xl overflow-hidden" 
                        : "flex-1"
                    )}
                  >
                    <div className={isVisualLayered ? "mb-6" : "mb-10"}>
                      {isVisualLayered && (definition.title || isImmersive) && (
                        <span className="text-[10px] font-medium tracking-[0.4em] text-white/50 uppercase block mb-3">
                          {isImmersive ? "AGORA É SOBRE VOCÊ" : (definition.title || 'QUIZ')}
                        </span>
                      )}
                      <h2 className={cn(
                        "font-bold leading-tight tracking-tight text-white",
                        isVisualLayered ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"
                      )}>
                        {currentQuestion.title}
                      </h2>
                    </div>

                    <div className={cn("space-y-3", isVisualLayered ? "mb-0" : "mb-12")}>
                      {currentQuestion.options.map((option, idx) => (
                        <motion.div
                          key={option.id}
                          initial={isImmersive ? { opacity: 0, x: -10 } : {}}
                          animate={isImmersive ? { 
                            opacity: currentAnswer && currentAnswer.optionId !== option.id ? 0.5 : 1, 
                            x: 0 
                          } : {}}
                          transition={{ delay: isImmersive ? idx * 0.08 : 0 }}
                        >
                          <button
                            ref={el => { if (optionRefs.current) optionRefs.current[idx] = el; }}
                            onClick={() => {
                              if (navigator.vibrate) {
                                try { navigator.vibrate(25); } catch(e) {}
                              }
                              handleOptionClick(option);
                            }}
                            className={cn(
                              "w-full text-left p-5 rounded-2xl border transition-all duration-200 group relative active:scale-[0.98]",
                              isImmersive
                                ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                                : isCinematic 
                                  ? "bg-white/5 border-white/10 hover:bg-white/10" 
                                  : "bg-zinc-900/50 border-white/5 hover:border-white/10",
                              currentAnswer?.optionId === option.id && (
                                isImmersive
                                  ? "bg-white/20 border-white/40 ring-1 ring-white/20"
                                  : isCinematic 
                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-100" 
                                    : "bg-zinc-100 border-white ring-2 ring-white/20 text-zinc-950"
                              )
                            )}
                          >
                            <span className={cn(
                              "block font-medium",
                              isVisualLayered ? "text-[15px] md:text-base" : "text-lg"
                            )}>{option.label}</span>
                          </button>
                        </motion.div>
                      ))}
                    </div>

                    {state === 'feedback' && currentAnswer && !isVisualLayered && (
                      <motion.div
                        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="fixed bottom-0 left-0 right-0 p-6 bg-zinc-900 border-t border-zinc-800 z-10 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
                      >
                        <div className="max-w-xl mx-auto w-full">
                          <p className="text-zinc-200 mb-6">
                            {currentQuestion.options.find(o => o.id === currentAnswer.optionId)?.feedback || 'Sua resposta foi registrada.'}
                          </p>
                          <button
                            onClick={handleFeedbackContinue}
                            className="w-full py-4 rounded-full bg-white text-zinc-950 font-bold"
                          >
                            Continuar
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </main>
          <div className={cn("shrink-0", isVisualLayered ? "h-6" : "h-[env(safe-area-inset-bottom,20px)] bg-zinc-950")} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};