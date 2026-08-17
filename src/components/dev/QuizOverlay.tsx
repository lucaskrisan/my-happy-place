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

  const currentQuestion = definition.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === definition.questions.length - 1;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  useEffect(() => {
    if (open && state === 'hidden') {
      setState('entering');
      setStartTime(Date.now());
      isCompleted.current = false;
    } else if (!open && state !== 'hidden') {
      setState('exiting');
    }
  }, [open]);

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
  }, [state, definition.id]);

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

  const handleOptionClick = (option: QuizOption) => {
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
  };

  const moveToNext = (finalAnswers = answers) => {
    if (!currentQuestion) return;
    onInteraction?.({ type: 'question_completed', quizId: definition.id, questionId: currentQuestion.id });
    
    if (isLastQuestion) {
      if (isCompleted.current) { isProcessing.current = false; return; }
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
        isProcessing.current = false;
        const nextQ = definition.questions[currentQuestionIndex + 1];
        if (nextQ) onInteraction?.({ type: 'question_viewed', quizId: definition.id, questionId: nextQ.id });
      }, 400);
    }
  };

  const prefersReducedMotion = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    if (state !== 'active' || !currentQuestion) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        if (currentQuestion.options[idx]) handleOptionClick(currentQuestion.options[idx]);
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
          handleOptionClick(currentQuestion.options[idx]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, currentQuestion, answers]);

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
            <div className="w-full bg-zinc-900 h-1">
              <motion.div 
                className="bg-zinc-100 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestionIndex + 1) / definition.questions.length) * 100}%` }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
              />
            </div>
          )}
          <header className="flex items-center justify-between p-4 md:p-6 border-b border-zinc-900">
            <h1 className="text-sm font-semibold text-zinc-300">{definition.title || 'Quiz'}</h1>
            {closeBehavior === 'allow' && (
              <button onClick={onClose} className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white" aria-label="Fechar"><X className="w-5 h-5" /></button>
            )}
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-xl mx-auto px-6 py-12">
              <AnimatePresence mode="wait">
                {state === 'completed' ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <h2 className="text-3xl font-bold mb-4">{definition.completionLabel || 'Concluído'}</h2>
                  </motion.div>
                ) : currentQuestion ? (
                  <motion.div key={currentQuestion.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <h2 className="text-2xl font-bold">{currentQuestion.title}</h2>
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, idx) => (
                        <button
                          key={option.id}
                          ref={el => optionRefs.current[idx] = el}
                          onClick={() => handleOptionClick(option)}
                          className={cn("w-full p-5 rounded-2xl bg-zinc-900 border border-white/5 hover:border-white/20 transition-all", answers[currentQuestion.id]?.optionId === option.id && "bg-zinc-100 text-zinc-950")}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
};