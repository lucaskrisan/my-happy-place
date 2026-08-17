import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
      const timer = setTimeout(() => setState('active'), 500);
      return () => clearTimeout(timer);
    }
    if (state === 'exiting') {
      const timer = setTimeout(() => {
        setState('hidden');
        onClose?.();
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state, definition.id, onOpen, onInteraction, onClose, onStateChange]);

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
    if (!currentQuestion || isProcessing.current) return;
    
    isProcessing.current = true;
    onInteraction?.({ type: 'question_completed', quizId: definition.id, questionId: currentQuestion.id });
    
    if (isLastQuestion) {
      if (isCompleted.current) { 
        isProcessing.current = false; 
        return; 
      }
      isCompleted.current = true;
      setState('completed');
      onComplete?.(calculateResult(finalAnswers));
      onInteraction?.({ type: 'quiz_completed', quizId: definition.id });
      // Keep isProcessing true until unmount/reset
    } else {
      setState('transitioning');
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
        onQuestionChange?.(currentQuestionIndex + 1);
        setState('active');
        isProcessing.current = false;
        const nextQ = definition.questions[currentQuestionIndex + 1];
        if (nextQ) onInteraction?.({ type: 'question_viewed', quizId: definition.id, questionId: nextQ.id });
      }, 400);
    }
  }, [currentQuestion, onInteraction, definition.id, isLastQuestion, onComplete, calculateResult, currentQuestionIndex, onQuestionChange, definition.questions]);

  const handleFeedbackContinue = useCallback(() => {
    if (state !== 'feedback' || isProcessing.current) return;
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
          className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden font-sans"
        >
          {definition.showProgress && state !== 'completed' && (
            <div className="w-full bg-zinc-900 h-1 mt-[env(safe-area-inset-top,0px)]">
              <motion.div 
                className="bg-zinc-100 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestionIndex + 1) / definition.questions.length) * 100}%` }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
              />
            </div>
          )}
          <header className="flex items-center justify-between p-4 md:p-6 border-b border-zinc-900">
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
          <main className="flex-1 overflow-y-auto relative flex flex-col">
            <div className="max-w-xl mx-auto w-full px-6 py-12 flex-1 flex flex-col">
              <AnimatePresence mode="wait">
                {state === 'completed' ? (
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
                ) : currentQuestion ? (
                  <motion.div 
                    key={currentQuestion.id} 
                    initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: prefersReducedMotion ? 0 : -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 flex flex-col"
                  >
                    <div className="mb-10">
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight tracking-tight">{currentQuestion.title}</h2>
                    </div>
                    <div className="space-y-3 mb-12">
                      {currentQuestion.options.map((option, idx) => (
                        <button
                          key={option.id}
                          ref={el => { if (optionRefs.current) optionRefs.current[idx] = el; }}
                          onClick={() => handleOptionClick(option)}
                          className={cn(
                            "w-full text-left p-5 rounded-2xl border transition-all duration-200 group relative",
                            "bg-zinc-900/50 border-white/5 hover:border-white/10",
                            currentAnswer?.optionId === option.id && "bg-zinc-100 border-white ring-2 ring-white/20 text-zinc-950"
                          )}
                        >
                          <span className="block font-semibold text-lg">{option.label}</span>
                        </button>
                      ))}
                    </div>
                    {state === 'feedback' && currentAnswer && (
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
                            onClick={() => moveToNext(answers)}
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
          <div className="h-[env(safe-area-inset-bottom,20px)] bg-zinc-950" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};