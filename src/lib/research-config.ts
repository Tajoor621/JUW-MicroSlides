/** Independent from the permanent application version. Budget per active attempt. */
export const RESEARCH_CONFIG = {
  defaultBudgetMs: 30 * 60 * 1000,
  quickBudgetMs: 30 * 60 * 1000,
  rounds: 5,
} as const;
