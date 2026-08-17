export type ChatMessage = {
  id: string;
  type: 'text' | 'voice' | 'voice_once' | 'system';
  sender: 'contact' | 'user';
  text?: string;
  audioSrc?: string;
  timestamp?: string;
  delay?: number;
  duration?: number;
  once?: boolean;
};

export type VoiceOnceState = 'unopened' | 'ready' | 'playing' | 'paused' | 'consumed' | 'error';
