import { z } from 'zod';

// Enum schemas
export const UserRoleSchema = z.enum(['user', 'admin', 'superadmin']);
export const ServerMemberRoleSchema = z.enum(['member', 'admin']);
export const ChannelTypeSchema = z.enum(['text', 'voice', 'announcements']);
export const CourseLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export const LivestreamStatusSchema = z.enum(['scheduled', 'live', 'ended']);

// Profile schemas
export const ProfileInsertSchema = z.object({
  id: z.string().uuid().optional(),
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  avatar_url: z.string().url().optional().nullable(),
  role: UserRoleSchema.default('user'),
});

export const ProfileUpdateSchema = z.object({
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens').optional(),
  avatar_url: z.string().url().optional().nullable(),
  role: UserRoleSchema.optional(),
});

// Server schemas
export const ServerInsertSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(500).optional().nullable(),
  is_public: z.boolean().default(false),
  created_by: z.string().uuid(),
});

export const ServerUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens').optional(),
  description: z.string().max(500).optional().nullable(),
  is_public: z.boolean().optional(),
});

// Server member schemas
export const ServerMemberInsertSchema = z.object({
  server_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role_in_server: ServerMemberRoleSchema.default('member'),
});

export const ServerMemberUpdateSchema = z.object({
  role_in_server: ServerMemberRoleSchema.optional(),
});

// Channel schemas
export const ChannelInsertSchema = z.object({
  server_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: ChannelTypeSchema.default('text'),
  sort_order: z.number().int().min(0).default(0),
});

export const ChannelUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: ChannelTypeSchema.optional(),
  sort_order: z.number().int().min(0).optional(),
});

// Message schemas
export const MessageInsertSchema = z.object({
  channel_id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string().min(1).max(2000),
});

export const MessageUpdateSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
});

// Course schemas
export const CourseInsertSchema = z.object({
  server_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  level: CourseLevelSchema.default('beginner'),
  thumbnail_url: z.string().url().optional().nullable(),
  created_by: z.string().uuid(),
});

export const CourseUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  level: CourseLevelSchema.optional(),
  thumbnail_url: z.string().url().optional().nullable(),
});

// Lesson schemas
export const LessonInsertSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  video_url: z.string().url().optional().nullable(),
  duration_sec: z.number().int().min(0).default(0),
  order_index: z.number().int().min(0).default(0),
});

export const LessonUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  video_url: z.string().url().optional().nullable(),
  duration_sec: z.number().int().min(0).optional(),
  order_index: z.number().int().min(0).optional(),
});

// Livestream schemas
export const LivestreamInsertSchema = z.object({
  server_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  status: LivestreamStatusSchema.default('scheduled'),
  scheduled_at: z.string().datetime().optional().nullable(),
  started_at: z.string().datetime().optional().nullable(),
  ended_at: z.string().datetime().optional().nullable(),
  created_by: z.string().uuid(),
});

export const LivestreamUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: LivestreamStatusSchema.optional(),
  scheduled_at: z.string().datetime().optional().nullable(),
  started_at: z.string().datetime().optional().nullable(),
  ended_at: z.string().datetime().optional().nullable(),
});

// Export types inferred from schemas
export type ProfileInsert = z.infer<typeof ProfileInsertSchema>;
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;
export type ServerInsert = z.infer<typeof ServerInsertSchema>;
export type ServerUpdate = z.infer<typeof ServerUpdateSchema>;
export type ServerMemberInsert = z.infer<typeof ServerMemberInsertSchema>;
export type ServerMemberUpdate = z.infer<typeof ServerMemberUpdateSchema>;
export type ChannelInsert = z.infer<typeof ChannelInsertSchema>;
export type ChannelUpdate = z.infer<typeof ChannelUpdateSchema>;
export type MessageInsert = z.infer<typeof MessageInsertSchema>;
export type MessageUpdate = z.infer<typeof MessageUpdateSchema>;
export type CourseInsert = z.infer<typeof CourseInsertSchema>;
export type CourseUpdate = z.infer<typeof CourseUpdateSchema>;
export type LessonInsert = z.infer<typeof LessonInsertSchema>;
export type LessonUpdate = z.infer<typeof LessonUpdateSchema>;
export type LivestreamInsert = z.infer<typeof LivestreamInsertSchema>;
export type LivestreamUpdate = z.infer<typeof LivestreamUpdateSchema>;