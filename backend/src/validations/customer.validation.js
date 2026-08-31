import { z } from "zod";

// Phone schema: accepts E.164 (+CountryCode+Number), bare 10-digit Indian numbers,
// or numbers with spaces/dashes. Country code check is enforced downstream in the service.
const phoneSchema = z
  .string({
    required_error: "Phone number is required",
  })
  .trim()
  .min(7, { message: "Phone number is too short" })
  .max(20, { message: "Phone number cannot exceed 20 characters" })
  .refine(
    (val) => {
      // Strip formatting characters
      const cleaned = val.replace(/[\s\-\.\(\)]/g, "");
      // Must be: optional leading +, then digits only
      return /^\+?\d{7,15}$/.test(cleaned);
    },
    { message: "Invalid phone number format. Use digits with optional country code (e.g. +91XXXXXXXXXX or 9876543210)" }
  );

export const createCustomerSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: "Customer name is required",
      })
      .trim()
      .min(1, { message: "Customer name cannot be empty" })
      .max(100, { message: "Customer name cannot exceed 100 characters" }),

    phone: phoneSchema,

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email({ message: "Please provide a valid email address" })
      .max(255)
      .optional()
      .nullable()
      .or(z.literal("")),

    address: z
      .string()
      .trim()
      .max(500)
      .optional()
      .nullable()
      .or(z.literal("")),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Customer name cannot be empty" })
      .max(100)
      .optional(),

    phone: phoneSchema.optional(),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email({ message: "Please provide a valid email address" })
      .max(255)
      .optional()
      .nullable()
      .or(z.literal("")),

    address: z
      .string()
      .trim()
      .max(500)
      .optional()
      .nullable()
      .or(z.literal("")),
  }),
});

export const recordPaymentSchema = z.object({
  body: z.object({
    amount: z
      .number({
        required_error: "Payment amount is required",
      })
      .positive({ message: "Payment amount must be greater than zero" }),

    paymentMode: z
      .string()
      .trim()
      .min(1, { message: "Payment mode cannot be empty" })
      .optional(),

    notes: z
      .string()
      .trim()
      .max(255)
      .optional()
      .nullable()
      .or(z.literal("")),
  }),
});
