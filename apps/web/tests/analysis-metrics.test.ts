import { describe, expect, it } from 'vitest';
import { classifyMove, movingPlayerImpact } from '../server/analysis/analysis-metrics';
describe('analysis evaluation perspective', () => {
  it('recognizes white improving and worsening a white-centric evaluation', () => { expect(movingPlayerImpact(.8, 1.6, 'white')).toBeCloseTo(.8); expect(movingPlayerImpact(.8, .2, 'white')).toBeCloseTo(-.6); });
  it('inverts white-centric evaluation for black', () => { expect(movingPlayerImpact(.8, .2, 'black')).toBeCloseTo(.6); expect(movingPlayerImpact(.8, 1.6, 'black')).toBeCloseTo(-.8); });
  it('classifies best moves and blunders from normalized impact', () => { expect(classifyMove(0)).toBe('best'); expect(classifyMove(-2)).toBe('blunder'); });
});
