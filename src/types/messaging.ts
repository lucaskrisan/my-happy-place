export type ChatMessage = {
  id: string;
  type: 'text' | 'voice' | 'voice_once' | 'system';
  sender: 'contact' | 'user';
  text?: string | null;
  audioSrc?: string | null;
  timestamp?: string | null;
  delay?: number | null;
  duration?: number | null;
  once?: boolean | null;
};

export type VoiceOnceState = 'unopened' | 'ready' | 'playing' | 'paused' | 'consumed' | 'error';

