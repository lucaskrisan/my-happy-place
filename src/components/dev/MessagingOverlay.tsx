import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  MoreVertical, 
  Phone, 
  Video, 
  Mic, 
  Play, 
  Pause, 
  Check, 
  CheckCheck,
  Circle
} from 'lucide-react';
import { ChatMessage, VoiceOnceState } from '@/types/messaging';
import { cn } from '@/lib/utils';

interface MessagingOverlayProps {
  open: boolean;
  contactName: string;
  contactSubtitle?: string;
  contactAvatar?: string;
  messages: ChatMessage[];
  progressiveReveal?: boolean;
  preserveStateOnClose?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  onMessageRevealed?: (messageId: string) => void;
  onVoiceStart?: (messageId: string) => void;
  onVoiceEnd?: (messageId: string) => void;
  onInteraction?: (event: { type: string; messageId?: string; data?: any }) => void;
  onComplete?: () => void;
}

export function MessagingOverlay({
  open,
  contactName,
  contactSubtitle = 'online',
  contactAvatar,
  messages,
  progressiveReveal = true,
  preserveStateOnClose = true,
  onClose,
  onOpen,
  onMessageRevealed,
  onVoiceStart,
  onVoiceEnd,
  onInteraction,
  onComplete
}: MessagingOverlayProps) {
  const [visibleMessageIds, setVisibleMessageIds] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [voiceStates, setVoiceStates] = useState<Record<string, VoiceOnceState>>({});
  const [conversationState, setConversationState] = useState<'closed' | 'opening' | 'active' | 'completed'>('closed');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);

  // Cleanup timers
  const clearTimers = () => {
    timersRef.current.forEach(timer => window.clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => {
    if (open) {
      setConversationState('opening');
      onOpen?.();
      onInteraction?.({ type: 'conversation_opened' });
      
      const timer = window.setTimeout(() => {
        setConversationState('active');
        startMessageReveal();
      }, 300);
      timersRef.current.push(timer);
    } else {
      setConversationState('closed');
      if (!preserveStateOnClose) {
        resetConversation();
      }
      onInteraction?.({ type: 'conversation_closed' });
    }

    return () => clearTimers();
  }, [open]);

  const resetConversation = () => {
    setVisibleMessageIds(new Set());
    setVoiceStates({});
    setIsTyping(false);
    clearTimers();
  };

  const startMessageReveal = async () => {
    if (!progressiveReveal) {
      const allIds = new Set(messages.map(m => m.id));
      setVisibleMessageIds(allIds);
      checkCompletion(allIds, voiceStates);
      return;
    }

    let currentVisible = new Set(visibleMessageIds);
    
    for (const msg of messages) {
      if (currentVisible.has(msg.id)) continue;

      if (msg.sender === 'contact') {
        setIsTyping(true);
        onInteraction?.({ type: 'typing_started' });
        await new Promise(resolve => {
          const t = window.setTimeout(resolve, 1000);
          timersRef.current.push(t);
        });
        setIsTyping(false);
        onInteraction?.({ type: 'typing_ended' });
      }

      const delay = msg.delay || 500;
      await new Promise(resolve => {
        const t = window.setTimeout(resolve, delay);
        timersRef.current.push(t);
      });

      currentVisible = new Set([...currentVisible, msg.id]);
      setVisibleMessageIds(currentVisible);
      onMessageRevealed?.(msg.id);
      onInteraction?.({ type: 'message_revealed', messageId: msg.id });
      
      // Auto-scroll
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
    
    checkCompletion(currentVisible, voiceStates);
  };

  const checkCompletion = (visible: Set<string>, voices: Record<string, VoiceOnceState>) => {
    const allVisible = messages.every(m => visible.has(m.id));
    const voiceOnceMessages = messages.filter(m => m.type === 'voice_once');
    const allVoiceOnceConsumed = voiceOnceMessages.every(m => voices[m.id] === 'consumed');
    
    if (allVisible && allVoiceOnceConsumed) {
      setConversationState('completed');
      onComplete?.();
      onInteraction?.({ type: 'conversation_completed' });
    }
  };

  const handleVoiceStateChange = (messageId: string, state: VoiceOnceState) => {
    const newStates = { ...voiceStates, [messageId]: state };
    setVoiceStates(newStates);
    checkCompletion(visibleMessageIds, newStates);
  };

  if (!open && conversationState === 'closed') return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col font-sans overflow-hidden"
      style={{ height: '100dvh' }}
    >
      {/* Header */}
      <div className="bg-[#202c33] text-[#e9edef] px-5 py-4 flex items-center gap-4 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-[#313d45]">
        <button onClick={onClose} className="p-1 -ml-2 text-[#8696a0]">
          <ArrowLeft size={28} />
        </button>
        <div className="w-[52px] h-[52px] rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
          {contactAvatar ? (
            <img src={contactAvatar} alt={contactName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500">
              <Circle size={28} fill="currentColor" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[1.15rem] leading-tight truncate">{contactName}</h2>
          <p className="text-[0.85rem] text-[#8696a0] truncate mt-0.5">{isTyping ? 'digitando...' : contactSubtitle}</p>
        </div>
        <div className="flex items-center gap-6 text-[#8696a0]">
          <Video size={24} />
          <Phone size={24} />
          <MoreVertical size={24} />
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-[#0b141a] p-5 flex flex-col gap-3 bg-[url('https://w0.peakpx.com/wallpaper/580/650/HD-wallpaper-whatsapp-dark-background-w-whatsapp-black.jpg')] bg-repeat bg-contain"
      >
        <AnimatePresence initial={false}>
          {messages.filter(m => visibleMessageIds.has(m.id)).map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              voiceState={voiceStates[msg.id] || (msg.type === 'voice_once' ? 'ready' : 'ready')}
              onVoiceStateChange={(state) => handleVoiceStateChange(msg.id, state)}
              onVoiceStart={() => onVoiceStart?.(msg.id)}
              onVoiceEnd={() => onVoiceEnd?.(msg.id)}
              onInteraction={(type, data) => onInteraction?.({ type, messageId: msg.id, data })}
            />
          ))}
        </AnimatePresence>
        
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="self-start bg-[#202c33] text-[#e9edef] px-4 py-2.5 rounded-xl rounded-tl-none text-[15px]"
          >
            <div className="flex gap-1.5">
              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.6 }}>•</motion.span>
              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}>•</motion.span>
              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}>•</motion.span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-[#202c33] p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] flex items-center gap-3">
        <div className="flex-1 bg-[#2a3942] rounded-full px-5 py-3 text-[#8696a0] text-[1.05rem]">
          Mensagem
        </div>
        <button className="w-14 h-14 rounded-full bg-[#00a884] flex items-center justify-center text-white flex-shrink-0 shadow-lg">
          <Mic size={28} />
        </button>
      </div>
    </motion.div>
  );
}

