import { z } from "zod";

// Input validation at the system boundary (API routes). Caps string
// lengths to bound prompt size/cost and reduce prompt-injection surface.
export const crowdAdvisorySchema = z.object({
  gateId: z.string().min(1).max(50).optional(),
});

export const navigationRequestSchema = z.object({
  query: z.string().min(2).max(300),
  accessibleOnly: z.boolean().optional().default(false),
  /** The fan's current concourse zone, used to prefer nearby options. */
  zone: z.string().max(60).optional(),
});

export const opsBriefSchema = z.object({
  focusZone: z.string().max(100).optional(),
  whatIf: z.string().max(300).optional(),
});

export const assistantRequestSchema = z.object({
  message: z.string().min(1).max(500),
  language: z.string().min(2).max(40).default("English"),
});

export const registerDeviceSchema = z.object({
  name: z.string().min(2).max(40),
  gateId: z.string().min(1).max(50),
});

export const scanSchema = z.object({
  deviceId: z.string().uuid(),
  direction: z.enum(["in", "out"]).default("in"),
  count: z.number().int().min(1).max(100).default(1),
});

export type NavigationRequest = z.infer<typeof navigationRequestSchema>;
export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
export type OpsBriefRequest = z.infer<typeof opsBriefSchema>;
export type CrowdAdvisoryRequest = z.infer<typeof crowdAdvisorySchema>;
