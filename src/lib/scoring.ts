// Weights sum to 1.0 so the output stays on a 1–10 scale, same as the
// three inputs.
export const PREDICTION_WEIGHTS = {
  market: 0.4,
  feasibility: 0.35,
  risk: 0.25,
} as const;

/**
 * Overall score formula — all inputs are 1–10, output is 1–10:
 *
 *   overall = market * 0.40 + feasibility * 0.35 + (11 - risk) * 0.25
 *
 * Market (40%) and feasibility (35%) contribute directly: a bigger
 * addressable market and a more buildable idea both push the score up.
 *
 * Risk (25%) is INVERTED via (11 - risk) before weighting. A risk rating
 * of 1 (very low risk) becomes a contribution of 10 (near-max); a risk
 * rating of 10 (very high risk) becomes a contribution of 1 (near-min).
 * This keeps all three components on the same "higher is better" 1–10
 * scale before applying weights, so the weights are directly comparable —
 * without the inversion, a higher risk *score* would confusingly increase
 * the *overall* score.
 *
 * Market and feasibility are weighted more heavily than risk (40% + 35%
 * vs. 25%) because at the idea-validation stage — before any code has been
 * written — market size and buildability are the stronger signals of
 * whether something is worth pursuing at all. Risk still matters (25% is
 * not nominal), but a genuinely large, feasible market shouldn't be
 * dragged down as hard by risk as it would be by a small market or
 * obvious infeasibility.
 */
export function calculateOverallScore(
  market: number,
  feasibility: number,
  risk: number
): number {
  const raw =
    market * PREDICTION_WEIGHTS.market +
    feasibility * PREDICTION_WEIGHTS.feasibility +
    (11 - risk) * PREDICTION_WEIGHTS.risk;
  return roundToOneDecimal(raw);
}

export function roundToOneDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}
