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

// Shared by GET /api/ideas and the /ideas feed page so pagination stays
// consistent between the two.
export const IDEAS_PAGE_SIZE = 20;
