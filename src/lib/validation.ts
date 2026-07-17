import { z } from 'zod';
import { IDEA_CATEGORIES } from '@/lib/constants';

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name is too long'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createIdeaSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title must be under 120 characters'),
  description: z
    .string()
    .trim()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description must be under 5000 characters'),
  category: z.enum(IDEA_CATEGORIES).optional().nullable(),
  tags: z
    .array(z.string().trim().min(1).max(24))
    .max(5, 'Add at most 5 tags')
    .default([]),
});

export const createCommentSchema = z.object({
  ideaId: z.string().min(1),
  // .trim() rejects whitespace-only "empty" comments; control characters
  // are stripped separately in the route handler before this runs.
  content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be under 2000 characters'),
  parentId: z.string().min(1).optional().nullable(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
