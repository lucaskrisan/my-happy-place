import type { BlockType, SceneEventDefinition, TriggerDefinition } from '../schema/v1';

export type BlockRegistration<T extends BlockType = BlockType> = { type: T; blockingByDefault: boolean; allowedTriggers: readonly TriggerDefinition['kind'][]; };
export class BlockRegistry {
  private registrations = new Map<BlockType, BlockRegistration>();
  register<T extends BlockType>(registration: BlockRegistration<T>) { this.registrations.set(registration.type, registration); return this; }
  get(type: BlockType) { return this.registrations.get(type); }
  isBlocking(event: SceneEventDefinition) { return event.blocking || this.get(event.block)?.blockingByDefault === true; }
}
export const funnelBlockRegistry = new BlockRegistry()
  .register({ type: 'video', blockingByDefault: false, allowedTriggers: ['SCENE_START'] })
  .register({ type: 'audio', blockingByDefault: false, allowedTriggers: ['SCENE_START', 'TIME', 'INTERACTION_COMPLETE', 'MANUAL'] })
  .register({ type: 'incoming_call', blockingByDefault: true, allowedTriggers: ['TIME', 'VIDEO_END', 'MANUAL'] })
  .register({ type: 'messaging', blockingByDefault: true, allowedTriggers: ['TIME', 'VIDEO_END', 'INTERACTION_COMPLETE', 'MANUAL'] })
  .register({ type: 'notification', blockingByDefault: false, allowedTriggers: ['TIME', 'BEFORE_END', 'MANUAL'] })
  .register({ type: 'quiz', blockingByDefault: true, allowedTriggers: ['TIME', 'MANUAL'] })
  .register({ type: 'choice', blockingByDefault: true, allowedTriggers: ['TIME', 'MANUAL'] })
  .register({ type: 'scene_transition', blockingByDefault: false, allowedTriggers: ['VIDEO_END', 'INTERACTION_COMPLETE', 'MANUAL'] });
