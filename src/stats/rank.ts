// Port of github-readme-stats calculateRank (default mode, commits median 250).
export type Level = "S" | "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C";

export type RankInput = {
  commits: number;
  prs: number;
  issues: number;
  reviews: number;
  stars: number;
  followers: number;
};

const THRESHOLDS = [1, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
const LEVELS: Level[] = ["S", "A+", "A", "A-", "B+", "B", "B-", "C+", "C"];

const exponentialCdf = (x: number) => 1 - 2 ** -x;
const logNormalCdf = (x: number) => x / (1 + x);

export function levelFor(percentile: number): Level {
  const i = THRESHOLDS.findIndex((t) => percentile <= t);
  return LEVELS[i === -1 ? LEVELS.length - 1 : i];
}

export function calculateRank(i: RankInput): { level: Level; percentile: number } {
  const totalWeight = 2 + 3 + 1 + 1 + 4 + 1;
  const rank =
    1 -
    (2 * exponentialCdf(i.commits / 250) +
      3 * exponentialCdf(i.prs / 50) +
      1 * exponentialCdf(i.issues / 25) +
      1 * exponentialCdf(i.reviews / 2) +
      4 * logNormalCdf(i.stars / 50) +
      1 * logNormalCdf(i.followers / 10)) /
      totalWeight;
  const percentile = rank * 100;
  return { level: levelFor(percentile), percentile };
}