function MessageBubble({ 
  message, 
  voiceState, 
  onVoiceStateChange,
  onVoiceStart,
  onVoiceEnd,
  onInteraction
}: { 
  message: ChatMessage; 
  voiceState: VoiceOnceState;
  onVoiceStateChange: (state: VoiceOnceState) => void;
  onVoiceStart: () => void;
  onVoiceEnd: () => void;
  onInteraction: (type: string, data?: any) => void;
}) {
  const isContact = message.sender === 'contact';
  
  if (message.type === 'system') {
    return (
      <div className="self-center my-2 bg-[#182229] text-[#8696a0] px-3 py-1 rounded text-xs uppercase tracking-wider">
        {message.text}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "max-w-[85%] rounded-lg px-2 py-1 relative text-[#e9edef] text-[15px] shadow-sm",
        isContact ? "self-start bg-[#202c33] rounded-tl-none" : "self-end bg-[#005c4b] rounded-tr-none"
      )}
    >
      {message.type === 'text' && (
        <div className="pr-12 py-1 leading-tight">
          {message.text}
        </div>
      )}

      {(message.type === 'voice' || message.type === 'voice_once') && (
        <VoiceMessageBubble 
          message={message}
          state={voiceState}
          onStateChange={onVoiceStateChange}
          onVoiceStart={onVoiceStart}
          onVoiceEnd={onVoiceEnd}
          onInteraction={onInteraction}
        />
      )}

      <div className={cn(
        "text-[10px] text-[#8696a0] absolute right-2 bottom-1 flex items-center gap-1",
        !isContact && "text-[#ffffff99]"
      )}>
        {message.timestamp || '22:15'}
        {!isContact && <CheckCheck size={14} className="text-[#53bdeb]" />}
      </div>
    </motion.div>
  );
}

