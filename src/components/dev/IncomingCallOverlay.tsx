import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Mic, Grid, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CallState = 'idle' | 'incoming' | 'connecting' | 'active' | 'ended' | 'declined';

export interface IncomingCallOverlayProps {
  open: boolean;
  callerName: string;
  callerSubtitle?: string;
  callerAvatar?: string | undefined;
  
  // Audio sources
  ringtoneSrc?: string | undefined;
  connectSfxSrc?: string | undefined;
  vibrationSrc?: string | undefined;
  voiceAudioSrc?: string | undefined;
  endSfxSrc?: string | undefined;
  
  // Volumes (0-1)
  ringtoneVolume?: number;
  voiceVolume?: number;
  sfxVolume?: number;
  
  autoEndAfterAudio?: boolean;
  
  // Callbacks
  onAccept?: () => void;
  onDecline?: () => void;
  onEnd?: () => void;
  onStateChange?: (state: CallState) => void;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
}

export function IncomingCallOverlay({
  open,
  callerName,
  callerSubtitle = "Ligação recebida",
  callerAvatar,
  ringtoneSrc,
  connectSfxSrc,
  vibrationSrc,
  voiceAudioSrc,
  endSfxSrc,
  ringtoneVolume = 0.7,
  voiceVolume = 1.0,
  sfxVolume = 0.75,
  onAccept,
  onDecline,
  onEnd,
  onStateChange,
  onVoiceStart,
  onVoiceEnd,
  autoEndAfterAudio = true,
}: IncomingCallOverlayProps) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [duration, setDuration] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  
  // Refs for audio elements
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const vibrationRef = useRef<HTMLAudioElement | null>(null);
  const connectSfxRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const endSfxRef = useRef<HTMLAudioElement | null>(null);
  
  const timerRef = useRef<number | null>(null);
  const durationTimerRef = useRef<number | null>(null);

  const updateState = useCallback((newState: CallState) => {
    setCallState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  const stopAllAudio = useCallback(() => {
    [ringtoneRef, vibrationRef, connectSfxRef, voiceAudioRef, endSfxRef].forEach(ref => {
      if (ref.current) {
        ref.current.pause();
        ref.current.currentTime = 0;
        ref.current.onended = null;
      }
    });
  }, []);

  const cleanup = useCallback(() => {
    stopAllAudio();
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
  }, [stopAllAudio]);

  const startIncomingSequence = useCallback(() => {
    setIsVisible(true);
    updateState('incoming');
    
    // Ringtone start
    if (ringtoneSrc) {
      const audio = new Audio(ringtoneSrc);
      audio.loop = true;
      audio.volume = ringtoneVolume;
      ringtoneRef.current = audio;
      audio.play().catch(e => console.warn("Ringtone playback blocked:", e));
    }

    // Vibration SFX start
    if (vibrationSrc) {
      const audio = new Audio(vibrationSrc);
      audio.loop = true;
      audio.volume = sfxVolume;
      vibrationRef.current = audio;
      audio.play().catch(e => console.warn("Vibration playback blocked:", e));
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([500, 500]); 
    }
  }, [ringtoneSrc, vibrationSrc, ringtoneVolume, sfxVolume, updateState]);

  // Sync internal state with open prop
  useEffect(() => {
    if (open) {
      startIncomingSequence();
    } else {
      cleanup();
      setIsVisible(false);
      setCallState('idle'); 
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
    // 1. Stop incoming signals immediately
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    if (vibrationRef.current) {
      vibrationRef.current.pause();
      vibrationRef.current.currentTime = 0;
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0);
    }
    
    updateState('connecting');
    onAccept?.();

    // 2. Play Connect SFX ONCE
    if (connectSfxSrc) {
      const audio = new Audio(connectSfxSrc);
      audio.volume = sfxVolume;
      connectSfxRef.current = audio;
      
      audio.onended = () => {
        // 3. After Connect SFX ends, transition to ACTIVE and play Voice ONCE
        updateState('active');
        startDurationTimer();
        
        if (voiceAudioSrc) {
          const vAudio = new Audio(voiceAudioSrc);
          vAudio.volume = voiceVolume;
          vAudio.preload = "auto";
          vAudio.onplay = () => {
            setIsVoicePlaying(true);
            onVoiceStart?.();
          };
          
          vAudio.onended = () => {
            setIsVoicePlaying(false);
            onVoiceEnd?.();
            // 4. After Voice ends, play End SFX ONCE
            if (endSfxSrc) {
              const eAudio = new Audio(endSfxSrc);
              eAudio.volume = sfxVolume;
              endSfxRef.current = eAudio;
              
              eAudio.onended = () => {
                // 5. After End SFX ends, fully close call
                handleEnd();
              };
              
              // Ensure we stop if endSfx fails
              eAudio.onerror = () => handleEnd();
              
              eAudio.play().catch(e => {
                console.warn("End SFX blocked:", e);
                handleEnd();
              });
            } else {
              handleEnd();
            }
          };
          
          vAudio.play().catch(e => console.warn("Voice audio blocked:", e));
        } else {
          // If no voice, go straight to end logic
          handleEnd();
        }
      };
      
      audio.play().catch(e => {
        console.warn("Connect SFX blocked:", e);
        // Fallback if blocked
        updateState('active');
        startDurationTimer();
      });
    } else {
      // If no connect SFX, immediate transition
      updateState('active');
      startDurationTimer();
    }
  };

  const handleDecline = () => {
    cleanup();
    updateState('declined');
    onDecline?.();
    
    timerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      updateState('idle');
    }, 500);
  };

  const handleEnd = () => {
    // Ensure all audio is paused
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      setIsVoicePlaying(false);
    }
    if (endSfxRef.current) endSfxRef.current.pause();

    if (durationTimerRef.current) clearInterval(durationTimerRef.current);

    // Enter ENDED state visually
    updateState("ended");

    // Callback onEnd is delayed until the user has seen the "Ligação encerrada" screen
    timerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      updateState("idle");
      onEnd?.();
    }, 900);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex flex-col items-center justify-between font-sans text-white pb-[env(safe-area-inset-bottom,2rem)] pt-[env(safe-area-inset-top,2rem)] overflow-hidden transition-all duration-700",
      callState === 'idle' ? "opacity-0 pointer-events-none" : "opacity-100",
      callState === 'incoming' && "animate-subtle-shake motion-reduce:animate-none bg-black/40 backdrop-blur-xl"
    )}>
      {/* Background Cinematic Visual for ACTIVE state */}
      {callState !== 'incoming' && (
        <div className="absolute inset-0 z-0">
          {/* Base cinematic background */}
          <div className="absolute inset-0 bg-zinc-950" />
          
          {/* Animated ambient gradients */}
          <div className="absolute inset-0 opacity-40 overflow-hidden">
            <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-zinc-800 rounded-full blur-[100px] animate-pulse-slow" />
            <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-zinc-900 rounded-full blur-[80px] animate-pulse-slow delay-700" />
          </div>

          {/* Optional Ambient Texture Overlay */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.03] pointer-events-none" />
          
          {/* Vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
          
          {/* Overall blur */}
          <div className="absolute inset-0 backdrop-blur-3xl" />
        </div>
      )}

      {/* Main Content Container */}
      <div className="relative z-10 w-full flex flex-col items-center justify-between h-full">
        <div className={cn(
          "flex flex-col items-center mt-12 transition-all duration-700 w-full",
          callState === 'idle' ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
        )}>
          {/* Avatar Area */}
          <div className={cn(
            "w-32 h-32 rounded-full mb-8 overflow-hidden border-2 border-white/10 shadow-2xl relative transition-all duration-500",
            callState === 'incoming' ? "animate-pulse-subtle scale-100" : "scale-110",
            callState === 'active' && isVoicePlaying && "ring-2 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse-green"
          )}>
            {callerAvatar ? (
              <img src={callerAvatar} alt={callerName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
                <span className="text-4xl font-light text-white/30 tracking-widest">{callerName.charAt(0)}</span>
              </div>
            )}
          </div>

          <h2 className="text-3xl font-medium tracking-tight mb-2 px-6 text-center">{callerName}</h2>
          
          <div className="flex flex-col items-center gap-1">
            <div className={cn(
              "text-xs font-medium tracking-widest uppercase transition-colors duration-300",
              callState === 'active' ? "text-emerald-500/80" : "text-white/40"
            )}>
              {callState === 'incoming' && (callerSubtitle || "CELULAR")}
              {callState === 'connecting' && "conectando..."}
              {callState === 'ended' && "Ligação encerrada"}
              {callState === 'declined' && "Chamada recusada"}
              
              {callState === 'active' && (
                <div className="flex flex-col items-center gap-4 animate-fade-in mt-1">
                  <div className="text-lg font-mono font-light tracking-tighter text-emerald-500/90">
                    {formatDuration(duration)}
                  </div>
                </div>
              )}
            </div>

            {callState === 'active' && (
              <div className="mt-8 flex flex-col items-center gap-4 w-full px-12">
                <div className={cn(
                  "flex items-center gap-3 transition-opacity duration-500",
                  isVoicePlaying ? "opacity-100" : "opacity-0"
                )}>
                  <Volume2 className="w-4 h-4 text-emerald-500" />
                  <div className="flex items-end gap-[3px] h-6">
                    {[...Array(15)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-[3px] bg-emerald-500 rounded-full transition-all duration-300",
                          isVoicePlaying ? "animate-waveform" : "h-[2px]"
                        )}
                        style={{
                          animationDelay: `${i * 0.05}s`,
                          height: isVoicePlaying ? `${20 + Math.random() * 80}%` : '2px',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
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
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">RECUSAR</span>
              </button>
              
              <button
                onClick={handleAccept}
                className="group flex flex-col items-center gap-3 transition-transform active:scale-95 duration-200"
              >
                <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center shadow-lg shadow-green-600/20 group-hover:bg-green-500 transition-colors">
                  <Phone className="w-8 h-8 text-white" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">ATENDER</span>
              </button>
            </>
          ) : (callState === "active" || callState === "connecting" || callState === "ended") && (
            <div
              className={cn(
                "w-full flex justify-center transition-opacity duration-500",
                callState === "ended" && "opacity-0 pointer-events-none"
              )}
            >
              <button
                onClick={handleEnd}
                className="group flex flex-col items-center gap-4 transition-transform active:scale-95 duration-200"
              >
                <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:bg-red-500 transition-colors">
                  <PhoneOff className="w-8 h-8 text-white" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">ENCERRAR</span>
              </button>
            </div>
          )}
        </div>
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
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 10px rgba(16,185,129,0.3); }
          50% { box-shadow: 0 0 20px rgba(16,185,129,0.6); }
        }
        .animate-pulse-green {
          animation: pulse-green 2s ease-in-out infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes waveform {
          0%, 100% { height: 4px; }
          50% { height: 100%; }
        }
        .animate-waveform {
          animation: waveform 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
