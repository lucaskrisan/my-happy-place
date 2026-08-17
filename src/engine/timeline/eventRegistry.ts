import { TimelineEvent } from './timelineTypes';

export type EventHandler = {
  isBlocking: boolean;
};

const registry: Record<string, EventHandler> = {
  'incoming_call': { isBlocking: true },
  'text_reveal': { isBlocking: false },
  'play_sfx': { isBlocking: false },
  'whatsapp_open': { isBlocking: true },
  'notification': { isBlocking: false },
  'choice': { isBlocking: true },
};


export function getEventHandler(type: string): EventHandler | undefined {
  return registry[type];
}

export function isEventBlocking(type: string): boolean {
  return registry[type]?.isBlocking ?? false;
}