function VoiceMessageBubble({ 
  message, 
  state, 
  onStateChange,
  onVoiceStart,
  onVoiceEnd,
  onInteraction
}: { 
  message: ChatMessage; 
  state: VoiceOnceState;
  onStateChange: (state: VoiceOnceState) => void;
  onVoiceStart: () => void;
  onVoiceEnd: () => void;
  onInteraction: (type: string, data?: any) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const isOnce = message.type === 'voice_once';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      onStateChange('consumed');
      onVoiceEnd();
      onInteraction('voice_consumed');
      setProgress(100);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.pause();
    };
  }, []);

  // Sync state with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (state === 'playing') {
      audio.play().catch(err => {
        console.error("Audio playback error:", err);
        onStateChange('error');
      });
    } else if (state === 'paused' || state === 'consumed') {
      audio.pause();
    }
  }, [state]);

  const togglePlay = () => {
    if (state === 'consumed') return;
    
    if (state === 'playing') {
      onStateChange('paused');
      onInteraction('voice_paused');
    } else {
      onStateChange('playing');
      onVoiceStart();
      onInteraction('voice_started');
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isOnce) {
    return (
      <div className="min-w-[200px] py-2 px-1 flex items-center gap-3">
        <audio ref={audioRef} src={message.audioSrc || undefined} />

        
        <button 
          onClick={togglePlay}
          disabled={state === 'consumed'}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
            state === 'consumed' ? "bg-zinc-800 text-zinc-600" : "bg-[#005c4b] text-[#e9edef] hover:bg-[#007a64]"
          )}
        >
          {state === 'playing' ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Mic size={16} className={cn(state === 'consumed' ? "text-zinc-500" : "text-[#53bdeb]")} />
            <span>{state === 'consumed' ? 'Ouvida' : 'Mensagem de voz'}</span>
            {isOnce && state !== 'consumed' && (
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1 rounded border border-zinc-700">1</span>
            )}
          </div>
          
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden w-full relative">
            <motion.div 
              className="absolute inset-y-0 left-0 bg-[#53bdeb]" 
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-[#8696a0]">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || message.duration || 0)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Regular Voice Message
  return (
    <div className="min-w-[220px] py-2 px-1 flex items-center gap-3">
      <audio ref={audioRef} src={message.audioSrc || undefined} />
      
      <button 
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-[#005c4b] text-[#e9edef] flex items-center justify-center flex-shrink-0"
      >
        {state === 'playing' ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
      </button>

      <div className="flex-1">
        <div className="flex items-center gap-1 mb-1">
          {Array.from({ length: 15 }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "w-0.5 bg-[#8696a0] rounded-full",
                i < (progress / 100) * 15 ? "bg-[#53bdeb]" : "bg-[#8696a0]"
              )}
              style={{ height: `${Math.random() * 15 + 5}px` }}
            />
          ))}
        </div>
        <div className="text-[10px] text-[#8696a0]">
          {formatTime(currentTime)} / {formatTime(duration || message.duration || 0)}
        </div>
      </div>
    </div>
  );
}
