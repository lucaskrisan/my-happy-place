import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  
  const currentQuestion: QuizQuestion | undefined = definition.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === definition.questions.length - 1;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  // Sync state with open prop
  useEffect(() => {
    if (open && state === 'hidden') {
      setState('entering');
      setStartTime(Date.now());
    } else if (!open && state !== 'hidden') {
      setState('exiting');
    }
  }, [open]);

  // Handle internal state transitions
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
  }, [state, definition.id]);

  const calculateResult = (): QuizResult => {
    const answerList = Object.values(answers);
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
  };

  const handleOptionClick = (option: QuizOption) => {
    if (state !== 'active' || !currentQuestion) return;
    
    const answer: QuizAnswer = {
      questionId: currentQuestion.id,
      optionId: option.id,
      value: option.value ?? null,
      score: option.score || 0,
      tags: option.tags || []
    };

    // Store answer locally
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));

    onAnswer?.(answer);
    onInteraction?.({ 
      type: 'option_selected', 
      quizId: definition.id, 
      questionId: currentQuestion.id,
      optionId: option.id 
    });

    if (definition.feedbackMode === 'after_each' && option.feedback) {
      setState('feedback');
      onInteraction?.({ type: 'feedback_viewed', quizId: definition.id, questionId: currentQuestion.id });
    } else {
      moveToNext();
    }
  };

  const moveToNext = () => {
    if (!currentQuestion) return;
    
    onInteraction?.({ type: 'question_completed', quizId: definition.id, questionId: currentQuestion.id });
    
    if (isLastQuestion) {
      setState('completed');
      const result = calculateResult();
      onComplete?.(result);
      onInteraction?.({ type: 'quiz_completed', quizId: definition.id });
    } else {
      setState('transitioning');
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
        onQuestionChange?.(currentQuestionIndex + 1);
        setState('active');
        const nextQ = definition.questions[currentQuestionIndex + 1];
        if (nextQ) {
          onInteraction?.({ type: 'question_viewed', quizId: definition.id, questionId: nextQ.id });
        }
      }, 400);
    }
  };

  const handleBack = () => {
    if (!allowPrevious || currentQuestionIndex === 0 || state !== 'active') return;
    
    setState('transitioning');
    setTimeout(() => {
      setCurrentQuestionIndex(prev => prev - 1);
      onQuestionChange?.(currentQuestionIndex - 1);
      setState('active');
    }, 400);
  };

  // Keyboard navigation
  useEffect(() => {
    if (state !== 'active' || !currentQuestion) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (currentQuestion.options[index]) {
          handleOptionClick(currentQuestion.options[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, currentQuestion]);

  // Accessibility: prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden font-sans"
          role="dialog"
          aria-modal="true"
        >
          {/* Progress Bar */}
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

          {/* Header */}
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
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
            <div className="max-w-xl mx-auto w-full px-6 py-12 flex-1 flex flex-col">
              
              <AnimatePresence mode="wait">
                {state === 'completed' ? (
                  <motion.div
                    key="completed"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center my-auto"
                  >
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-900 mb-8">
                      <Check className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">
                      {definition.completionLabel || 'Concluído'}
                    </h2>
                    <p className="text-zinc-400">
                      Suas respostas foram registradas com sucesso.
                    </p>
                  </motion.div>
                ) : currentQuestion ? (
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: prefersReducedMotion ? 0 : -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="flex-1 flex flex-col"
                  >
                    {/* Question Text */}
                    <div className="mb-10">
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight tracking-tight">
                        {currentQuestion.title}
                      </h2>
                      {currentQuestion.subtitle && (
                        <p className="text-zinc-400 text-lg leading-relaxed">
                          {currentQuestion.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Options */}
                    <div className="space-y-3 mb-12">
                      {currentQuestion.options.map((option, index) => {
                        const isSelected = currentAnswer?.optionId === option.id;
                        return (
                          <motion.button
                            key={option.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleOptionClick(option)}
                            disabled={state !== 'active'}
                            className={cn(
                              "w-full text-left p-5 rounded-2xl border transition-all duration-200 group relative",
                              "bg-zinc-900/50 border-white/5",
                              "hover:bg-zinc-900 hover:border-white/10 active:scale-[0.99]",
                              isSelected && "bg-zinc-100 border-white ring-2 ring-white/20",
                              state !== 'active' && !isSelected && "opacity-50 pointer-events-none"
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <span className={cn(
                                  "block font-semibold text-lg transition-colors",
                                  isSelected ? "text-zinc-950" : "text-zinc-200 group-hover:text-white"
                                )}>
                                  {option.label}
                                </span>
                                {option.description && (
                                  <span className={cn(
                                    "block text-sm mt-1 transition-colors leading-snug",
                                    isSelected ? "text-zinc-600" : "text-zinc-500 group-hover:text-zinc-400"
                                  )}>
                                    {option.description}
                                  </span>
                                )}
                              </div>
                              {isSelected && <Check className="w-5 h-5 text-zinc-950 mt-1 flex-shrink-0" />}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Feedback Layer */}
                    {state === 'feedback' && currentAnswer && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="fixed bottom-0 left-0 right-0 p-6 bg-zinc-900 border-t border-zinc-800 z-10 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
                      >
                        <div className="max-w-xl mx-auto w-full">
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Feedback</h4>
                          <p className="text-zinc-200 mb-6 leading-relaxed">
                            {currentQuestion.options.find(o => o.id === currentAnswer.optionId)?.feedback || 'Sua resposta foi registrada.'}
                          </p>
                          <button
                            onClick={moveToNext}
                            className="w-full py-4 rounded-full bg-white text-zinc-950 font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
                          >
                            Continuar
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>

            </div>
          </main>
          
          {/* Safe Area Spacer */}
          <div className="h-[env(safe-area-inset-bottom,20px)] bg-zinc-950" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
