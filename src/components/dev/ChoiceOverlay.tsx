import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChoiceDefinition, 
  ChoiceOption, 
  ChoiceResult, 
  ChoiceState, 
  ChoiceInteractionEvent 
} from '@/types/choice';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ChoiceOverlayProps {
  open: boolean;
  definition: ChoiceDefinition;
  onOpen?: () => void;
  onSelect?: (option: ChoiceOption) => void;
  onComplete?: (result: ChoiceResult) => void;
  onClose?: () => void;
  onStateChange?: (state: ChoiceState) => void;
  onInteraction?: (event: ChoiceInteractionEvent) => void;
  closeBehavior?: 'allow' | 'prevent';
}

export const ChoiceOverlay: React.FC<ChoiceOverlayProps> = ({
  open,
  definition,
  onOpen,
  onSelect,
  onComplete,
  onClose,
  onStateChange,
  onInteraction,
  closeBehavior = 'allow'
}) => {
  const [state, setState] = useState<ChoiceState>('hidden');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const completionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal state with external open prop
  useEffect(() => {
    if (open && state === 'hidden') {
      setState('entering');
    } else if (!open && state !== 'hidden') {
      setState('exiting');
    }
  }, [open]);

  // Handle state changes
  useEffect(() => {
    onStateChange?.(state);
    
    if (state === 'entering') {
      onOpen?.();
      onInteraction?.({ type: 'choice_opened', choiceId: definition.id });
      // Transition to active after entrance animation
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

  const handleOptionClick = (option: ChoiceOption) => {
    if (state === 'completed' || state === 'exiting') return;
    
    // If allowChange is false and we already selected, do nothing
    if (definition.allowChange === false && selectedOptionId !== null) return;

    setSelectedOptionId(option.id);
    onSelect?.(option);
    onInteraction?.({ 
      type: 'option_selected', 
      choiceId: definition.id, 
      optionId: option.id 
    });

    if (definition.mode === 'confirm') {
      setState('confirming');
    } else {
      // Instant mode
      setState('selected');
      
      // Prevent double callbacks
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
      
      completionTimerRef.current = setTimeout(() => {
        completeChoice(option);
      }, 350); // 250-450ms pause
    }
  };

  const handleConfirm = () => {
    if (state !== 'confirming' || !selectedOptionId) return;
    
    const option = definition.options.find(o => o.id === selectedOptionId);
    if (option) {
      completeChoice(option);
    }
  };

  const completeChoice = (option: ChoiceOption) => {
    if (hasCompleted) return;
    
    setHasCompleted(true);
    setState('completed');
    onInteraction?.({ 
      type: 'choice_completed', 
      choiceId: definition.id, 
      optionId: option.id 
    });
    
    onComplete?.({
      choiceId: definition.id,
      optionId: option.id,
      value: option.value,
      action: option.action
    });
  };

  // Reset internal state when hidden
  useEffect(() => {
    if (state === 'hidden') {
      setSelectedOptionId(null);
      setHasCompleted(false);
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    }
  }, [state]);

  // Keyboard navigation
  useEffect(() => {
    if (state !== 'active' && state !== 'confirming' && state !== 'selected') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = definition.options.findIndex(o => o.id === selectedOptionId);
        let nextIndex = 0;
        
        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex + 1 >= definition.options.length ? 0 : currentIndex + 1;
        } else {
          nextIndex = currentIndex - 1 < 0 ? definition.options.length - 1 : currentIndex - 1;
        }
        
        const nextOption = definition.options[nextIndex];
        if (nextOption && (definition.allowChange !== false || selectedOptionId === null)) {
          handleOptionClick(nextOption);
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (state === 'confirming') {
          handleConfirm();
        } else if (selectedOptionId) {
          const option = definition.options.find(o => o.id === selectedOptionId);
          if (option && definition.mode !== 'confirm') {
             // Already triggered in handleOptionClick for instant mode
          }
        }
      } else if (e.key === 'Escape' && closeBehavior === 'allow') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, selectedOptionId, definition.options, definition.mode, definition.allowChange, closeBehavior]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/90 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          {/* Cinematographic Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black pointer-events-none" />
          
          <div className="relative w-full max-w-lg px-6 py-12 flex flex-col items-center justify-center min-h-[100dvh]">
            
            {/* Question Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="text-center mb-12 w-full"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
                {definition.title}
              </h2>
              {definition.subtitle && (
                <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                  {definition.subtitle}
                </p>
              )}
            </motion.div>

            {/* Options List */}
            <div className="w-full space-y-4 mb-12" role="listbox">
              {definition.options.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: 0.16 + (index * 0.05), // Stagger: 160ms, 210ms, 260ms, 310ms
                    ease: "easeOut" 
                  }}
                  onClick={() => handleOptionClick(option)}
                  disabled={state === 'completed' || (definition.allowChange === false && selectedOptionId !== null && selectedOptionId !== option.id)}
                  className={cn(
                    "w-full text-left p-5 rounded-2xl border transition-all duration-200 group relative",
                    "bg-zinc-900/50 border-white/5",
                    "hover:bg-zinc-800/60 hover:border-white/10 active:scale-[0.98]",
                    selectedOptionId === option.id && "bg-zinc-100 border-white ring-2 ring-white/20",
                    (definition.allowChange === false && selectedOptionId !== null && selectedOptionId !== option.id) && "opacity-40 grayscale pointer-events-none"
                  )}
                  role="option"
                  aria-selected={selectedOptionId === option.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className={cn(
                        "block font-semibold text-lg transition-colors",
                        selectedOptionId === option.id ? "text-zinc-950" : "text-zinc-200 group-hover:text-white"
                      )}>
                        {option.label}
                      </span>
                      {option.description && (
                        <span className={cn(
                          "block text-sm mt-1 transition-colors leading-snug",
                          selectedOptionId === option.id ? "text-zinc-600" : "text-zinc-500 group-hover:text-zinc-400"
                        )}>
                          {option.description}
                        </span>
                      )}
                    </div>
                    
                    {selectedOptionId === option.id && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mt-1"
                      >
                        <Check className="w-5 h-5 text-zinc-950" />
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Confirm Button for Confirm Mode */}
            {definition.mode === 'confirm' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: selectedOptionId ? 1 : 0, 
                  y: selectedOptionId ? 0 : 10 
                }}
                className="w-full"
              >
                <button
                  onClick={handleConfirm}
                  disabled={!selectedOptionId || state === 'completed'}
                  className={cn(
                    "w-full py-4 rounded-full font-bold text-lg transition-all duration-300",
                    "bg-white text-zinc-950 shadow-xl shadow-white/10",
                    "hover:bg-zinc-200 active:scale-95 disabled:opacity-0 disabled:pointer-events-none"
                  )}
                >
                  Continuar
                </button>
              </motion.div>
            )}

            {/* Close button for Dev Lab (Exit Preview) */}
            {closeBehavior === 'allow' && (
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
