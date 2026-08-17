import { TimelineEngine } from '../timeline/timelineEngine';
import { TimelineEvent } from '../timeline/timelineTypes';
import { 
  SceneDefinition, 
  SceneRuntimeState, 
  SceneState, 
  InteractionAction,
  InteractionDefinition
} from './sceneTypes';
import { resolveInteraction, processInteractionAction } from './interactionResolver';

export type SceneEngineCallback = (state: SceneRuntimeState, log?: string) => void;

/**
 * SceneEngine orchestrates video, timeline, and interactions.
 * It is independent of React and UI components.
 */
export class SceneEngine {
  private definition: SceneDefinition;
  private runtime: SceneRuntimeState;
  private timelineEngine: TimelineEngine;
  private onStateChange: SceneEngineCallback;
  
  constructor(definition: SceneDefinition, onStateChange: SceneEngineCallback) {
    this.definition = definition;
    this.onStateChange = onStateChange;
    this.timelineEngine = new TimelineEngine(definition.events);
    
    this.runtime = {
      sceneId: definition.id,
      state: 'ready',
      currentTime: 0,
      activeInteraction: null,
      activeNotificationId: null,
      videoPausedAt: null,
      lastAction: null,
    };
    
    this.notify('scene_loaded: ' + definition.id);
  }

  private notify(log?: string) {
    this.onStateChange({ ...this.runtime }, log);
  }

  public start() {
    if (this.runtime.state !== 'ready' && this.runtime.state !== 'idle') return;
    this.runtime.state = 'playing';
    this.notify('scene_started');
  }

  public updateTime(time: number, isPlaying: boolean) {
    if (this.runtime.state === 'completed') return;
    
    this.runtime.currentTime = time;
    
    // Process timeline if not blocked
    if (this.runtime.state === 'playing') {
      const { triggered } = this.timelineEngine.process(time, isPlaying);
      triggered.forEach((event: TimelineEvent) => this.handleTimelineEvent(event));
    }
    
    this.notify();
  }

  private handleTimelineEvent(event: TimelineEvent) {
    this.notify(`event_triggered: ${event.id} (${event.type})`);
    
    // Check if event type exists in registry is handled by TimelineEngine.process
    // We just handle the business logic here.
    
    if (event.type === 'incoming_call') {
      const interactionId = event.payload?.['interactionId'];
      if (interactionId) {
        this.openInteraction(interactionId);
      }
    } else if (event.type === 'notification') {
      this.runtime.activeNotificationId = event.id;
      this.notify(`notification_opened`);
    }
  }

  public openInteraction(interactionId: string) {
    const interaction = resolveInteraction(interactionId, this.definition.interactions);
    
    if (!interaction) {
      this.notify('interaction_not_found: ' + interactionId);
      return;
    }

    this.runtime.activeInteraction = interaction;
    this.runtime.state = 'blocked';
    this.notify(`interaction_opened: ${interactionId}`);
    this.notify(`scene_blocked`);
  }

  public completeInteraction(interactionId: string) {
    if (this.runtime.activeInteraction?.id === interactionId) {
      this.runtime.activeInteraction = null;
      this.runtime.state = 'playing';
      this.notify(`interaction_completed: ${interactionId}`);
      this.notify(`scene_resumed`);
      
      // If it was triggered by a timeline event, mark it completed
      this.timelineEngine.completeEvent(interactionId);
    }
  }

  public handleInteractionAction(action: InteractionAction, sourceId: string) {
    this.runtime.lastAction = action;
    this.notify(`interaction_action: ${action.type}`);

    const result = processInteractionAction(action, this.definition.interactions);

    if (result.intent === 'open' && result.interaction) {
      this.openInteraction(result.targetId!);
    } else if (result.intent === 'complete') {
      this.completeScene();
    }
    
    // Source (like notification) is always completed after action resolution
    this.timelineEngine.completeEvent(sourceId);
    if (this.runtime.activeNotificationId === sourceId) {
      this.runtime.activeNotificationId = null;
    }
  }

  public handleNotificationDismiss(notificationId: string, reason: 'swiped' | 'auto_dismissed') {
    if (this.runtime.activeNotificationId === notificationId) {
      this.runtime.activeNotificationId = null;
      this.timelineEngine.completeEvent(notificationId);
      this.notify(`notification_${reason}`);
      this.notify(`event_completed: ${notificationId}`);
    }
  }

  public handleVideoEnded() {
    if (this.definition.completion?.type === 'video_ended') {
      this.notify('video_ended');
      this.completeScene();
    }
  }

  private completeScene() {
    this.runtime.state = 'completing';
    this.notify('scene_completing');
    
    setTimeout(() => {
      this.runtime.state = 'completed';
      this.notify('scene_completed: ' + this.definition.id);
    }, 100);
  }

  public reset() {
    this.timelineEngine = new TimelineEngine(this.definition.events);
    this.runtime = {
      sceneId: this.definition.id,
      state: 'ready',
      currentTime: 0,
      activeInteraction: null,
      activeNotificationId: null,
      videoPausedAt: null,
      lastAction: null,
    };
    this.notify('scene_reset');
  }

  public getRuntimeState(): SceneRuntimeState {
    return { ...this.runtime };
  }
  
  public getDefinition(): SceneDefinition {
    return this.definition;
  }
}
