import { z } from "zod";

export const recordMovementSchema = z.object({
  body: z.object({
    productId: z.string({ required_error: "productId is required" }).uuid("Invalid product ID format"),
    qtyChange: z.number({ required_error: "qtyChange is required" }),
    type: z.enum(["IN", "OUT", "ADJUST"], { required_error: "type must be IN, OUT, or ADJUST" }),
    referenceId: z.string().uuid("Invalid reference ID format").optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  }),
});

export const stockInSchema = z.object({
  body: z.object({
    productId: z.string({ required_error: "productId is required" }).uuid("Invalid product ID format"),
    quantity: z.number({ required_error: "quantity is required" }).positive("Quantity must be positive"),
    referenceId: z.string().uuid("Invalid reference ID format").optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  }),
});

export const stockOutSchema = z.object({
  body: z.object({
    productId: z.string({ required_error: "productId is required" }).uuid("Invalid product ID format"),
    quantity: z.number({ required_error: "quantity is required" }).positive("Quantity must be positive"),
    referenceId: z.string().uuid("Invalid reference ID format").optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  }),
});

export const adjustStockSchema = z.object({
  body: z.object({
    productId: z.string({ required_error: "productId is required" }).uuid("Invalid product ID format"),
    newStock: z.number({ required_error: "newStock is required" }).nonnegative("Stock level cannot be negative"),
    notes: z.string().max(500).optional().nullable(),
  }),
});
