import { z } from "zod";

export const checkoutSchema = z.object({
  body: z.object({
    customerName: z.string().trim().optional(),
    customerPhone: z.string().trim().optional().nullable(),
    items: z
      .array(
        z.object({
          productId: z.string({ required_error: "productId is required" }).uuid("Invalid product ID format"),
          quantity: z.number({ required_error: "quantity is required" }).positive("Quantity must be positive"),
        })
      )
      .min(1, "Invoice must contain at least one item"),
    paymentMode: z
      .enum(["CASH", "UPI", "CREDIT", "CARD"], { required_error: "paymentMode must be CASH, UPI, CREDIT, or CARD" })
      .default("CASH"),
  }),
});
