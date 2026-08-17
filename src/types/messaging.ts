export type ChatMessage = {
  id: string;
  type: 'text' | 'voice' | 'voice_once' | 'system';
  sender: 'contact' | 'user';
  text?: string | null | undefined;
  audioSrc?: string | null | undefined;
  timestamp?: string | null | undefined;
  delay?: number | null | undefined;
  duration?: number | null | undefined;
  once?: boolean | null | undefined;
};

export type VoiceOnceState = 'unopened' | 'ready' | 'playing' | 'paused' | 'consumed' | 'error';


