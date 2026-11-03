export const MEAN_CAPTION = "The average is a prompt, not a recommendation.";

export function meanText(scores: readonly (number | null)[]): string {
  const judged = scores.filter((score): score is number => score !== null);
  if (judged.length === 0) {
    return "Unscored";
  }
  const total = judged.reduce((sum, score) => sum + score, 0);
  const tenths = Math.round((total * 10) / judged.length);
  if (tenths % 10 === 0) {
    return String(tenths / 10);
  }
  return (tenths / 10).toFixed(1);
}
