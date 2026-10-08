import { z } from "zod";

const id = z.string().trim().min(1).max(160);
const visibility = z.enum(["family", "private"]);

export const eventSchema = z.object({
  id,
  title: z.string().trim().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().max(12).default("00:00"),
  allDay: z.boolean().optional(),
  durationMinutes: z.number().int().min(0).max(525600).optional(),
  category: z.enum(["health", "school", "event", "finance"]),
  memberIds: z.array(id).max(50),
  notes: z.string().max(10000).optional(),
  location: z.string().max(500).optional(),
  pinned: z.boolean().optional(),
  importance: z.enum(["low", "normal", "high"]),
  recurrence: z.enum(["do-not-repeat", "weekly", "monthly", "annually", "custom"]),
  recurrenceEndDate: z.string().max(10).optional(),
  recurrenceDays: z.array(z.string().max(10)).max(7).optional(),
  recurrenceEveryHours: z.string().max(12).optional(),
  reminderMinutes: z.string().max(12).optional(),
  excludedDates: z.array(z.string().max(10)).max(1000).optional(),
  imageDataUrl: z.string().max(800000).optional(),
  visibility: visibility.optional().default("family"),
}).strip();

export const journalSchema = z.object({
  id,
  author: z.string().max(120).default(""),
  createdAt: z.string().max(40),
  targetMemberIds: z.array(id).max(50).default([]),
  category: z.enum(["sleep", "feeding", "mood", "milestone", "health", "note"]),
  visibility: visibility.optional().default("private"),
  title: z.string().trim().min(1).max(300),
  contentStyle: z.enum(["paragraph", "checklist"]).optional(),
  text: z.string().max(50000).optional(),
  items: z.array(z.object({ id, text: z.string().max(2000), checked: z.boolean().optional() })).max(500).optional(),
  likes: z.array(z.string().max(120)).max(100).default([]),
  comments: z.array(z.object({ id, author: z.string().max(120), text: z.string().max(4000), createdAt: z.string().max(40) })).max(500).default([]),
  imageUrls: z.array(z.string().max(800000)).max(10).default([]),
}).strip();

export const healthSchema = z.object({
  id,
  memberId: id,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().trim().min(1).max(120),
  metricName: z.string().trim().min(1).max(120),
  type: z.enum(["numeric", "description"]),
  value: z.number().finite().optional(),
  unit: z.string().max(40).optional(),
  description: z.string().max(10000).optional(),
  visibility: visibility.optional().default("private"),
}).strip();

export const dependentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().max(80).optional().default(""),
  birthday: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  type: z.enum(["kid", "pet", "adult"]).optional(),
  avatar: z.string().max(16).optional(),
  color: z.string().max(80).optional(),
}).strip();
