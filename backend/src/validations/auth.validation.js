import { z } from "zod";

// ============================================================
// PASSWORD REGEX
// ============================================================
//
// Requirements:
// - Minimum 8 characters
// - At least 1 lowercase letter
// - At least 1 uppercase letter
// - At least 1 number
// - At least 1 special character
//

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=-])[A-Za-z\d@$!%*?&#^()_+=-]{8,128}$/;

// ============================================================
// PHONE SCHEMA
// ============================================================
//
// Accepts:
// 9876543210
// 98765 43210
// 98765-43210
// +919876543210
//
// Normalizes Indian numbers to:
// +919876543210
//

const phoneSchema = z
  .string({
    required_error: "Phone number is required",
  })
  .trim()
  .transform((value) => {
    // Remove spaces and hyphens
    const cleaned = value.replace(/[\s-]/g, "");

    // Convert 10-digit Indian mobile number
    // into international format
    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return `+91${cleaned}`;
    }

    return cleaned;
  })
  .refine(
    (value) => /^\+91[6-9]\d{9}$/.test(value),
    {
      message:
        "Phone number must be a valid 10-digit Indian number (+91XXXXXXXXXX)",
    }
  );

// ============================================================
// EMAIL SCHEMA
// ============================================================
//
// Normalizes:
// "  AYUSH@GMAIL.COM "
//
// Into:
// "ayush@gmail.com"
//

const emailSchema = z
  .string({
    required_error: "Email is required",
  })
  .trim()
  .toLowerCase()
  .email({
    message: "Please provide a valid email address",
  })
  .max(255, {
    message: "Email cannot exceed 255 characters",
  });

// ============================================================
// 1. REGISTER
// ============================================================

export const registerSchema = z.object({
  body: z.object({
    fullName: z
      .string({
        required_error: "Full name is required",
      })
      .trim()
      .min(2, {
        message: "Full name must be at least 2 characters long",
      })
      .max(100, {
        message: "Full name cannot exceed 100 characters",
      }),

    email: emailSchema,

    phone: phoneSchema,

    password: z
      .string({
        required_error: "Password is required",
      })
      .min(8, {
        message: "Password must be at least 8 characters long",
      })
      .max(128, {
        message: "Password cannot exceed 128 characters",
      })
      .regex(PASSWORD_REGEX, {
        message:
          "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character",
      }),
  }),
});

// ============================================================
// 2. VERIFY PHONE OTP
// ============================================================

export const verifyPhoneSchema = z.object({
  body: z.object({
    phone: phoneSchema,

    otp: z
      .string({
        required_error: "OTP is required",
      })
      .trim()
      .regex(/^\d{6}$/, {
        message: "OTP must be a 6-digit numeric code",
      }),
  }),
});

// ============================================================
// 3. RESEND PHONE OTP
// ============================================================

export const resendPhoneOtpSchema = z.object({
  body: z.object({
    phone: phoneSchema,
  }),
});

// ============================================================
// 4. LOGIN
// ============================================================

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,

    password: z
      .string({
        required_error: "Password is required",
      })
      .min(1, {
        message: "Password cannot be empty",
      }),
  }),
});

// ============================================================
// 5. REFRESH TOKEN
// ============================================================

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z
      .string({
        required_error: "Refresh token is required",
      })
      .trim()
      .min(1, {
        message: "Refresh token cannot be empty",
      }),
  }),
});