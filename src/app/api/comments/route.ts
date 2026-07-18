import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { createCommentSchema } from '@/lib/validation';
import { getCommentTreeForIdea, stripControlCharacters } from '@/lib/comments';
import { notify } from '@/lib/notifications';

/**
 * GET /api/comments?ideaId=...&skip=0 — public. Paginated at the ROOT
 * comment level (not a flat row count) — each page includes full reply
 * trees for whichever roots are on that page. See lib/comments.ts.
 */
export async function GET(request: NextRequest) {
  const ideaId = request.nextUrl.searchParams.get('ideaId');
  if (!ideaId) {
    return NextResponse.json({ error: 'ideaId is required.' }, { status: 400 });
  }
  const skip = Math.max(0, Number(request.nextUrl.searchParams.get('skip')) || 0);

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { id: true, isPublic: true },
  });
  if (!idea || !idea.isPublic) {
    return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
  }

  const { roots, hasMore, totalRootCount } = await getCommentTreeForIdea(ideaId, { skip });
  return NextResponse.json({ comments: roots, hasMore, totalRootCount });
}

/** POST /api/comments — requires an authenticated session. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in to comment.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (typeof body.content === 'string') {
      body.content = stripControlCharacters(body.content);
    }
    const { ideaId, content, parentId } = createCommentSchema.parse(body);

    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: { id: true, isPublic: true, title: true, authorId: true },
    });
    if (!idea || !idea.isPublic) {
      return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
    }

    let parentAuthorId: string | null = null;
    if (parentId) {
      // A reply must point at a comment that actually belongs to this idea —
      // otherwise a client could stitch replies onto an unrelated thread.
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { ideaId: true, userId: true },
      });
      if (!parent || parent.ideaId !== ideaId) {
        return NextResponse.json({ error: 'Invalid reply target.' }, { status: 400 });
      }
      parentAuthorId = parent.userId;
    }

    const comment = await prisma.comment.create({
      data: { content, ideaId, parentId: parentId ?? null, userId: user.id },
      select: {
        id: true,
        content: true,
        createdAt: true,
        parentId: true,
        author: { select: { id: true, name: true } },
      },
    });

    // Best-effort notifications, fired after the comment is safely saved.
    // Always tell the founder about feedback on their idea; additionally
    // tell the specific person being replied to, if that's someone else
    // (notify() already dedupes "don't notify yourself").
    await notify({
      userId: idea.authorId,
      actorId: user.id,
      message: `${user.name} commented on "${idea.title}"`,
      link: `/ideas/${idea.id}`,
    });
    if (parentAuthorId && parentAuthorId !== idea.authorId) {
      await notify({
        userId: parentAuthorId,
        actorId: user.id,
        message: `${user.name} replied to your comment on "${idea.title}"`,
        link: `/ideas/${idea.id}`,
      });
    }

    return NextResponse.json({ comment: { ...comment, replies: [] } }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }
    console.error('Create comment error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
