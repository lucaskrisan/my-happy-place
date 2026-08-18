import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Bell } from 'lucide-react';

export type NotificationState = 'hidden' | 'entering' | 'visible' | 'pressed' | 'dismissing' | 'dismissed';

export interface NotificationInteractionEvent {
  type: 'notification_opened' | 'notification_visible' | 'notification_tapped' | 'notification_swiped' | 'notification_auto_dismissed' | 'notification_dismissed';
  data?: any;
}

export interface NotificationOverlayProps {
  open: boolean;
  appName?: string;
  senderName?: string;
  message?: string;
  avatar?: string;
  timestamp?: string;
  soundSrc?: string | undefined;
  autoDismiss?: boolean;
  autoDismissMs?: number;
  onOpen?: () => void;
  onTap?: () => void;
  onDismiss?: () => void;
  onStateChange?: (state: NotificationState) => void;
  onInteraction?: (event: NotificationInteractionEvent) => void;
}

export const NotificationOverlay: React.FC<NotificationOverlayProps> = ({
  open,
  appName = 'Mensagens',
  senderName = 'Mamãe',
  message = 'Preciso te mandar uma coisa.',
  avatar,
  timestamp = 'agora',
  soundSrc,
  autoDismiss = true,
  autoDismissMs = 5000,
  onOpen,
  onTap,
  onDismiss,
  onStateChange,
  onInteraction,
}) => {
  const [state, setState] = useState<NotificationState>('hidden');
  const [swipeOffset, setSwipeOffset] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const enteringTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartY = useRef<number | null>(null);
  const isDragging = useRef(false);
  const previousOpenRef = useRef(open);

  const updateState = useCallback((newState: NotificationState) => {
    setState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  const emit = useCallback((type: NotificationInteractionEvent['type'], data?: any) => {
    onInteraction?.({ type, data });
  }, [onInteraction]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleDismiss = useCallback(() => {
    clearTimer();
    updateState('dismissing');
    emit('notification_dismissed');
    setTimeout(() => {
      updateState('dismissed');
      onDismiss?.();
    }, 300);
  }, [clearTimer, updateState, emit, onDismiss]);

  const handleTap = useCallback(() => {
    clearTimer();
    updateState('pressed');
    emit('notification_tapped');
    onTap?.();
    setTimeout(() => {
      handleDismiss();
    }, 100);
  }, [clearTimer, updateState, emit, onTap, handleDismiss]);

  // Handle incoming open prop - ROBUST LIFECYCLE
  useEffect(() => {
    // Detect open false -> true
    if (open && !previousOpenRef.current) {
      if (enteringTimerRef.current) clearTimeout(enteringTimerRef.current);
      
      updateState('entering');
      emit('notification_opened');
      onOpen?.();

      // Sound handling - strictly once on open
      if (soundSrc) {
        if (!audioRef.current) {
          audioRef.current = new Audio(soundSrc);
        } else if (audioRef.current.src !== soundSrc) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.src = soundSrc;
        }
        audioRef.current.play().catch(e => console.warn('Notification audio blocked:', e));
      }

      enteringTimerRef.current = setTimeout(() => {
        updateState('visible');
        emit('notification_visible');
        enteringTimerRef.current = null;
      }, 250);
    } 
    // Detect open true -> false
    else if (!open && previousOpenRef.current) {
      if (enteringTimerRef.current) {
        clearTimeout(enteringTimerRef.current);
        enteringTimerRef.current = null;
      }
      handleDismiss();
    }

    previousOpenRef.current = open;
  }, [open, soundSrc, handleDismiss, updateState, emit, onOpen]);


  // Auto-dismiss logic
  useEffect(() => {
    if (state === 'visible' && autoDismiss) {
      clearTimer();
      timerRef.current = setTimeout(() => {
        emit('notification_auto_dismissed');
        handleDismiss();
      }, autoDismissMs);
    }

    return () => clearTimer();
  }, [state, autoDismiss, autoDismissMs, handleDismiss, clearTimer, emit]);

  // Audio cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      if (enteringTimerRef.current) {
        clearTimeout(enteringTimerRef.current);
      }
      clearTimer();
    };
  }, [clearTimer]);

  // Pointer events for swipe
  const onPointerDown = (e: React.PointerEvent) => {
    if (state !== 'visible') return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStartY.current = e.clientY;
    isDragging.current = true;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || dragStartY.current === null) return;
    const offset = e.clientY - dragStartY.current;
    // Only allow swiping up
    if (offset < 0) {
      setSwipeOffset(offset);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    const threshold = -40;
    if (swipeOffset < threshold) {
      emit('notification_swiped');
      handleDismiss();
    } else {
      // Smooth return
      setSwipeOffset(0);
    }
    dragStartY.current = null;
  };

  if (state === 'hidden' || (state === 'dismissed' && !open)) return null;

  const getStyle = () => {
    const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    let transform = `translateY(${swipeOffset}px)`;
    let opacity = 1;

    if (state === 'entering') {
      transform = isReduced ? 'translateY(0)' : 'translateY(-20px)';
      opacity = 0;
    } else if (state === 'dismissing') {
      transform = isReduced ? 'translateY(0)' : 'translateY(-100%)';
      opacity = 0;
    } else if (state === 'pressed') {
      transform = 'scale(0.98)';
    }

    return {
      transform,
      opacity,
      transition: isDragging.current ? 'none' : 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      paddingTop: 'env(safe-area-inset-top, 20px)',
    };
  };

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none p-4"
      style={{ top: 0 }}
    >
      <div
        role="button"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleTap();
          }
        }}
        onClick={(e) => {
          // Prevent tap if it was a significant swipe
          if (Math.abs(swipeOffset) < 5) {
            handleTap();
          }
        }}
        className={cn(
          "w-full max-w-[400px] pointer-events-auto cursor-pointer select-none overflow-hidden",
          "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl rounded-[24px]",
          "flex flex-col p-4 space-y-2"
        )}
        style={getStyle()}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
              <Bell className="w-3 h-3 text-zinc-500" />
            </div>
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">
              {appName}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            {timestamp}
          </span>
        </div>

        <div className="flex items-start gap-3">
          {avatar ? (
            <img 
              src={avatar} 
              alt={senderName} 
              className="w-10 h-10 rounded-full object-cover shadow-sm flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex-shrink-0 shadow-sm" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
              {senderName}
            </span>
            <p className="text-[14px] text-zinc-600 dark:text-zinc-300 leading-snug line-clamp-2">
              {message}
            </p>
          </div>
        </div>

        {/* Home Indicator like bar for swipe hint */}
        <div className="w-10 h-1 bg-zinc-300/50 dark:bg-zinc-700/50 rounded-full self-center mt-1" />
      </div>
    </div>
  );
};
