import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Mic, Grid, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CallState = 'idle' | 'incoming' | 'connecting' | 'active' | 'ended' | 'declined';

interface IncomingCallOverlayProps {
  open: boolean;
  callerName: string;
  callerSubtitle?: string;
  callerAvatar?: string;
  ringtoneSrc?: string;
  voiceAudioSrc?: string;
  onAccept?: () => void;
  onDecline?: () => void;
  onEnd?: () => void;
  autoEndAfterAudio?: boolean;
}

export function IncomingCallOverlay({
  open,
  callerName,
  callerSubtitle = "Ligação recebida",
  callerAvatar,
  ringtoneSrc,
  voiceAudioSrc,
  onAccept,
  onDecline,
  onEnd,
  autoEndAfterAudio = true,
}: IncomingCallOverlayProps) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [duration, setDuration] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const durationTimerRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    console.log("Cleaning up IncomingCallOverlay...");
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current = null;
    }
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.currentTime = 0;
      voiceAudioRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0);
    }
  }, []);

  const startIncomingSequence = useCallback(() => {
    setIsVisible(true);
    setCallState('idle'); // Start from fresh state
    
    // 0ms: overlay appears (handled by isVisible)
    
    // 300ms: vibration and state change
    timerRef.current = window.setTimeout(() => {
      setCallState('incoming');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([500, 500]); 
      }
    }, 300);

    // 400ms: ringtone
    timerRef.current = window.setTimeout(() => {
      if (ringtoneSrc) {
        ringtoneRef.current = new Audio(ringtoneSrc);
        ringtoneRef.current.loop = true;
        ringtoneRef.current.play().catch(e => console.warn("Ringtone playback blocked:", e));
      }
    }, 400);
  }, [ringtoneSrc]);

  // Sync internal state with open prop
  useEffect(() => {
    if (open) {
      startIncomingSequence();
    } else {
      cleanup();
      setCallState('idle');
      setIsVisible(false);
    }
  }, [open, startIncomingSequence, cleanup]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const startDurationTimer = () => {
    setDuration(0);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    durationTimerRef.current = window.setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
  };

  const handleAccept = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0);
    }
    
    setCallState('connecting');
    onAccept?.();

    // 600ms: transition to active
    timerRef.current = window.setTimeout(() => {
      setCallState('active');
      startDurationTimer();
      
      // 250ms delay before voice audio
      timerRef.current = window.setTimeout(() => {
        if (voiceAudioSrc) {
          voiceAudioRef.current = new Audio(voiceAudioSrc);
          voiceAudioRef.current.play().catch(e => console.warn("Voice audio playback blocked:", e));
          
          voiceAudioRef.current.onended = () => {
            if (autoEndAfterAudio) {
              timerRef.current = window.setTimeout(() => {
                handleEnd();
              }, 400);
            }
          };
        } else {
          console.log("Nenhum voiceAudioSrc configurado");
        }
      }, 250);
    }, 600);
  };

  const handleDecline = () => {
    cleanup();
    setCallState('declined');
    onDecline?.();
    
    timerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      setCallState('idle');
    }, 500);
  };

  const handleEnd = () => {
    cleanup();
    setCallState('ended');
    onEnd?.();
    
    timerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      setCallState('idle');
    }, 700);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-black/40 backdrop-blur-xl transition-all duration-500 font-sans text-white pb-[env(safe-area-inset-bottom,2rem)] pt-[env(safe-area-inset-top,2rem)] overflow-hidden",
      callState === 'idle' ? "opacity-0" : "opacity-100"
    )}>
      {/* Background Vibration Effect */}
      {callState === 'incoming' && (
        <div className="absolute inset-0 pointer-events-none animate-subtle-shake opacity-20" />
      )}

      {/* Header Info */}
      <div className={cn(
        "flex flex-col items-center mt-12 transition-all duration-700",
        callState === 'idle' ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
      )}>
        {/* Avatar */}
        <div className={cn(
          "w-32 h-32 rounded-full mb-6 overflow-hidden border-2 border-white/10 shadow-2xl relative",
          callState === 'incoming' && "animate-pulse-subtle"
        )}>
          {callerAvatar ? (
            <img src={callerAvatar} alt={callerName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
              <span className="text-4xl font-light text-white/50">{callerName.charAt(0)}</span>
            </div>
          )}
        </div>

        <h2 className="text-3xl font-medium tracking-tight mb-1">{callerName}</h2>
        
        <p className={cn(
          "text-sm font-medium text-white/60 tracking-wide uppercase",
          callState === 'active' && "text-white/80"
        )}>
          {callState === 'incoming' && callerSubtitle}
          {callState === 'connecting' && "conectando..."}
          {callState === 'active' && formatDuration(duration)}
          {callState === 'ended' && "Ligação encerrada"}
          {callState === 'declined' && "Chamada recusada"}
        </p>
      </div>

      {/* Middle Controls (Active Only) */}
      {callState === 'active' && (
        <div className="grid grid-cols-3 gap-8 w-full max-w-xs px-4 animate-fade-in">
          {[
            { icon: Mic, label: 'mudo' },
            { icon: Grid, label: 'teclado' },
            { icon: Volume2, label: 'áudio' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2 opacity-40 cursor-not-allowed">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <item.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase tracking-widest">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="w-full px-12 mb-12 flex justify-between items-center max-w-md">
        {callState === 'incoming' ? (
          <>
            <button
              onClick={handleDecline}
              className="group flex flex-col items-center gap-3 transition-transform active:scale-95 duration-200"
            >
              <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:bg-red-400 transition-colors">
                <PhoneOff className="w-8 h-8 rotate-[135deg] text-white" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/50">RECUSAR</span>
            </button>
            
            <button
              onClick={handleAccept}
              className="group flex flex-col items-center gap-3 transition-transform active:scale-95 duration-200"
            >
              <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:bg-green-400 transition-colors">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/50">ATENDER</span>
            </button>
          </>
        ) : (callState === 'active' || callState === 'connecting') && (
          <div className="w-full flex justify-center">
            <button
              onClick={handleEnd}
              className="group flex flex-col items-center gap-3 transition-transform active:scale-95 duration-200"
            >
              <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:bg-red-400 transition-colors">
                <PhoneOff className="w-8 h-8 text-white" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/50">ENCERRAR</span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes subtle-shake {
          0% { transform: translate(0, 0); }
          25% { transform: translate(1px, 1px); }
          50% { transform: translate(-1px, 0); }
          75% { transform: translate(1px, -1px); }
          100% { transform: translate(0, 0); }
        }
        .animate-subtle-shake {
          animation: subtle-shake 0.1s infinite;
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(1.02); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
