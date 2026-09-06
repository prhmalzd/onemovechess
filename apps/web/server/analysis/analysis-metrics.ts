export type MoveClassification = 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
export const analysisThresholds = { best: -0.05, excellent: -0.15, good: -0.35, inaccuracy: -0.8, mistake: -1.8 } as const;

/** Evaluations are always White-centric. Impact is normalized to the mover. */
export function movingPlayerImpact(before: number, after: number, color: 'white' | 'black'): number {
  return (after - before) * (color === 'white' ? 1 : -1);
}
export function classifyMove(impact: number): MoveClassification {
  if (impact >= analysisThresholds.best) return 'best';
  if (impact >= analysisThresholds.excellent) return 'excellent';
  if (impact >= analysisThresholds.good) return 'good';
  if (impact >= analysisThresholds.inaccuracy) return 'inaccuracy';
  if (impact >= analysisThresholds.mistake) return 'mistake';
  return 'blunder';
}
