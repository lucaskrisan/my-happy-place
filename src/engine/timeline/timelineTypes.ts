export type EventStatus = 'armed' | 'fired' | 'active' | 'completed' | 'skipped';

export type TimelineEvent = {
  id: string;
  type: string;
  at: number;
  blocking?: boolean;
  payload?: Record<string, any>;
  status?: EventStatus;
};

export interface TimelineConfig {
  events: TimelineEvent[];
}

export type EngineEventCallback = (event: TimelineEvent) => void;

export interface TimelineEngineState {
  events: TimelineEvent[];
  lastTime: number;
  blockingEventId: string | null;
}
