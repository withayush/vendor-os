import { z } from "zod";

export const createVendorSchema = z.object({
  body: z.object({
    businessName: z.string({ required_error: "businessName is required" }).trim().min(2),
    businessType: z.string().trim().toUpperCase().default("CATERING"),
    description: z.string().trim().optional().nullable(),
    email: z.string().trim().email("Invalid email format").optional().nullable().or(z.literal("")),
    contactPhone: z.string({ required_error: "contactPhone is required" }).trim().min(10),
    addressLine: z.string({ required_error: "addressLine is required" }).trim(),
    city: z.string({ required_error: "city is required" }).trim(),
    state: z.string({ required_error: "state is required" }).trim(),
    pincode: z.string({ required_error: "pincode is required" }).trim(),
  }),
});

export const updateVendorSchema = z.object({
  body: z.object({
    businessName: z.string().trim().min(2).optional(),
    businessType: z.string().trim().toUpperCase().optional(),
    description: z.string().trim().optional().nullable(),
    email: z.string().trim().email("Invalid email format").optional().nullable().or(z.literal("")),
    contactPhone: z.string().trim().min(10).optional(),
    addressLine: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    pincode: z.string().trim().optional(),
  }),
});
