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

/** Fetches every comment for an idea (oldest first) as a nested reply tree. */
export async function getCommentTreeForIdea(ideaId: string): Promise<CommentNode[]> {
  const flat = await prisma.comment.findMany({
    where: { ideaId },
    select: COMMENT_SELECT,
    orderBy: { createdAt: 'asc' },
  });
  return buildCommentTree(flat);
}
