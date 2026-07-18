import { prisma } from '@/lib/prisma';

export type CommentNode = {
  id: string;
  content: string;
  createdAt: Date;
  parentId: string | null;
  author: { id: string; name: string };
  replies: CommentNode[];
};

const COMMENT_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  parentId: true,
  author: { select: { id: true, name: true } },
} as const;

/**
 * Strips null bytes and other control characters before validation. React
 * already escapes rendered text (we never use dangerouslySetInnerHTML), so
 * this isn't XSS defense — it's just guarding against junk bytes making it
 * into stored content.
 */
export function stripControlCharacters(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/** Arranges a flat, timestamp-ordered comment list into a parent → replies tree. */
export function buildCommentTree(
  flat: Array<{
    id: string;
    content: string;
    createdAt: Date;
    parentId: string | null;
    author: { id: string; name: string };
  }>
): CommentNode[] {
  const nodesById = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of flat) {
    nodesById.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of flat) {
    const node = nodesById.get(comment.id)!;
    if (comment.parentId && nodesById.has(comment.parentId)) {
      nodesById.get(comment.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

const ROOT_PAGE_SIZE = 20;
// Safety valve against pathological reply chains — real conversations are
// nowhere near this deep, so this never fires in practice.
const MAX_REPLY_LEVELS = 20;

export type CommentPage = {
  roots: CommentNode[];
  hasMore: boolean;
  totalRootCount: number;
};

/**
 * Fetches one page of TOP-LEVEL comments (newest first, so a comment you
 * just posted shows up on page 1 immediately) along with the FULL reply
 * tree under each of those roots — not a flat row-count pagination, which
 * would risk splitting a conversation thread across pages.
 *
 * Implementation: paginate the `parentId: null` rows, then walk downward
 * level by level (comments whose parentId is in the previous level's ids)
 * until a level comes back empty. This is bounded by actual reply DEPTH
 * (typically shallow), not by how much total activity the idea has, and
 * each level is one indexed query (`parentId` is indexed).
 */
export async function getCommentTreeForIdea(
  ideaId: string,
  { skip = 0, take = ROOT_PAGE_SIZE }: { skip?: number; take?: number } = {}
): Promise<CommentPage> {
  const [rootRows, totalRootCount] = await Promise.all([
    prisma.comment.findMany({
      where: { ideaId, parentId: null },
      select: COMMENT_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      take: take + 1, // fetch one extra to know if there's a next page
    }),
    prisma.comment.count({ where: { ideaId, parentId: null } }),
  ]);

  const hasMore = rootRows.length > take;
  const pageRoots = hasMore ? rootRows.slice(0, take) : rootRows;

  if (pageRoots.length === 0) {
    return { roots: [], hasMore: false, totalRootCount };
  }

  const allNodes = [...pageRoots];
  let frontier = pageRoots.map((r) => r.id);

  for (let level = 0; level < MAX_REPLY_LEVELS && frontier.length > 0; level++) {
    const nextLevel = await prisma.comment.findMany({
      where: { parentId: { in: frontier } },
      select: COMMENT_SELECT,
      orderBy: { createdAt: 'asc' }, // chronological order within a thread
    });
    if (nextLevel.length === 0) break;
    allNodes.push(...nextLevel);
    frontier = nextLevel.map((c) => c.id);
  }

  return { roots: buildCommentTree(allNodes), hasMore, totalRootCount };
}
