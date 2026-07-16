// A curated list, not free text — keeps categories consistent for future
// filtering/analytics (Phase 8) instead of accumulating typo-variants.
export const IDEA_CATEGORIES = [
  'SaaS',
  'Consumer',
  'Fintech',
  'Health',
  'AI / ML',
  'Marketplace',
  'Hardware',
  'Other',
] as const;

export type IdeaCategory = (typeof IDEA_CATEGORIES)[number];
