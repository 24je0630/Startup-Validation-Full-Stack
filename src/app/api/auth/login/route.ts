import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Same generic error whether the email doesn't exist or the password is
    // wrong — don't leak which one it was.
    const invalidCredentials = () =>
      NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });

    if (!user) return invalidCredentials();

    const passwordMatches = await verifyPassword(password, user.password);
    if (!passwordMatches) return invalidCredentials();

    const token = await signSessionToken({ userId: user.id, email: user.email });

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        createdAt: user.createdAt,
      },
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
