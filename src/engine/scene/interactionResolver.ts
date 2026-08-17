import { InteractionDefinition, InteractionAction, SceneRuntimeState } from './sceneTypes';

/**
 * Resolves an interaction ID against a set of definitions.
 * Centralizes the logic to avoid crashes and track failures.
 */
export function resolveInteraction(
  interactionId: string,
  interactions?: Record<string, InteractionDefinition>
): InteractionDefinition | null {
  if (!interactions) return null;
  
  const interaction = interactions[interactionId];
  if (!interaction) {
    console.warn(`[SceneEngine] Interaction not found: ${interactionId}`);
    return null;
  }
  
  return interaction;
}

/**
 * Handles action execution logic, separating intent from implementation.
 */
export function processInteractionAction(
  action: InteractionAction,
  interactions?: Record<string, InteractionDefinition>
): { 
  interaction?: InteractionDefinition | null,
  intent: 'open' | 'complete' | 'navigate' | 'none',
  targetId?: string 
} {
  switch (action.type) {
    case 'open_interaction':
      return {
        interaction: resolveInteraction(action.interactionId, interactions),
        intent: 'open',
        targetId: action.interactionId
      };
    case 'complete_scene':
      return { intent: 'complete' };
    case 'go_to_scene':
      return { intent: 'navigate', targetId: action.sceneId };
    default:
      return { intent: 'none' };
  }
}

import { ChoiceDefinition, ChoiceResult, ChoiceAction } from '@/types/choice';

export function resolveChoiceAction(
  action: ChoiceAction
): InteractionAction {
  switch (action.type) {
    case 'complete': return { type: 'complete_scene' };
    case 'go_to_scene': return { type: 'go_to_scene', sceneId: action.sceneId };
    case 'open_interaction': return { type: 'open_interaction', interactionId: action.interactionId };
    default: return { type: 'complete_scene' };
  }
}
