import { TimelineEvent, EventStatus } from './timelineTypes';
import { isEventBlocking } from './eventRegistry';

export class TimelineEngine {
  private events: TimelineEvent[] = [];
  private lastTime: number = 0;
  private activeBlockingEventId: string | null = null;

  constructor(events: TimelineEvent[]) {
    this.setEvents(events);
  }

  public setEvents(events: TimelineEvent[]) {
    // Sort events by time 'at', then non-blocking before blocking
    this.events = [...events].sort((a, b) => {
      if (a.at !== b.at) return a.at - b.at;
      const aBlocking = isEventBlocking(a.type);
      const bBlocking = isEventBlocking(b.type);
      if (aBlocking && !bBlocking) return 1;
      if (!aBlocking && bBlocking) return -1;
      return 0;
    }).map(e => ({ ...e, status: e.status || 'armed' }));
  }

  public process(currentTime: number, isPlaying: boolean): { 
    triggered: TimelineEvent[], 
    pauseRequired: boolean 
  } {
    const triggered: TimelineEvent[] = [];
    let pauseRequired = false;

    // If we have an active blocking event, we don't process new time-based triggers
    if (this.activeBlockingEventId) {
      this.lastTime = currentTime;
      return { triggered: [], pauseRequired: false };
    }

    // Detect events that crossed the timestamp
    // Support forward seek: process all events between lastTime and currentTime
    for (const event of this.events) {
      if (event.status === 'armed') {
        const crossed = (this.lastTime < event.at && currentTime >= event.at);
        
        if (crossed) {
          event.status = 'fired';
          triggered.push(event);

          if (isEventBlocking(event.type)) {
            event.status = 'active';
            this.activeBlockingEventId = event.id;
            pauseRequired = true;
            // Stop processing further events in this tick if we hit a blocking one
            break;
          } else {
            // Non-blocking events are completed immediately by default in the engine logic
            // The UI layer might manage their visual lifecycle
            event.status = 'completed';
          }
        }
      }
    }

    this.lastTime = currentTime;
    return { triggered, pauseRequired };
  }

  public completeEvent(eventId: string) {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      event.status = 'completed';
      if (this.activeBlockingEventId === eventId) {
        this.activeBlockingEventId = null;
      }
    }
  }

  public skipEvent(eventId: string) {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      event.status = 'skipped';
      if (this.activeBlockingEventId === eventId) {
        this.activeBlockingEventId = null;
      }
    }
  }


  public rearmEvent(eventId: string) {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      event.status = 'armed';
      if (this.activeBlockingEventId === eventId) {
        this.activeBlockingEventId = null;
      }
    }
  }

  public rearmAll() {
    this.events.forEach(e => {
      e.status = 'armed';
    });
    this.activeBlockingEventId = null;
  }

  public reset(newTime: number = 0) {
    this.rearmAll();
    this.lastTime = newTime;
  }

  public getEvents() {
    return this.events;
  }

  public getActiveBlockingEventId() {
    return this.activeBlockingEventId;
  }
}
