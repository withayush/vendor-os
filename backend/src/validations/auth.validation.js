import { z } from "zod";

// Password regex: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-\[\]{}|:;"'<>,.?\/~`])[A-Za-z\d@$!%*?&#^()_+=\-\[\]{}|:;"'<>,.?\/~`]{8,}$/;

// Phone normalization: converts '9876543210' -> '+919876543210', keeps valid '+919876543210'
const phoneSchema = z
  .string({ required_error: "Phone number is required" })
  .trim()
  .transform((val) => {
    // Remove all spaces and hyphens
    const cleaned = val.replace(/[\s\-]/g, "");
    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }
    return cleaned;
  })
  .refine((val) => /^\+91[6-9]\d{9}$/.test(val), {
    message: "Phone number must be a valid 10-digit Indian number (+91XXXXXXXXXX)",
  });

// Sanitized lowercased email
const emailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .toLowerCase()
  .email({ message: "Please provide a valid email address" })
  .max(255, { message: "Email cannot exceed 255 characters" });

// ==========================================
// 1. REGISTER SCHEMA
// ==========================================
export const registerSchema = z.object({
  body: z.object({
    fullName: z
      .string({ required_error: "Full name is required" })
      .trim()
      .min(2, { message: "Full name must be at least 2 characters long" })
      .max(100, { message: "Full name cannot exceed 100 characters" }),

    email: emailSchema,

    phone: phoneSchema,

    password: z
      .string({ required_error: "Password is required" })
      .min(8, { message: "Password must be at least 8 characters long" })
      .max(128, { message: "Password cannot exceed 128 characters" })
      .regex(PASSWORD_REGEX, {
        message:
          "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character",
      }),
  }),
});

// ==========================================
// 2. VERIFY PHONE OTP SCHEMA
// ==========================================
export const verifyPhoneSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    otp: z
      .string({ required_error: "OTP is required" })
      .trim()
      .regex(/^\d{6}$/, { message: "OTP must be a 6-digit numeric code" }),
  }),
});

// ==========================================
// 3. RESEND PHONE OTP SCHEMA
// ==========================================
export const resendPhoneOtpSchema = z.object({
  body: z.object({
    phone: phoneSchema,
  }),
});

// ==========================================
// 4. LOGIN SCHEMA
// ==========================================
export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z
      .string({ required_error: "Password is required" })
      .min(1, { message: "Password cannot be empty" }),
  }),
});

// ==========================================
// 5. REFRESH TOKEN SCHEMA
// ==========================================
export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z
      .string({ required_error: "Refresh token is required" })
      .min(1, { message: "Refresh token cannot be empty" }),
  }),
});