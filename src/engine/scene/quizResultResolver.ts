import { QuizResult } from '@/types/quiz';
import { InteractionAction } from './sceneTypes';

export type QuizResultRule = {
  id: string;
  quizId: string;
  strategy: 'dominant_tag';
  routes: Record<string, string>;
  fallbackSceneId?: string;
};

/**
 * Small, independent layer to resolve Quiz results into scene actions.
 */
export function resolveQuizResultRule(
  result: QuizResult,
  rule: QuizResultRule,
  logCallback?: (msg: string) => void
): InteractionAction | null {
  if (rule.strategy === 'dominant_tag') {
    const counts = result.tagCounts || {};
    const tags = Object.keys(counts);

    if (tags.length === 0) {
      logCallback?.('quiz_rule_empty_tags');
      if (rule.fallbackSceneId) {
        return { type: 'go_to_scene', sceneId: rule.fallbackSceneId };
      }
      return null;
    }

    // Find dominant tag(s)
    let maxCount = -1;
    let dominantTags: string[] = [];

    for (const tag of tags) {
      const count = counts[tag] ?? 0;
      if (count > maxCount) {
        maxCount = count;
        dominantTags = [tag];
      } else if (count === maxCount) {
        dominantTags.push(tag);
      }
    }

    // Handle Tie
    if (dominantTags.length > 1) {
      logCallback?.('quiz_rule_tie: ' + dominantTags.join(', '));
      if (rule.fallbackSceneId) {
        return { type: 'go_to_scene', sceneId: rule.fallbackSceneId };
      }
      return null;
    }

    const winner = dominantTags[0];
    const targetSceneId = rule.routes[winner];

    if (targetSceneId) {
      logCallback?.(`dominant_tag: ${winner}`);
      return { type: 'go_to_scene', sceneId: targetSceneId };
    } else {
      logCallback?.(`quiz_rule_no_route_for_tag: ${winner}`);
      if (rule.fallbackSceneId) {
        return { type: 'go_to_scene', sceneId: rule.fallbackSceneId };
      }
    }
  }

  return null;
}
