import { TimelineEvent } from '../timeline/timelineTypes';

export type SceneState = 'idle' | 'loading' | 'ready' | 'playing' | 'blocked' | 'completing' | 'completed' | 'error';

export type InteractionType = 'incoming_call' | 'messaging' | 'choice';

export type InteractionDefinition = {
  id: string;
  type: InteractionType;
  payload: {
    definition?: any;
    interactionId?: string;
  };
};

export type InteractionAction =
  | { type: 'open_interaction'; interactionId: string }
  | { type: 'complete_scene' }
  | { type: 'go_to_scene'; sceneId: string };

export type SceneCompletionRule = {
  type: 'video_ended' | 'manual';
};

export type SceneDefinition = {
  id: string;
  title?: string;
  video?: {
    src?: string;
    poster?: string;
    autoplay?: boolean;
    muted?: boolean;
  };
  events: TimelineEvent[];
  interactions?: Record<string, InteractionDefinition>;
  completion?: SceneCompletionRule;
  nextSceneId?: string | null;
};

export type SceneRuntimeState = {
  sceneId: string;
  state: SceneState;
  currentTime: number;
  activeInteraction: InteractionDefinition | null;
  activeNotificationId: string | null;
  videoPausedAt: number | null;
  lastAction: InteractionAction | null;
  error?: string;
};
