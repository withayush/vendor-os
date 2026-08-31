import { z } from "zod";

export const createBusinessSchema = z.object({
  body: z.object({
    businessName: z
      .string({ required_error: "Business name is required" })
      .trim()
      .min(2, { message: "Business name must be at least 2 characters long" })
      .max(150, { message: "Business name cannot exceed 150 characters" }),

    businessType: z
      .string()
      .trim()
      .toUpperCase()
      .default("RETAIL")
      .refine((val) => ["RETAIL", "KIRANA", "WHOLESALE", "SERVICES"].includes(val), {
        message: "Business segment must be primarily Retail/Kirana during initial setup",
      }),

    category: z.string().trim().max(100).optional(),
    description: z.string().trim().max(500).optional(),

    businessEmail: z.string().trim().email({ message: "Invalid business email" }).optional().or(z.literal("")),
    businessPhone: z.string().trim().max(20).optional(),
    whatsappNumber: z.string().trim().max(20).optional(),

    addressLine: z.string().trim().optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    pincode: z.string().trim().max(20).optional(),
    website: z.string().trim().url({ message: "Invalid website URL" }).optional().or(z.literal("")),
  }),
});

export const updateBusinessSchema = z.object({
  body: z.object({
    businessName: z.string().trim().min(2).max(150).optional(),
    businessType: z
      .string()
      .trim()
      .toUpperCase()
      .refine((val) => ["RETAIL", "KIRANA", "WHOLESALE", "SERVICES"].includes(val), {
        message: "Invalid business type",
      })
      .optional(),
    category: z.string().trim().max(100).optional().nullable(),
    description: z.string().trim().max(500).optional().nullable(),
    businessEmail: z.string().trim().email().optional().nullable().or(z.literal("")),
    businessPhone: z.string().trim().max(20).optional().nullable(),
    whatsappNumber: z.string().trim().max(20).optional().nullable(),
    addressLine: z.string().trim().optional().nullable(),
    city: z.string().trim().max(100).optional().nullable(),
    state: z.string().trim().max(100).optional().nullable(),
    pincode: z.string().trim().max(20).optional().nullable(),
    website: z.string().trim().url().optional().nullable().or(z.literal("")),
  }),
});

export const addBusinessMemberSchema = z.object({
  body: z.object({
    phone: z
      .string({ required_error: "Phone number is required" })
      .trim()
      .min(10, { message: "Phone number must be at least 10 characters long" }),
    role: z
      .string({ required_error: "Role is required" })
      .trim()
      .toUpperCase()
      .refine((val) => ["OWNER", "MANAGER", "STAFF", "ACCOUNTANT"].includes(val), {
        message: "Invalid member role",
      }),
  }),
});