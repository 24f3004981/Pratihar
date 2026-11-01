import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:MM");
export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];

export const ServiceSchema = z.object({
  name: z.string().min(1).max(80),
  // null means the owner never gave a price. The receptionist must not invent one.
  price: z.number().nonnegative().nullable(),
  durationMin: z.number().int().min(5).max(480).default(30),
  notes: z.string().max(300).default(""),
});

export const JobCardSchema = z.object({
  businessName: z.string().min(1).max(100),
  kind: z.string().max(60).default("clinic"),
  city: z.string().max(60).default(""),
  ownerName: z.string().max(60).default(""),
  handoffPhone: z.string().max(20).default(""),
  languages: z.array(z.enum(["en", "hi", "hinglish"])).default(["hinglish"]),
  hours: z.record(z.enum(DAYS), z.array(z.object({ open: time, close: time })).max(3)).default({}),
  slotMinutes: z.number().int().min(10).max(120).default(30),
  services: z.array(ServiceSchema).max(60).default([]),
  rules: z.array(z.string().min(3).max(300)).max(40).default([]),
  faqs: z.array(z.object({ q: z.string().max(200), a: z.string().max(500) })).max(40).default([]),
  emergency: z.string().max(400).default(""),
  greeting: z.string().max(300).default(""),
});
export type JobCard = z.infer<typeof JobCardSchema>;

export type Turn = { role: "caller" | "agent" | "owner" | "assistant"; text: string; at?: number };

export type ToolTrace = {
  name: string;
  args: Record<string, unknown>;
  allowed: boolean;
  reason?: string;
  result?: unknown;
};

export type Business = {
  _id: string;
  name: string;
  createdAt: Date;
  voiceId: string;
  interview: Turn[];
  card: JobCard | null;
  draft?: JobCard | null; // filled in live while the owner is being interviewed
  liveVersion: number | null;
  latestVersion: number;
  elevenAgentId?: string;
  ownerId?: string;
};

export type Version = {
  businessId: string;
  n: number;
  card: JobCard;
  note: string;
  createdAt: Date;
  parent: number | null;
};

export type Scenario = {
  id: string;
  title: string;
  titleHi: string;
  caller: string[]; // what the caller says, turn by turn
  expect: string; // what a good receptionist does, in plain words, for the judge
  regression?: boolean;
  sourceRule?: string;
};

export type CallOutcome = "booked" | "callback" | "answered" | "handoff" | "dropped" | "failed";

export type Lead = {
  name: string;
  phone: string;
  service: string;
  status: string;
  reason: string;
  nextAction: "callback" | "follow-up" | "none";
  urgency: "high" | "normal" | "low";
  draft: string;
};
